/**
 * Core responsibility: resolve the GitHub repository a session works in, from
 * the session's working directory and that checkout's Git remotes.
 * Contracts: `cwd` must be an absolute existing directory; the returned repo is
 * `{ host, owner, name }` with GitHub's own casing as reported by the remote URL.
 * Constraints: read-only Git calls only, no network, bounded execution; a
 * directory that is not a Git checkout is reported as a classified failure
 * instead of throwing.
 */
import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { isAbsolute } from 'node:path'

/** Upper bound for a local Git read; a hung git must not stall the panel. */
const GIT_TIMEOUT_MS = 10_000

/**
 * Parse a Git remote URL into its GitHub coordinates.
 * @param {string} remote - `origin` URL as Git prints it.
 * @returns {{ host: string, owner: string, name: string } | null} coordinates, or null when the URL is not a GitHub remote.
 */
export function parseRemote(remote) {
  const value = String(remote || '').trim()
  if (!value) return null
  // scp-like syntax: git@host:owner/name.git
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(value)
  if (scp) return { host: scp[1].toLowerCase(), owner: scp[2], name: scp[3] }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'ssh:' && url.protocol !== 'git:') {
      return null
    }
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
    if (segments.length < 2) return null
    const name = segments[segments.length - 1].replace(/\.git$/i, '')
    const owner = segments[segments.length - 2]
    if (!owner || !name) return null
    return { host: url.hostname.toLowerCase(), owner, name }
  } catch {
    return null
  }
}

/**
 * Run one bounded Git command inside a directory.
 * @param {string} cwd - checkout directory.
 * @param {string[]} args - Git arguments.
 * @returns {Promise<string | null>} trimmed stdout, or null on failure.
 */
function git(cwd, args) {
  return new Promise((resolve) => {
    execFile('git', ['-C', cwd, ...args], { timeout: GIT_TIMEOUT_MS, windowsHide: true, encoding: 'utf8' }, (error, stdout) => {
      resolve(error ? null : String(stdout || '').trim())
    })
  })
}

/**
 * Resolve the repository of one working directory.
 * @param {unknown} rawCwd - caller-supplied directory, validated here.
 * @returns {Promise<{ ok: true, repo: { host: string, owner: string, name: string, cwd: string } }
 *   | { ok: false, reason: string, message: string }>} the repository, or a reason the panel can show.
 */
export async function repoFromCwd(rawCwd) {
  if (typeof rawCwd !== 'string' || rawCwd.trim() === '' || !isAbsolute(rawCwd)) {
    return { ok: false, reason: 'invalid-cwd', message: 'No working directory was supplied for this session.' }
  }
  const cwd = rawCwd.trim()
  let stats
  try {
    stats = statSync(cwd)
  } catch {
    return { ok: false, reason: 'missing-cwd', message: 'The session working directory no longer exists.' }
  }
  if (!stats.isDirectory()) {
    return { ok: false, reason: 'invalid-cwd', message: 'The session working directory is not a directory.' }
  }
  const remotes = []
  const origin = await git(cwd, ['remote', 'get-url', 'origin'])
  if (origin) remotes.push(origin)
  if (remotes.length === 0) {
    const listed = await git(cwd, ['remote', '-v'])
    if (listed) {
      for (const line of listed.split('\n')) {
        const match = /^(\S+)\s+(\S+)\s+\(fetch\)$/.exec(line.trim())
        if (match) remotes.push(match[2])
      }
    }
  }
  if (remotes.length === 0) {
    return { ok: false, reason: 'no-remote', message: 'This checkout has no Git remote, so there is no GitHub repository to show.' }
  }
  for (const remote of remotes) {
    const parsed = parseRemote(remote)
    if (parsed) {
      if (parsed.host !== 'github.com') {
        return { ok: false, reason: 'not-github', message: `Only github.com remotes are supported; this checkout points at ${parsed.host}.` }
      }
      return { ok: true, repo: { host: parsed.host, owner: parsed.owner, name: parsed.name, cwd } }
    }
  }
  return { ok: false, reason: 'not-github', message: 'The Git remote of this checkout is not a GitHub URL.' }
}
