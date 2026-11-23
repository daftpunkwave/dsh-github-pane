/**
 * Core responsibility: small HTTP helpers shared by the plugin's routes.
 * Contracts: handlers receive Node `IncomingMessage`/`ServerResponse`; these
 * helpers read the URL query, read a bounded JSON body, and write one JSON response.
 * Constraints: never throw on a malformed URL or body, never buffer an unbounded
 * request body, and keep the method guard explicit per route.
 */

/**
 * Write one JSON response.
 * @param {import('node:http').ServerResponse} res - response to finish.
 * @param {number} status - HTTP status code.
 * @param {unknown} body - JSON-serializable payload.
 * @returns {void}
 */
export function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/**
 * Read one query parameter.
 * @param {import('node:http').IncomingMessage} req - the incoming request.
 * @param {string} key - parameter name.
 * @returns {string} the value, or an empty string when absent or unparsable.
 */
export function queryParam(req, key) {
  try {
    return new URL(req.url || '', 'http://localhost').searchParams.get(key) || ''
  } catch {
    return ''
  }
}

/**
 * Reject non-GET requests with the shared 405 body.
 * @param {import('node:http').IncomingMessage} req - the incoming request.
 * @param {import('node:http').ServerResponse} res - response to write when rejecting.
 * @returns {boolean} true when the caller should stop.
 */
export function rejectNonGet(req, res) {
  if (req.method === 'GET') return false
  json(res, 405, { ok: false, error: 'method-not-allowed' })
  return true
}

/**
 * Read one bounded JSON request body.
 * @param {import('node:http').IncomingMessage} req - the incoming request.
 * @param {number} limit - largest accepted body in bytes.
 * @returns {Promise<any | null>} the parsed value, or null when the body is too
 *   large, is not JSON, or the request fails.
 */
export function readJsonBody(req, limit) {
  return new Promise((resolve) => {
    let size = 0
    let settled = false
    const chunks = []
    const settle = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        settle(null)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (size > limit) {
        settle(null)
        return
      }
      try {
        settle(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        settle(null)
      }
    })
    req.on('error', () => settle(null))
  })
}
