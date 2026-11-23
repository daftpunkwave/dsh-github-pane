/**
 * Core responsibility: declare the HTTP routes the Web page calls and translate
 * each request into one repository lookup or GitHub read.
 * Contracts: every route is authorized through the host `connection` trust
 * check before it runs; every answer is JSON with `{ ok: true, ... }` or
 * `{ ok: false, reason, error }`, and unexpected throws become a 500 with the
 * same shape so the panel never receives an HTML error page. A `fresh=1` query
 * bypasses the read cache.
 * Constraints: reads are GET only; the sole POST route submits a pull request
 * review the page explicitly confirmed. No other state mutation, and no GitHub
 * call without a validated `owner/name` pair and a known item kind.
 */
import { json, queryParam, readJsonBody, rejectNonGet } from './http.js'
import { repoFromCwd } from './repo.js'
import {
  getDiscussion,
  getIssue,
  getPullRequest,
  getPullRequestFiles,
  listDiscussions,
  listIssues,
  listPullRequests,
  parseRepo,
  resolveViewer,
  submitReview,
} from './github.js'

/** Item families the panel may request. */
const KINDS = new Set(['pr', 'issue', 'discussion'])

/** List state filters accepted by GitHub-backed lists. */
const STATES = new Set(['open', 'closed', 'all'])

/** Maximum list size served to the page. */
const LIST_LIMIT = 40

/** Largest review submission body accepted (GitHub allows 65536 bytes). */
const REVIEW_BODY_LIMIT = 64 * 1024

/**
 * Answer an unexpected failure without leaking a stack trace to the page.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @param {unknown} error - thrown value.
 * @returns {void}
 */
function fail(res, error) {
  json(res, 500, { ok: false, reason: 'internal', error: error instanceof Error ? error.message : String(error) })
}

/**
 * Answer a request the host trust check refused.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @param {401 | 403} rejection - status the host chose.
 * @returns {void}
 */
function unauthorized(res, rejection) {
  json(res, rejection, { ok: false, reason: 'unauthorized', error: 'This request did not come from an authorized DSH page.' })
}

/**
 * Validate the `number` query parameter.
 * @param {string} value - raw query value.
 * @returns {number | null} a positive integer, or null.
 */
function readNumber(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number < 1_000_000_000 ? number : null
}

/**
 * Whether the caller asked to bypass the read cache.
 * @param {import('node:http').IncomingMessage} req - the incoming request.
 * @returns {boolean} true for `?fresh=1`.
 */
function readFresh(req) {
  return queryParam(req, 'fresh') === '1'
}

/**
 * Resolve the GitHub repository behind a session's working directory.
 * @param {import('node:http').IncomingMessage} req - request carrying `?cwd=`.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @returns {Promise<void>} settles after the response is written.
 */
async function handleRepo(req, res) {
  try {
    const result = await repoFromCwd(queryParam(req, 'cwd'))
    if (!result.ok) {
      json(res, 200, { ok: false, reason: result.reason, error: result.message })
      return
    }
    const viewer = await resolveViewer()
    json(res, 200, { ok: true, repo: result.repo, viewer: viewer.ok ? viewer.login : null })
  } catch (error) {
    fail(res, error)
  }
}

/**
 * List one item family of a repository.
 * @param {import('node:http').IncomingMessage} req - request carrying `?repo=&kind=&state=&fresh=`.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @returns {Promise<void>} settles after the response is written.
 */
async function handleList(req, res) {
  try {
    const parsed = parseRepo(queryParam(req, 'repo'))
    const kind = queryParam(req, 'kind')
    const stateParam = queryParam(req, 'state')
    const state = STATES.has(stateParam) ? stateParam : 'open'
    if (!parsed) {
      json(res, 200, { ok: false, reason: 'invalid-repo', error: 'Invalid repository.' })
      return
    }
    if (!KINDS.has(kind)) {
      json(res, 200, { ok: false, reason: 'invalid-kind', error: 'Unknown item kind.' })
      return
    }
    const repo = parsed.owner + '/' + parsed.name
    const fresh = readFresh(req)
    let result
    if (kind === 'pr') result = await listPullRequests(repo, { state, limit: LIST_LIMIT, fresh })
    else if (kind === 'issue') result = await listIssues(repo, { state, limit: LIST_LIMIT, fresh })
    else result = await listDiscussions(repo, { limit: LIST_LIMIT, fresh })
    if (!result.ok) {
      json(res, 200, { ok: false, reason: result.reason, error: result.message })
      return
    }
    json(res, 200, { ok: true, kind, repo, items: result.items, viewer: result.viewer, fetchedAt: new Date().toISOString() })
  } catch (error) {
    fail(res, error)
  }
}

/**
 * Read one item detail of a repository.
 * @param {import('node:http').IncomingMessage} req - request carrying `?repo=&kind=&number=&fresh=`.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @returns {Promise<void>} settles after the response is written.
 */
async function handleDetail(req, res) {
  try {
    const parsed = parseRepo(queryParam(req, 'repo'))
    const kind = queryParam(req, 'kind')
    const number = readNumber(queryParam(req, 'number'))
    if (!parsed) {
      json(res, 200, { ok: false, reason: 'invalid-repo', error: 'Invalid repository.' })
      return
    }
    if (!KINDS.has(kind) || !number) {
      json(res, 200, { ok: false, reason: 'invalid-item', error: 'Invalid item kind or number.' })
      return
    }
    const repo = parsed.owner + '/' + parsed.name
    const options = { fresh: readFresh(req) }
    let result
    if (kind === 'pr') result = await getPullRequest(repo, number, options)
    else if (kind === 'issue') result = await getIssue(repo, number, options)
    else result = await getDiscussion(repo, number, options)
    if (!result.ok) {
      json(res, 200, { ok: false, reason: result.reason, error: result.message })
      return
    }
    json(res, 200, { ok: true, kind, repo, item: result.item, viewer: result.viewer, fetchedAt: new Date().toISOString() })
  } catch (error) {
    fail(res, error)
  }
}

/**
 * Read the changed files and unified-diff patches of one pull request.
 * Issues and discussions have no file diff, so only `kind=pr` reaches GitHub.
 * @param {import('node:http').IncomingMessage} req - request carrying `?repo=&kind=pr&number=&fresh=`.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @returns {Promise<void>} settles after the response is written.
 */
async function handleDiff(req, res) {
  try {
    const parsed = parseRepo(queryParam(req, 'repo'))
    if (!parsed) {
      json(res, 200, { ok: false, reason: 'invalid-repo', error: 'Invalid repository.' })
      return
    }
    if (queryParam(req, 'kind') !== 'pr') {
      json(res, 200, { ok: false, reason: 'invalid-kind', error: 'Only pull requests have file diffs.' })
      return
    }
    const number = readNumber(queryParam(req, 'number'))
    if (!number) {
      json(res, 200, { ok: false, reason: 'invalid-number', error: 'Invalid pull request number.' })
      return
    }
    const repo = parsed.owner + '/' + parsed.name
    const result = await getPullRequestFiles(repo, number, { fresh: readFresh(req) })
    if (!result.ok) {
      json(res, 200, { ok: false, reason: result.reason, error: result.message })
      return
    }
    json(res, 200, {
      ok: true,
      kind: 'pr',
      repo,
      files: result.files,
      total: result.total,
      truncated: result.truncated,
      viewer: result.viewer,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    fail(res, error)
  }
}

/**
 * Submit one pull request review. The page shows an explicit confirmation step
 * before calling this route; the body carries the review event and comment.
 * @param {import('node:http').IncomingMessage} req - POST request with a JSON body.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @returns {Promise<void>} settles after the response is written.
 */
async function handleReview(req, res) {
  try {
    const body = await readJsonBody(req, REVIEW_BODY_LIMIT)
    if (!body || typeof body !== 'object') {
      json(res, 400, { ok: false, reason: 'invalid-body', error: 'Expected a JSON review body.' })
      return
    }
    const parsed = parseRepo(typeof body.repo === 'string' ? body.repo : '')
    const number = readNumber(body.number)
    if (!parsed) {
      json(res, 400, { ok: false, reason: 'invalid-repo', error: 'Invalid repository.' })
      return
    }
    if (!number) {
      json(res, 400, { ok: false, reason: 'invalid-number', error: 'Invalid pull request number.' })
      return
    }
    const repo = parsed.owner + '/' + parsed.name
    const result = await submitReview(repo, number, {
      event: typeof body.event === 'string' ? body.event : '',
      body: typeof body.body === 'string' ? body.body : '',
    })
    if (!result.ok) {
      json(res, 200, { ok: false, reason: result.reason, error: result.message })
      return
    }
    json(res, 200, { ok: true, repo, number, review: result.review, fetchedAt: new Date().toISOString() })
  } catch (error) {
    fail(res, error)
  }
}

/**
 * Mount the plugin's routes on the host Web server.
 * @param {{ register: (route: { kind: 'exact', path: string, handler: Function }) => () => void }} webServer - host route registry.
 * @param {(req: import('node:http').IncomingMessage) => 401 | 403 | undefined} requestRejection - host trust check.
 * @returns {Array<() => void>} route disposers, one per registration.
 */
export function createRoutes(webServer, requestRejection) {
  const route = (path, handler, method = 'GET') =>
    webServer.register({
      kind: 'exact',
      path,
      handler: (req, res) => {
        const rejection = requestRejection(req)
        if (rejection !== undefined) {
          unauthorized(res, rejection)
          return
        }
        if (method === 'GET') {
          if (rejectNonGet(req, res)) return
        } else if (req.method !== method) {
          json(res, 405, { ok: false, error: 'method-not-allowed' })
          return
        }
        return handler(req, res)
      },
    })
  return [
    route('/api/github-panel/repo', handleRepo),
    route('/api/github-panel/list', handleList),
    route('/api/github-panel/detail', handleDetail),
    route('/api/github-panel/diff', handleDiff),
    route('/api/github-panel/review', handleReview, 'POST'),
  ]
}
