/**
 * Core responsibility: read pull requests, issues, and discussions of one GitHub
 * repository through the local `gh` CLI and normalize the GraphQL responses into
 * the flat shapes the workbench renders.
 * Contracts: every exported read resolves to `{ ok: true, ... }` or
 * `{ ok: false, reason, message }` and never rejects; `repo` arguments use the
 * `owner/name` form validated by `parseRepo`; successful reads are cached for
 * 30s (the viewer login for 10 minutes) and identical concurrent reads share one
 * request, while failures are never cached. A `fresh` option on a read bypasses
 * the cached value and republishes its result.
 * Constraints: GraphQL/REST reads through `host/gh.js`; the only write is a pull
 * request review submission (a confirmed user action), no timers or background
 * refresh, and only validated integers/enums or GraphQL variables are
 * interpolated into a query document.
 */
import { ghApi, ghApiWrite, ghGraphql } from './gh.js'
import { createTtlCache, dedupe } from './cache.js'

/** Lifetime of cached list/detail reads. */
const DATA_TTL_MS = 30_000

/** Lifetime of the resolved viewer login; the signed-in account changes rarely. */
const VIEWER_TTL_MS = 10 * 60 * 1000

/** Entries retained by the read cache before the oldest write is evicted. */
const DATA_MAX_ENTRIES = 120

/** Page size used when a caller does not pass one. */
const DEFAULT_LIMIT = 40

/** Largest page size accepted; matches GitHub's per-connection guidance. */
const MAX_LIMIT = 100

/** GraphQL enum lists per caller-facing state filter. `closed` includes merged PRs. */
const PULL_REQUEST_STATES = {
  open: ['OPEN'],
  closed: ['CLOSED', 'MERGED'],
  all: ['OPEN', 'CLOSED', 'MERGED'],
}

/** Review events accepted by the review submission write. */
const REVIEW_EVENTS = new Set(['APPROVE', 'REQUEST_CHANGES', 'COMMENT'])

/** GraphQL enum lists per caller-facing state filter for issues (no merged state). */
const ISSUE_STATES = {
  open: ['OPEN'],
  closed: ['CLOSED'],
  all: ['OPEN', 'CLOSED'],
}

/** `owner/name` shape accepted from the caller. */
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

/** Bound on the whole `owner/name` string before the pattern is applied. */
const MAX_REPO_LENGTH = 200

/** Labels shown on list cards. */
const LIST_LABELS_LIMIT = 8

/** Bounds for the detail payloads; every detail connection stays finite. */
const DETAIL_LABELS_LIMIT = 20
const DETAIL_ASSIGNEES_LIMIT = 10
const DETAIL_REVIEWS_LIMIT = 50
const DETAIL_REVIEW_REQUESTS_LIMIT = 20
const DETAIL_COMMENTS_LIMIT = 50
const DETAIL_COMMITS_LIMIT = 20
const DETAIL_CHECKS_LIMIT = 50
const DETAIL_FILES_LIMIT = 100
const DETAIL_REVIEW_THREADS_LIMIT = 50
const DETAIL_REVIEW_THREAD_COMMENTS_LIMIT = 10

/** Largest changed-file list the diff read hands to the panel. */
const DIFF_FILES_LIMIT = 100

/** File states reported by the pull request files REST endpoint. */
const DIFF_FILE_STATUSES = new Set(['added', 'modified', 'removed', 'renamed', 'copied', 'changed', 'unchanged'])

/** Read cache for lists and details (keyed by repo, kind, state, page or number). */
const dataCache = createTtlCache({ ttlMs: DATA_TTL_MS, maxEntries: DATA_MAX_ENTRIES })

/** Viewer login cache: one key, long TTL. */
const viewerCache = createTtlCache({ ttlMs: VIEWER_TTL_MS, maxEntries: 1 })

// ---------------------------------------------------------------- shared helpers

/**
 * Build the failure shape shared by every exported read.
 * @param {string} reason - stable code the panel maps to an explanation.
 * @param {string} message - readable text shown to the user.
 * @returns {{ ok: false, reason: string, message: string }} the failure.
 */
function fail(reason, message) {
  return { ok: false, reason, message }
}

/**
 * Failure for a repository argument that is not `owner/name`.
 * @returns {{ ok: false, reason: string, message: string }} the failure.
 */
function invalidRepoFailure() {
  return fail('invalid-repo', 'Repository must be provided as "owner/name" using letters, digits, "_", ".", or "-".')
}

/**
 * Failure for a valid-looking repository that GitHub cannot resolve.
 * @param {{ owner: string, name: string }} parsed - validated repository parts.
 * @returns {{ ok: false, reason: string, message: string }} the failure.
 */
function repositoryNotFound(parsed) {
  return fail(
    'not-found',
    `Repository ${parsed.owner}/${parsed.name} was not found or is not readable by the signed-in GitHub account.`,
  )
}

/**
 * Failure for repositories that do not have Discussions enabled.
 * @returns {{ ok: false, reason: string, message: string }} the failure.
 */
function discussionsUnavailable() {
  return fail('discussions-unavailable', 'Discussions are not enabled for this repository.')
}

/**
 * Translate a failed `ghGraphql` result into the read failure shape, mapping the
 * GraphQL not-found and discussions-disabled messages onto stable reasons.
 * @param {{ reason?: string, message?: string }} result - failed GraphQL read.
 * @returns {{ ok: false, reason: string, message: string }} the failure.
 */
function failureFromGraphql(result) {
  const message = result.message || 'GitHub GraphQL request failed.'
  if (/could not resolve to (?:a |an )?(?:repository|pull ?request|issue|discussion)\b/i.test(message)) {
    return fail('not-found', message)
  }
  if (/discussions? (?:are|is) not (?:enabled|available)|has discussions (?:been )?disabled/i.test(message)) {
    return discussionsUnavailable()
  }
  return fail(result.reason || 'failed', message)
}

/**
 * Validate and split a repository identifier.
 * @param {unknown} repo - caller-supplied `owner/name`.
 * @returns {{ owner: string, name: string } | null} the two parts, or null when the value is not a valid identifier.
 */
export function parseRepo(repo) {
  if (typeof repo !== 'string') return null
  const value = repo.trim()
  if (value.length === 0 || value.length > MAX_REPO_LENGTH || !REPO_PATTERN.test(value)) return null
  const slash = value.indexOf('/')
  return { owner: value.slice(0, slash), name: value.slice(slash + 1) }
}

/**
 * Normalize a caller-facing state filter.
 * @param {unknown} raw - requested state.
 * @returns {'open' | 'closed' | 'all'} a known state; unknown values fall back to `open`.
 */
function normalizeState(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return value === 'open' || value === 'closed' || value === 'all' ? value : 'open'
}

/**
 * Normalize a caller-facing page size.
 * @param {unknown} raw - requested limit.
 * @returns {number} an integer between 1 and {@link MAX_LIMIT}; unusable values fall back to the default.
 */
function normalizeLimit(raw) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(Math.trunc(parsed), MAX_LIMIT)
}

/**
 * Normalize a pull request or issue number.
 * @param {unknown} raw - candidate number.
 * @returns {number | null} a positive integer, or null when the value is not one.
 */
function normalizeNumber(raw) {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Read the repository object out of a GraphQL response.
 * @param {any} data - `data` payload of a GraphQL response.
 * @returns {any | null} the repository, or null when GitHub could not resolve it.
 */
function repositoryOf(data) {
  return data && data.repository ? data.repository : null
}

/**
 * Read the nodes of a GraphQL connection defensively.
 * @param {any} connection - GraphQL connection.
 * @returns {any[]} its nodes (empty when absent).
 */
function nodesOf(connection) {
  return connection && Array.isArray(connection.nodes) ? connection.nodes : []
}

/**
 * Read the authenticated login carried by a GraphQL response.
 * @param {any} data - `data` payload of a GraphQL response.
 * @returns {string | null} the login, or null when GitHub did not return it.
 */
function viewerLogin(data) {
  const viewer = data && data.viewer
  return viewer && typeof viewer.login === 'string' && viewer.login ? viewer.login : null
}

/**
 * Normalize an actor (author, assignee, reviewer) to `{ login, avatarUrl }`.
 * A deleted account has no author object and yields empty strings.
 * @param {any} actor - GraphQL actor.
 * @returns {{ login: string, avatarUrl: string }} the normalized actor.
 */
function toAuthor(actor) {
  const login = actor && typeof actor.login === 'string' ? actor.login : ''
  return {
    login,
    avatarUrl: actor && typeof actor.avatarUrl === 'string' ? actor.avatarUrl : '',
    isBot: Boolean(actor && (actor.__typename === 'Bot' || /\[bot\]$/i.test(login))),
  }
}

/**
 * Read a connection's `totalCount`.
 * @param {any} connection - GraphQL connection exposing `totalCount`.
 * @returns {number} the count, or 0 when absent.
 */
function countOf(connection) {
  return connection && typeof connection.totalCount === 'number' ? connection.totalCount : 0
}

/**
 * Normalize one non-negative number field.
 * @param {unknown} value - GraphQL scalar.
 * @returns {number} the number, or 0 when it is not finite.
 */
function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Normalize one GraphQL DateTime scalar to the ISO string the panel renders.
 * @param {unknown} value - GraphQL DateTime scalar.
 * @returns {string | null} the timestamp, or null when absent.
 */
function isoOrNull(value) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Normalize one GitHub-rendered HTML field (`bodyHTML`). The panel renders this
 * string instead of parsing markdown, so it lands in the payload as-is.
 * @param {unknown} value - GraphQL HTML scalar.
 * @returns {string} the HTML, or an empty string when absent.
 */
function htmlOrEmpty(value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Convert one DateTime scalar to epoch milliseconds.
 * @param {unknown} value - candidate timestamp.
 * @returns {number | null} epoch milliseconds, or null when the value is not a parseable date.
 */
function epochMs(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Measure the elapsed time between two check timestamps.
 * A missing or unparseable bound, and an end that precedes its start, are not a
 * usable measurement and yield null.
 * @param {unknown} start - start timestamp (check run `startedAt` or status `createdAt`).
 * @param {unknown} end - end timestamp (check run `completedAt`; status contexts expose none).
 * @returns {number | null} duration in milliseconds, or null when not measurable.
 */
function durationBetween(start, end) {
  const from = epochMs(start)
  const to = epochMs(end)
  if (from === null || to === null || to < from) return null
  return to - from
}

/**
 * Normalize a labels connection.
 * @param {any} connection - GraphQL label connection.
 * @returns {Array<{ name: string, color: string }>} labels in API order.
 */
function toLabels(connection) {
  return nodesOf(connection).filter(Boolean).map((label) => ({
    name: typeof label.name === 'string' ? label.name : '',
    color: typeof label.color === 'string' ? label.color : '',
  }))
}

/**
 * Normalize a discussion category.
 * @param {any} category - GraphQL DiscussionCategory.
 * @returns {{ name: string, emoji: string } | null} the category, or null when absent.
 */
function toCategory(category) {
  if (!category || typeof category.name !== 'string') return null
  return { name: category.name, emoji: typeof category.emoji === 'string' ? category.emoji : '' }
}

/**
 * Normalize an assignees connection.
 * @param {any} connection - GraphQL assignee connection.
 * @returns {Array<{ login: string, avatarUrl: string }>} assignees in API order.
 */
function toAssignees(connection) {
  return nodesOf(connection).filter(Boolean).map((assignee) => toAuthor(assignee))
}

/**
 * Collapse a reviews connection into one latest-state entry per reviewer.
 * @param {any} connection - GraphQL review connection.
 * @returns {Array<{ login: string, avatarUrl: string, state: string | null }>} reviewers in first-seen order.
 */
function toReviewers(connection) {
  const latestByLogin = new Map()
  for (const review of nodesOf(connection)) {
    if (!review || !review.author || typeof review.author.login !== 'string' || !review.author.login) continue
    const submitted = typeof review.submittedAt === 'string' ? Date.parse(review.submittedAt) : Number.NaN
    const at = Number.isFinite(submitted) ? submitted : 0
    const current = latestByLogin.get(review.author.login)
    if (current && current.at > at) continue
    latestByLogin.set(review.author.login, {
      login: review.author.login,
      avatarUrl: typeof review.author.avatarUrl === 'string' ? review.author.avatarUrl : '',
      state: review.state ?? null,
      at,
    })
  }
  return Array.from(latestByLogin.values(), (reviewer) => ({
    login: reviewer.login,
    avatarUrl: reviewer.avatarUrl,
    state: reviewer.state,
  }))
}

/**
 * Normalize pending review requests, keeping user reviewers only; team requests
 * are skipped so the list keeps a single `{ login, avatarUrl }` shape.
 * @param {any} connection - GraphQL review request connection.
 * @returns {Array<{ login: string, avatarUrl: string }>} requested users.
 */
function toReviewRequests(connection) {
  const requests = []
  for (const request of nodesOf(connection)) {
    const reviewer = request && request.requestedReviewer
    if (!reviewer || reviewer.__typename !== 'User' || typeof reviewer.login !== 'string' || !reviewer.login) continue
    requests.push({ login: reviewer.login, avatarUrl: typeof reviewer.avatarUrl === 'string' ? reviewer.avatarUrl : '' })
  }
  return requests
}

/**
 * Normalize issue comments.
 * @param {any} connection - GraphQL issue comment connection.
 * @returns {Array<{ author: { login: string, avatarUrl: string }, body: string, createdAt: string | null }>} comments in API order.
 */
function toComments(connection) {
  return nodesOf(connection).filter(Boolean).map((comment) => ({
    author: toAuthor(comment.author),
    body: typeof comment.body === 'string' ? comment.body : '',
    bodyHtml: htmlOrEmpty(comment.bodyHTML),
    url: typeof comment.url === 'string' ? comment.url : '',
    createdAt: comment.createdAt ?? null,
  }))
}

/**
 * Normalize the inline review threads of a pull request. GitHub leaves `line`
 * null on an outdated thread and may leave `path` null as well, so both are
 * carried through defensively.
 * @param {any} connection - GraphQL pull request review thread connection.
 * @returns {Array<{ id: string, isResolved: boolean, path: string | null, line: number | null,
 *   comments: Array<{ author: { login: string, avatarUrl: string } | null, body: string, createdAt: string | null }> }>}
 *   threads in API order.
 */
function toReviewThreads(connection) {
  const threads = []
  for (const thread of nodesOf(connection)) {
    if (!thread) continue
    threads.push({
      id: typeof thread.id === 'string' ? thread.id : '',
      isResolved: thread.isResolved === true,
      path: typeof thread.path === 'string' ? thread.path : null,
      line: Number.isInteger(thread.line) ? thread.line : null,
      startLine: Number.isInteger(thread.startLine) ? thread.startLine : null,
      originalLine: Number.isInteger(thread.originalLine) ? thread.originalLine : null,
      originalStartLine: Number.isInteger(thread.originalStartLine) ? thread.originalStartLine : null,
      comments: nodesOf(thread.comments).filter(Boolean).map((comment) => ({
        author: comment.author ? toAuthor(comment.author) : null,
        body: typeof comment.body === 'string' ? comment.body : '',
        bodyHtml: htmlOrEmpty(comment.bodyHTML),
        url: typeof comment.url === 'string' ? comment.url : '',
        createdAt: comment.createdAt ?? null,
      })),
    })
  }
  return threads
}

/**
 * Normalize review submissions for the detail timeline.
 * @param {any} connection - GraphQL review connection.
 * @returns {Array<{ author: { login: string, avatarUrl: string }, state: string | null, body: string, submittedAt: string | null }>} reviews in API order.
 */
function toReviewNodes(connection) {
  return nodesOf(connection).filter(Boolean).map((review) => ({
    author: toAuthor(review.author),
    state: review.state ?? null,
    body: typeof review.body === 'string' ? review.body : '',
    bodyHtml: htmlOrEmpty(review.bodyHTML),
    url: typeof review.url === 'string' ? review.url : '',
    submittedAt: review.submittedAt ?? null,
  }))
}

/**
 * Normalize a commit connection to the newest-first list the panel shows.
 * @param {any} connection - GraphQL commit connection.
 * @returns {Array<{ oid: string, messageHeadline: string, committedDate: string | null }>} commits, newest first.
 */
function toCommits(connection) {
  const commits = []
  for (const node of nodesOf(connection)) {
    const commit = node && node.commit
    if (!commit) continue
    commits.push({
      oid: typeof commit.oid === 'string' ? commit.oid : '',
      messageHeadline: typeof commit.messageHeadline === 'string' ? commit.messageHeadline : '',
      committedDate: commit.committedDate ?? null,
      url: typeof commit.url === 'string' ? commit.url : '',
    })
  }
  return commits.reverse()
}

/**
 * Normalize a changed-files connection.
 * @param {any} connection - GraphQL pull request file connection.
 * @returns {Array<{ path: string, additions: number, deletions: number }>} files in API order.
 */
function toFiles(connection) {
  const files = []
  for (const file of nodesOf(connection)) {
    if (!file || typeof file.path !== 'string') continue
    files.push({ path: file.path, additions: numberOrZero(file.additions), deletions: numberOrZero(file.deletions) })
  }
  return files
}

/**
 * Flatten the pages `gh api --paginate --slurp` emits as an array of arrays; a
 * plain array (an unslurped response) is accepted as one page.
 * @param {any} data - parsed REST payload.
 * @returns {any[] | null} the flattened entries, or null when the payload is not an array.
 */
function flattenRestPages(data) {
  if (!Array.isArray(data)) return null
  const entries = []
  for (const page of data) {
    if (Array.isArray(page)) entries.push(...page)
    else entries.push(page)
  }
  return entries
}

/**
 * Normalize one changed file from the pull request files REST endpoint. A large
 * or binary file has no `patch`; an unknown status falls back to `modified`.
 * @param {any} file - REST pull request file.
 * @returns {{ path: string, previousPath: string | null, status: string, additions: number,
 *   deletions: number, changes: number, patch: string | null } | null} the file, or null when it carries no path.
 */
function toDiffFile(file) {
  if (!file || typeof file.filename !== 'string' || file.filename.length === 0) return null
  return {
    path: file.filename,
    previousPath: typeof file.previous_filename === 'string' && file.previous_filename.length > 0
      ? file.previous_filename
      : null,
    status: typeof file.status === 'string' && DIFF_FILE_STATUSES.has(file.status) ? file.status : 'modified',
    additions: numberOrZero(file.additions),
    deletions: numberOrZero(file.deletions),
    changes: numberOrZero(file.changes),
    patch: typeof file.patch === 'string' ? file.patch : null,
  }
}

/**
 * Normalize the status rollup state to the panel's CI vocabulary.
 * GraphQL `EXPECTED` (required check not reported yet) reads as `PENDING`;
 * `ERROR` reads as `FAILURE`.
 * @param {unknown} state - GraphQL StatusState.
 * @returns {'SUCCESS' | 'FAILURE' | 'PENDING' | 'NEUTRAL' | null} normalized state.
 */
function toChecksState(state) {
  if (state === 'SUCCESS') return 'SUCCESS'
  if (state === 'FAILURE' || state === 'ERROR') return 'FAILURE'
  if (state === 'PENDING' || state === 'EXPECTED') return 'PENDING'
  if (state === 'NEUTRAL') return 'NEUTRAL'
  return null
}

/**
 * Read the rollup of the newest commit of a `commits(last: 1)` connection.
 * @param {any} connection - GraphQL commit connection.
 * @returns {any | null} the status check rollup, or null when the commit has none.
 */
function latestRollup(connection) {
  const node = nodesOf(connection)[0]
  const commit = node && node.commit
  return (commit && commit.statusCheckRollup) || null
}

/**
 * Normalize the individual checks of a status rollup. Check runs carry start and
 * completion timestamps; status contexts only carry their creation time, so a
 * status context has no measurable duration.
 * @param {any} rollup - GraphQL StatusCheckRollup.
 * @returns {Array<{ name: string, status: string | null, conclusion: string | null, detailsUrl: string | null,
 *   startedAt: string | null, completedAt: string | null, durationMs: number | null }>} checks.
 */
function toChecks(rollup) {
  const checks = []
  for (const node of nodesOf(rollup && rollup.contexts)) {
    if (!node) continue
    if (node.__typename === 'CheckRun') {
      checks.push({
        name: typeof node.name === 'string' ? node.name : '',
        status: node.status ?? null,
        conclusion: node.conclusion ?? null,
        detailsUrl: node.detailsUrl ?? null,
        startedAt: isoOrNull(node.startedAt),
        completedAt: isoOrNull(node.completedAt),
        durationMs: durationBetween(node.startedAt, node.completedAt),
      })
    } else if (node.__typename === 'StatusContext') {
      checks.push({
        name: typeof node.context === 'string' ? node.context : '',
        status: node.state ?? null,
        conclusion: node.state ?? null,
        detailsUrl: node.targetUrl ?? null,
        startedAt: isoOrNull(node.createdAt),
        completedAt: null,
        durationMs: durationBetween(node.createdAt, null),
      })
    }
  }
  return checks
}

// ---------------------------------------------------------------- cache integration

/**
 * Error thrown through {@link dedupe} so a failed read never reaches the cache.
 * @param {{ ok: false, reason: string, message: string }} result - failure to hand back to the caller.
 * @returns {Error & { githubFailure: { ok: false, reason: string, message: string } }} marker error.
 */
function rejectedRead(result) {
  const error = new Error(result.message)
  error.githubFailure = result
  return error
}

/**
 * Run one read through the shared TTL cache and single-flight gate.
 * Successful results are cached; failures are thrown through `dedupe` (which
 * drops rejected work from the in-flight map) and converted back into the
 * failure object, so a transient error is retried by the next call.
 * A `fresh` read skips the cached value, still publishes its result to the
 * cache, and never joins another call's in-flight work.
 * @template {{ ok: true }} T
 * @param {ReturnType<typeof createTtlCache>} cache - target cache.
 * @param {string} key - cache key.
 * @param {() => Promise<T>} load - loader producing a successful result.
 * @param {{ fresh?: boolean }} [options] - whether to bypass the cached value.
 * @returns {Promise<T | { ok: false, reason: string, message: string }>} the cached value or the failure.
 */
async function cachedRead(cache, key, load, options = {}) {
  if (options.fresh === true) {
    try {
      const result = await load()
      if (result && result.ok === true) {
        cache.set(key, result)
        return result
      }
      return result || fail('internal', 'GitHub read finished without a result.')
    } catch (error) {
      if (error && error.githubFailure) return error.githubFailure
      return fail('internal', error instanceof Error ? error.message : String(error))
    }
  }
  return dedupe(cache, key, async () => {
    const result = await load()
    if (result && result.ok === true) return result
    throw rejectedRead(result || fail('internal', 'GitHub read finished without a result.'))
  }).catch((error) => {
    if (error && error.githubFailure) return error.githubFailure
    return fail('internal', error instanceof Error ? error.message : String(error))
  })
}

/**
 * Convert an unexpected throw into the shared failure shape so exported reads
 * never reject.
 * @template T
 * @param {() => Promise<T>} run - the read to execute.
 * @returns {Promise<T | { ok: false, reason: string, message: string }>} the read result or an `internal` failure.
 */
async function guarded(run) {
  try {
    return await run()
  } catch (error) {
    return fail('internal', error instanceof Error ? error.message : String(error))
  }
}

// ---------------------------------------------------------------- GraphQL documents

/**
 * Build the pull request list document.
 * @param {string[]} states - GraphQL PullRequestState names from {@link PULL_REQUEST_STATES}.
 * @param {number} limit - validated page size.
 * @returns {string} GraphQL document.
 */
function buildPullRequestListQuery(states, limit) {
  return `query($owner: String!, $name: String!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    pullRequests(first: ${limit}, states: [${states.join(', ')}], orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        number
        title
        url
        state
        isDraft
        author { __typename login avatarUrl }
        createdAt
        updatedAt
        comments { totalCount }
        labels(first: ${LIST_LABELS_LIMIT}) { nodes { name color } }
        reviewDecision
        headRefName
        baseRefName
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
      }
    }
  }
}`
}

/**
 * Build the pull request detail document.
 * @param {number} number - validated pull request number.
 * @returns {string} GraphQL document.
 */
function buildPullRequestDetailQuery(number) {
  return `query($owner: String!, $name: String!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    pullRequest(number: ${number}) {
      number
      title
      url
      state
      isDraft
      mergeable
      mergeStateStatus
      reviewDecision
      body
      bodyHTML
      author { __typename login avatarUrl }
      createdAt
      updatedAt
      mergedAt
      closedAt
      headRefName
      baseRefName
      additions
      deletions
      changedFiles
      labels(first: ${DETAIL_LABELS_LIMIT}) { nodes { name color } }
      assignees(first: ${DETAIL_ASSIGNEES_LIMIT}) { nodes { login avatarUrl } }
      reviews(first: ${DETAIL_REVIEWS_LIMIT}) { nodes { author { __typename login avatarUrl } state body bodyHTML url submittedAt } }
      reviewRequests(first: ${DETAIL_REVIEW_REQUESTS_LIMIT}) {
        nodes { requestedReviewer { __typename ... on User { login avatarUrl } } }
      }
      comments(first: ${DETAIL_COMMENTS_LIMIT}) { nodes { author { __typename login avatarUrl } body bodyHTML url createdAt } }
      reviewThreads(first: ${DETAIL_REVIEW_THREADS_LIMIT}) {
        nodes {
          id
          isResolved
          path
          line
          originalLine
          startLine
          originalStartLine
          comments(first: ${DETAIL_REVIEW_THREAD_COMMENTS_LIMIT}) {
            nodes { author { __typename login avatarUrl } body bodyHTML url createdAt }
          }
        }
      }
      files(first: ${DETAIL_FILES_LIMIT}) { nodes { path additions deletions } }
      latest: commits(last: 1) {
        nodes {
          commit {
            statusCheckRollup {
              state
              contexts(first: ${DETAIL_CHECKS_LIMIT}) {
                nodes {
                  __typename
                  ... on CheckRun { name status conclusion detailsUrl startedAt completedAt }
                  ... on StatusContext { context state targetUrl createdAt }
                }
              }
            }
          }
        }
      }
      commits(last: ${DETAIL_COMMITS_LIMIT}) { nodes { commit { oid messageHeadline committedDate url } } }
    }
  }
}`
}

/**
 * Build the issue list document.
 * @param {string[]} states - GraphQL IssueState names from {@link ISSUE_STATES}.
 * @param {number} limit - validated page size.
 * @returns {string} GraphQL document.
 */
function buildIssueListQuery(states, limit) {
  return `query($owner: String!, $name: String!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    issues(first: ${limit}, states: [${states.join(', ')}], orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        __typename
        number
        title
        url
        state
        ... on Issue { stateReason }
        author { __typename login avatarUrl }
        createdAt
        updatedAt
        comments { totalCount }
        labels(first: ${LIST_LABELS_LIMIT}) { nodes { name color } }
      }
    }
  }
}`
}

/**
 * Build the issue detail document.
 * @param {number} number - validated issue number.
 * @returns {string} GraphQL document.
 */
function buildIssueDetailQuery(number) {
  return `query($owner: String!, $name: String!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    issue(number: ${number}) {
      number
      title
      url
      state
      stateReason
      body
      bodyHTML
      author { __typename login avatarUrl }
      createdAt
      updatedAt
      closedAt
      labels(first: ${DETAIL_LABELS_LIMIT}) { nodes { name color } }
      assignees(first: ${DETAIL_ASSIGNEES_LIMIT}) { nodes { login avatarUrl } }
      comments(first: ${DETAIL_COMMENTS_LIMIT}) { nodes { author { __typename login avatarUrl } body bodyHTML url createdAt } }
    }
  }
}`
}

/**
 * Build the discussion list document. `hasDiscussionsEnabled` rides along so a
 * repository without Discussions is reported as `discussions-unavailable`
 * instead of an empty list.
 * @param {number} limit - validated page size.
 * @returns {string} GraphQL document.
 */
function buildDiscussionListQuery(limit) {
  return `query($owner: String!, $name: String!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    hasDiscussionsEnabled
    discussions(first: ${limit}, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        number
        title
        url
        author { __typename login avatarUrl }
        createdAt
        updatedAt
        comments { totalCount }
        category { name emoji }
        answerChosenAt
      }
    }
  }
}`
}

/**
 * Build the discussion detail document.
 * @param {number} number - validated discussion number.
 * @returns {string} GraphQL document.
 */
function buildDiscussionDetailQuery(number) {
  return `query($owner: String!, $name: String!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    discussion(number: ${number}) {
      number
      title
      url
      body
      bodyHTML
      category { name emoji }
      author { __typename login avatarUrl }
      createdAt
      updatedAt
      answerChosenAt
      comments(first: ${DETAIL_COMMENTS_LIMIT}) {
        nodes { author { __typename login avatarUrl } body bodyHTML url createdAt isAnswer }
      }
    }
  }
}`
}

/**
 * Build the cheap feature-detection document used to explain a missing discussion.
 * @returns {string} GraphQL document.
 */
function buildDiscussionsEnabledQuery() {
  return `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) { hasDiscussionsEnabled }
}`
}

// ---------------------------------------------------------------- normalizers

/**
 * Normalize one pull request list node.
 * @param {any} node - GraphQL PullRequest node.
 * @returns {object} list item with the panel shape.
 */
function toPullRequestListItem(node) {
  const rollup = latestRollup(node.commits)
  return {
    number: numberOrZero(node.number),
    title: typeof node.title === 'string' ? node.title : '',
    url: typeof node.url === 'string' ? node.url : '',
    state: node.state ?? null,
    isDraft: node.isDraft === true,
    author: toAuthor(node.author),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    comments: countOf(node.comments),
    labels: toLabels(node.labels),
    reviewDecision: node.reviewDecision ?? null,
    headRefName: typeof node.headRefName === 'string' ? node.headRefName : '',
    baseRefName: typeof node.baseRefName === 'string' ? node.baseRefName : '',
    checks: rollup ? toChecksState(rollup.state) : null,
  }
}

/**
 * Normalize one issue list node.
 * @param {any} node - GraphQL Issue node.
 * @returns {object} list item with the panel shape.
 */
function toIssueListItem(node) {
  return {
    number: numberOrZero(node.number),
    title: typeof node.title === 'string' ? node.title : '',
    url: typeof node.url === 'string' ? node.url : '',
    state: node.state ?? null,
    stateReason: node.stateReason ?? null,
    author: toAuthor(node.author),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    comments: countOf(node.comments),
    labels: toLabels(node.labels),
  }
}

/**
 * Normalize one discussion list node.
 * @param {any} node - GraphQL Discussion node.
 * @returns {object} list item with the panel shape.
 */
function toDiscussionListItem(node) {
  return {
    number: numberOrZero(node.number),
    title: typeof node.title === 'string' ? node.title : '',
    url: typeof node.url === 'string' ? node.url : '',
    author: toAuthor(node.author),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    comments: countOf(node.comments),
    category: toCategory(node.category),
    answered: Boolean(node.answerChosenAt),
  }
}

/**
 * Normalize one pull request detail node.
 * @param {any} node - GraphQL PullRequest node.
 * @returns {object} detail item with the panel shape.
 */
function toPullRequestDetail(node) {
  const rollup = latestRollup(node.latest)
  return {
    kind: 'pr',
    number: numberOrZero(node.number),
    title: typeof node.title === 'string' ? node.title : '',
    url: typeof node.url === 'string' ? node.url : '',
    state: node.state ?? null,
    isDraft: node.isDraft === true,
    mergeable: node.mergeable ?? null,
    mergeStateStatus: node.mergeStateStatus ?? null,
    reviewDecision: node.reviewDecision ?? null,
    body: typeof node.body === 'string' ? node.body : '',
    bodyHtml: htmlOrEmpty(node.bodyHTML),
    author: toAuthor(node.author),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    mergedAt: node.mergedAt ?? null,
    closedAt: node.closedAt ?? null,
    headRefName: typeof node.headRefName === 'string' ? node.headRefName : '',
    baseRefName: typeof node.baseRefName === 'string' ? node.baseRefName : '',
    additions: numberOrZero(node.additions),
    deletions: numberOrZero(node.deletions),
    changedFiles: numberOrZero(node.changedFiles),
    labels: toLabels(node.labels),
    assignees: toAssignees(node.assignees),
    reviewers: toReviewers(node.reviews),
    reviewRequests: toReviewRequests(node.reviewRequests),
    comments: toComments(node.comments),
    reviews: toReviewNodes(node.reviews),
    reviewThreads: toReviewThreads(node.reviewThreads),
    checks: toChecks(rollup),
    checksState: rollup ? toChecksState(rollup.state) : null,
    commits: toCommits(node.commits),
    files: toFiles(node.files),
  }
}

/**
 * Normalize one issue detail node.
 * @param {any} node - GraphQL Issue node.
 * @returns {object} detail item with the panel shape.
 */
function toIssueDetail(node) {
  return {
    kind: 'issue',
    number: numberOrZero(node.number),
    title: typeof node.title === 'string' ? node.title : '',
    url: typeof node.url === 'string' ? node.url : '',
    state: node.state ?? null,
    stateReason: node.stateReason ?? null,
    body: typeof node.body === 'string' ? node.body : '',
    bodyHtml: htmlOrEmpty(node.bodyHTML),
    author: toAuthor(node.author),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    closedAt: node.closedAt ?? null,
    labels: toLabels(node.labels),
    assignees: toAssignees(node.assignees),
    comments: toComments(node.comments),
  }
}

/**
 * Normalize one discussion detail node.
 * @param {any} node - GraphQL Discussion node.
 * @returns {object} detail item with the panel shape.
 */
function toDiscussionDetail(node) {
  return {
    kind: 'discussion',
    number: numberOrZero(node.number),
    title: typeof node.title === 'string' ? node.title : '',
    url: typeof node.url === 'string' ? node.url : '',
    category: toCategory(node.category),
    body: typeof node.body === 'string' ? node.body : '',
    bodyHtml: htmlOrEmpty(node.bodyHTML),
    author: toAuthor(node.author),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    answered: Boolean(node.answerChosenAt),
    comments: nodesOf(node.comments).filter(Boolean).map((comment) => ({
      author: toAuthor(comment.author),
      body: typeof comment.body === 'string' ? comment.body : '',
      bodyHtml: htmlOrEmpty(comment.bodyHTML),
      url: typeof comment.url === 'string' ? comment.url : '',
      createdAt: comment.createdAt ?? null,
      isAnswer: comment.isAnswer === true,
    })),
  }
}

// ---------------------------------------------------------------- exported reads

/**
 * Resolve the login of the account the local `gh` CLI is signed in as.
 * The result is cached for 10 minutes; failures are not cached.
 * @returns {Promise<{ ok: true, login: string } | { ok: false, reason: string, message: string }>}
 *   the login, or a classified failure.
 */
export async function resolveViewer() {
  return guarded(() => cachedRead(viewerCache, 'viewer', async () => {
    const result = await ghApi('user')
    if (!result.ok) {
      return fail(result.reason || 'failed', result.message || 'Could not resolve the signed-in GitHub account.')
    }
    const login = result.data && typeof result.data.login === 'string' ? result.data.login : ''
    if (!login) return fail('bad-json', 'GitHub returned no login for the signed-in account.')
    return { ok: true, login }
  }))
}

/**
 * List the pull requests of a repository, newest update first.
 * @param {string} repo - `owner/name`.
 * @param {{ state?: 'open' | 'closed' | 'all', limit?: number }} [options] - state filter (default `open`) and page size (default 40, max 100).
 * @returns {Promise<{ ok: true, items: object[], viewer: string | null }
 *   | { ok: false, reason: string, message: string }>} list items plus the authenticated login.
 */
export async function listPullRequests(repo, options = {}) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const { state: rawState, limit: rawLimit, fresh } = options || {}
    const state = normalizeState(rawState)
    const limit = normalizeLimit(rawLimit)
    const key = `prs:${parsed.owner}/${parsed.name}:${state}:${limit}`
    return cachedRead(dataCache, key, async () => {
      const result = await ghGraphql(buildPullRequestListQuery(PULL_REQUEST_STATES[state], limit), {
        owner: parsed.owner,
        name: parsed.name,
      })
      if (!result.ok) return failureFromGraphql(result)
      const repository = repositoryOf(result.data)
      if (!repository) return repositoryNotFound(parsed)
      const items = nodesOf(repository.pullRequests).filter(Boolean).map(toPullRequestListItem)
      return { ok: true, items, viewer: viewerLogin(result.data) }
    }, { fresh })
  })
}

/**
 * List the issues of a repository, newest update first. Pull requests returned by
 * the `issues` connection are skipped so the two lists never overlap.
 * @param {string} repo - `owner/name`.
 * @param {{ state?: 'open' | 'closed' | 'all', limit?: number }} [options] - state filter (default `open`) and page size (default 40, max 100).
 * @returns {Promise<{ ok: true, items: object[], viewer: string | null }
 *   | { ok: false, reason: string, message: string }>} list items plus the authenticated login.
 */
export async function listIssues(repo, options = {}) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const { state: rawState, limit: rawLimit, fresh } = options || {}
    const state = normalizeState(rawState)
    const limit = normalizeLimit(rawLimit)
    const key = `issues:${parsed.owner}/${parsed.name}:${state}:${limit}`
    return cachedRead(dataCache, key, async () => {
      const result = await ghGraphql(buildIssueListQuery(ISSUE_STATES[state], limit), {
        owner: parsed.owner,
        name: parsed.name,
      })
      if (!result.ok) return failureFromGraphql(result)
      const repository = repositoryOf(result.data)
      if (!repository) return repositoryNotFound(parsed)
      const items = []
      for (const node of nodesOf(repository.issues)) {
        if (!node || node.__typename === 'PullRequest') continue
        items.push(toIssueListItem(node))
      }
      return { ok: true, items, viewer: viewerLogin(result.data) }
    }, { fresh })
  })
}

/**
 * List the discussions of a repository, newest update first. A repository with
 * Discussions disabled reports `discussions-unavailable` instead of an empty list.
 * @param {string} repo - `owner/name`.
 * @param {{ limit?: number }} [options] - page size (default 40, max 100).
 * @returns {Promise<{ ok: true, items: object[], viewer: string | null }
 *   | { ok: false, reason: string, message: string }>} list items plus the authenticated login.
 */
export async function listDiscussions(repo, options = {}) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const { limit: rawLimit, fresh } = options || {}
    const limit = normalizeLimit(rawLimit)
    const key = `discussions:${parsed.owner}/${parsed.name}:${limit}`
    return cachedRead(dataCache, key, async () => {
      const result = await ghGraphql(buildDiscussionListQuery(limit), { owner: parsed.owner, name: parsed.name })
      if (!result.ok) return failureFromGraphql(result)
      const repository = repositoryOf(result.data)
      if (!repository) return repositoryNotFound(parsed)
      if (repository.hasDiscussionsEnabled === false) return discussionsUnavailable()
      const items = nodesOf(repository.discussions).filter(Boolean).map(toDiscussionListItem)
      return { ok: true, items, viewer: viewerLogin(result.data) }
    }, { fresh })
  })
}

/**
 * Read one pull request with its body, reviewers, comments, inline review
 * threads, checks, commits, and files.
 * @param {string} repo - `owner/name`.
 * @param {number} number - pull request number.
 * @returns {Promise<{ ok: true, item: object, viewer: string | null }
 *   | { ok: false, reason: string, message: string }>} the detail item plus the authenticated login.
 */
export async function getPullRequest(repo, number, options = {}) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const pullRequestNumber = normalizeNumber(number)
    if (!pullRequestNumber) return fail('invalid-number', 'The pull request number must be a positive integer.')
    const { fresh } = options || {}
    const key = `pr:${parsed.owner}/${parsed.name}:${pullRequestNumber}`
    return cachedRead(dataCache, key, async () => {
      const result = await ghGraphql(buildPullRequestDetailQuery(pullRequestNumber), {
        owner: parsed.owner,
        name: parsed.name,
      })
      if (!result.ok) return failureFromGraphql(result)
      const repository = repositoryOf(result.data)
      if (!repository) return repositoryNotFound(parsed)
      const node = repository.pullRequest
      if (!node) {
        return fail('not-found', `Pull request #${pullRequestNumber} was not found in ${parsed.owner}/${parsed.name}.`)
      }
      return { ok: true, item: toPullRequestDetail(node), viewer: viewerLogin(result.data) }
    }, { fresh })
  })
}

/**
 * Read the changed files of one pull request together with their unified diff
 * patches. The REST files endpoint is used because GraphQL exposes no patches;
 * `gh --paginate --slurp` answers with one array per page, so the pages are
 * flattened before normalization and the result is capped at
 * {@link DIFF_FILES_LIMIT} files. Only pull requests have this endpoint.
 * @param {string} repo - `owner/name`.
 * @param {number} number - pull request number.
 * @param {{ fresh?: boolean }} [options] - whether to bypass the cached value.
 * @returns {Promise<{ ok: true, files: object[], total: number, truncated: boolean, viewer: string | null }
 *   | { ok: false, reason: string, message: string }>} changed files plus the authenticated login.
 */
export async function getPullRequestFiles(repo, number, options = {}) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const pullRequestNumber = normalizeNumber(number)
    if (!pullRequestNumber) return fail('invalid-number', 'The pull request number must be a positive integer.')
    const { fresh } = options || {}
    const key = `files:${parsed.owner}/${parsed.name}:${pullRequestNumber}`
    return cachedRead(dataCache, key, async () => {
      const result = await ghApi(
        `repos/${parsed.owner}/${parsed.name}/pulls/${pullRequestNumber}/files`,
        ['--paginate', '--slurp', '-X', 'GET'],
      )
      if (!result.ok) return fail(result.reason || 'failed', result.message || 'GitHub REST request failed.')
      const entries = flattenRestPages(result.data)
      if (!entries) return fail('bad-json', 'GitHub returned an unreadable pull request file list.')
      const files = []
      for (const entry of entries) {
        const file = toDiffFile(entry)
        if (file) files.push(file)
      }
      if (entries.length > 0 && files.length === 0) {
        return fail('bad-json', 'GitHub returned a pull request file list without file paths.')
      }
      const truncated = files.length > DIFF_FILES_LIMIT
      const visible = truncated ? files.slice(0, DIFF_FILES_LIMIT) : files
      const viewer = await resolveViewer()
      return {
        ok: true,
        files: visible,
        total: visible.length,
        truncated,
        viewer: viewer.ok ? viewer.login : null,
      }
    }, { fresh })
  })
}

/**
 * Read one issue with its body, labels, assignees, and comments.
 * @param {string} repo - `owner/name`.
 * @param {number} number - issue number.
 * @returns {Promise<{ ok: true, item: object, viewer: string | null }
 *   | { ok: false, reason: string, message: string }>} the detail item plus the authenticated login.
 */
export async function getIssue(repo, number, options = {}) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const issueNumber = normalizeNumber(number)
    if (!issueNumber) return fail('invalid-number', 'The issue number must be a positive integer.')
    const { fresh } = options || {}
    const key = `issue:${parsed.owner}/${parsed.name}:${issueNumber}`
    return cachedRead(dataCache, key, async () => {
      const result = await ghGraphql(buildIssueDetailQuery(issueNumber), { owner: parsed.owner, name: parsed.name })
      if (!result.ok) return failureFromGraphql(result)
      const repository = repositoryOf(result.data)
      if (!repository) return repositoryNotFound(parsed)
      const node = repository.issue
      if (!node) return fail('not-found', `Issue #${issueNumber} was not found in ${parsed.owner}/${parsed.name}.`)
      return { ok: true, item: toIssueDetail(node), viewer: viewerLogin(result.data) }
    }, { fresh })
  })
}

/**
 * Read one discussion with its body, category, answer state, and top-level comments.
 * @param {string} repo - `owner/name`.
 * @param {number} number - discussion number.
 * @returns {Promise<{ ok: true, item: object, viewer: string | null }
 *   | { ok: false, reason: string, message: string }>} the detail item plus the authenticated login.
 */
export async function getDiscussion(repo, number, options = {}) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const discussionNumber = normalizeNumber(number)
    if (!discussionNumber) return fail('invalid-number', 'The discussion number must be a positive integer.')
    const { fresh } = options || {}
    const key = `discussion:${parsed.owner}/${parsed.name}:${discussionNumber}`
    return cachedRead(dataCache, key, async () => {
      const result = await ghGraphql(buildDiscussionDetailQuery(discussionNumber), {
        owner: parsed.owner,
        name: parsed.name,
      })
      if (!result.ok) {
        const failure = failureFromGraphql(result)
        // GitHub reports a discussion in a repository without Discussions exactly
        // like a missing number; disambiguate with one cheap feature check.
        if (failure.reason === 'not-found' && (await fetchDiscussionsEnabled(parsed)) === false) {
          return discussionsUnavailable()
        }
        return failure
      }
      const repository = repositoryOf(result.data)
      if (!repository) return repositoryNotFound(parsed)
      const node = repository.discussion
      if (!node) {
        return fail('not-found', `Discussion #${discussionNumber} was not found in ${parsed.owner}/${parsed.name}.`)
      }
      return { ok: true, item: toDiscussionDetail(node), viewer: viewerLogin(result.data) }
    }, { fresh })
  })
}

/**
 * Submit one pull request review (approve, request changes, or comment) as the
 * signed-in `gh` account. This is the plugin's only GitHub write; the Web page
 * collects an explicit user confirmation before calling it.
 * @param {string} repo - `owner/name`.
 * @param {number} number - pull request number.
 * @param {{ event: string, body?: string }} review - validated review intent.
 * @returns {Promise<{ ok: true, review: { url: string, state: string } }
 *   | { ok: false, reason: string, message: string }>} the created review, or a classified failure.
 */
export async function submitReview(repo, number, review) {
  return guarded(async () => {
    const parsed = parseRepo(repo)
    if (!parsed) return invalidRepoFailure()
    const pullNumber = normalizeNumber(number)
    if (!pullNumber) return fail('invalid-number', 'The pull request number must be a positive integer.')
    const event = review && typeof review.event === 'string' ? review.event.toUpperCase() : ''
    if (!REVIEW_EVENTS.has(event)) return fail('invalid-review', 'Choose approve, request changes, or comment.')
    const body = review && typeof review.body === 'string' ? review.body.slice(0, 60_000) : ''
    if ((event === 'REQUEST_CHANGES' || event === 'COMMENT') && body.trim() === '') {
      return fail('invalid-review', 'This review event needs a review comment.')
    }
    const endpoint = `repos/${parsed.owner}/${parsed.name}/pulls/${pullNumber}/reviews`
    const result = await ghApiWrite(endpoint, 'POST', body.trim() ? { event, body } : { event })
    if (!result.ok) return fail(result.reason || 'failed', result.message)
    const data = result.data
    return {
      ok: true,
      review: {
        url: data && typeof data.html_url === 'string' ? data.html_url : '',
        state: data && typeof data.state === 'string' ? data.state : event,
      },
    }
  })
}

/**
 * Read whether Discussions are enabled on a repository; used only to explain a
 * missing discussion. Successful answers share the normal read cache.
 * @param {{ owner: string, name: string }} parsed - validated repository parts.
 * @returns {Promise<boolean | null>} the flag, or null when it could not be read.
 */
async function fetchDiscussionsEnabled(parsed) {
  const key = `discussions-enabled:${parsed.owner}/${parsed.name}`
  const result = await cachedRead(dataCache, key, async () => {
    const response = await ghGraphql(buildDiscussionsEnabledQuery(), { owner: parsed.owner, name: parsed.name })
    if (!response.ok) return failureFromGraphql(response)
    const repository = repositoryOf(response.data)
    if (!repository) return repositoryNotFound(parsed)
    return { ok: true, enabled: repository.hasDiscussionsEnabled === true }
  })
  return result.ok ? result.enabled : null
}
