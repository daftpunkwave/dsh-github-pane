/**
 * Core responsibility: run the local GitHub CLI (`gh`) and classify its
 * failures into codes the panel can explain to the user.
 * Contracts: callers pass an argument array (never a shell string) and receive
 * `{ ok, stdout, stderr, code }`; failures also carry a stable `reason`.
 * Constraints: bounded execution time, no shell interpolation, no retries that
 * could duplicate side effects — every call in this plugin is a read.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Largest stdout accepted from one `gh` call. GraphQL payloads stay far below it. */
const MAX_BUFFER_BYTES = 16 * 1024 * 1024

/** Default execution bound; a slow GitHub API call should fail, not hang the panel. */
const DEFAULT_TIMEOUT_MS = 45_000

/** The CLI binary name; Windows resolves `gh.exe` through PATHEXT. */
const GH_BIN = 'gh'

/**
 * Describe a failed `gh` run in terms of what the user can fix.
 * @param {{ code: number | string | undefined, stderr: string, timedOut?: boolean }} result - failed run.
 * @returns {{ reason: string, message: string }} stable reason code plus a readable message.
 */
export function describeGhFailure(result) {
  const stderr = (result.stderr || '').trim()
  if (result.code === 'ENOENT') {
    return { reason: 'gh-missing', message: 'GitHub CLI (gh) is not installed or not on PATH.' }
  }
  if (result.timedOut) {
    return { reason: 'timeout', message: 'GitHub CLI did not answer in time.' }
  }
  if (/not logged into any GitHub hosts|authentication required|gh auth login/i.test(stderr)) {
    return { reason: 'gh-unauthenticated', message: 'GitHub CLI is not logged in. Run `gh auth login` on the host.' }
  }
  if (/rate limit|API rate limit exceeded|secondary rate limit/i.test(stderr)) {
    return { reason: 'rate-limited', message: 'GitHub rate limit reached. Try again in a few minutes.' }
  }
  if (/could not resolve to a Repository|not found|HTTP 404/i.test(stderr)) {
    return { reason: 'not-found', message: 'The repository or item was not found, or your token cannot read it.' }
  }
  return { reason: 'failed', message: stderr.split('\n')[0] || 'GitHub CLI failed without a message.' }
}

/**
 * Run `gh` with an argument array.
 * @param {string[]} args - arguments (no shell expansion).
 * @param {{ timeoutMs?: number }} [options] - execution bounds.
 * @returns {Promise<{ ok: boolean, stdout: string, stderr: string, code?: number | string, reason?: string, message?: string, timedOut?: boolean }>}
 *   the settled run; `reason`/`message` are present on failure.
 */
export function gh(args, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return new Promise((resolve) => {
    execFile(
      GH_BIN,
      args,
      { timeout: timeoutMs, maxBuffer: MAX_BUFFER_BYTES, windowsHide: true, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ ok: true, stdout: String(stdout || ''), stderr: String(stderr || '') })
          return
        }
        const timedOut = error.killed === true || error.code === 'ETIMEDOUT'
        const failure = describeGhFailure({ code: error.code, stderr: String(stderr || error.message || ''), timedOut })
        resolve({ ok: false, stdout: String(stdout || ''), stderr: String(stderr || ''), timedOut, ...failure })
      },
    )
  })
}

/**
 * Run one GraphQL query through `gh api graphql`.
 * @param {string} query - GraphQL document.
 * @param {Record<string, string | number | null | undefined>} variables - scalar variables.
 * @returns {Promise<{ ok: true, data: any } | { ok: false, reason: string, message: string }>}
 *   the parsed `data` payload, or a classified failure.
 */
export async function ghGraphql(query, variables) {
  const args = ['api', 'graphql', '-f', `query=${query}`]
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null) continue
    const text = String(value)
    args.push(typeof value === 'number' ? '-F' : '-f', `${key}=${text}`)
  }
  const result = await gh(args)
  if (!result.ok) return { ok: false, reason: result.reason || 'failed', message: result.message || 'GitHub CLI failed.' }
  try {
    const parsed = JSON.parse(result.stdout)
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      return { ok: false, reason: 'graphql', message: String(parsed.errors[0].message || 'GitHub GraphQL rejected the query.') }
    }
    return { ok: true, data: parsed.data }
  } catch {
    return { ok: false, reason: 'bad-json', message: 'GitHub CLI returned an unreadable response.' }
  }
}

/**
 * Run one REST call through `gh api` and parse its JSON body.
 * @param {string} endpoint - REST path such as `repos/owner/name`.
 * @param {string[]} [extraArgs] - additional `gh api` flags.
 * @returns {Promise<{ ok: true, data: any } | { ok: false, reason: string, message: string }>}
 *   the parsed payload, or a classified failure.
 */
export async function ghApi(endpoint, extraArgs = []) {
  const result = await gh(['api', endpoint, ...extraArgs])
  if (!result.ok) return { ok: false, reason: result.reason || 'failed', message: result.message || 'GitHub CLI failed.' }
  try {
    return { ok: true, data: JSON.parse(result.stdout) }
  } catch {
    return { ok: false, reason: 'bad-json', message: 'GitHub CLI returned an unreadable response.' }
  }
}

/**
 * Run one state-changing REST call through `gh api` with a JSON body.
 * The body travels through a private temporary file so no shell or argv limit
 * applies; the file is removed before the promise settles.
 * @param {string} endpoint - REST path such as `repos/owner/name/pulls/1/reviews`.
 * @param {'POST' | 'PATCH' | 'DELETE'} method - HTTP method.
 * @param {unknown} [body] - JSON-serializable request body.
 * @returns {Promise<{ ok: true, data: any } | { ok: false, reason: string, message: string }>}
 *   the parsed response payload, or a classified failure.
 */
export async function ghApiWrite(endpoint, method, body) {
  let directory = ''
  try {
    directory = await mkdtemp(join(tmpdir(), 'dsh-github-panel-'))
    const file = join(directory, 'body.json')
    await writeFile(file, JSON.stringify(body === undefined ? {} : body), 'utf8')
    const result = await gh(['api', endpoint, '--method', method, '--input', file, '-H', 'Accept: application/vnd.github+json'])
    if (!result.ok) {
      return { ok: false, reason: result.reason || 'failed', message: result.message || 'GitHub CLI failed.' }
    }
    try {
      return { ok: true, data: JSON.parse(result.stdout) }
    } catch {
      return { ok: true, data: null }
    }
  } catch (error) {
    return { ok: false, reason: 'failed', message: error instanceof Error ? error.message : String(error) }
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {})
  }
}
