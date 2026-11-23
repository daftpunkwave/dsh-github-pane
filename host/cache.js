/**
 * Core responsibility: hold short-lived GitHub read results and collapse
 * concurrent identical reads into a single in-flight request.
 * Contracts: `createTtlCache({ ttlMs, maxEntries })` returns
 * `{ get(key), set(key, value), clear(), size }`, where `size` is a read-only
 * property and entries expire lazily after `ttlMs` (oldest write is evicted first
 * once `maxEntries` is exceeded); `dedupe(cache, key, factory)` returns the
 * cached value or the one in-flight promise shared by every caller of that key.
 * Constraints: in-memory only — no timers, no I/O, no persistence; the only
 * clock is `Date.now()`; a rejected `factory` is never cached and its in-flight
 * entry is always removed, so a failure cannot leave later calls waiting.
 */

/** Default lifetime of one cache entry in milliseconds. */
const DEFAULT_TTL_MS = 30_000

/** Default number of entries kept before the oldest write is evicted. */
const DEFAULT_MAX_ENTRIES = 120

/**
 * In-flight promises, kept per cache instance so two caches may reuse the same
 * key without sharing a request.
 * @type {WeakMap<object, Map<string, Promise<unknown>>>}
 */
const inFlightByCache = new WeakMap()

/**
 * Read (or create) the in-flight map of one cache instance.
 * @param {object} cache - cache returned by {@link createTtlCache}.
 * @returns {Map<string, Promise<unknown>>} pending call map of that cache.
 */
function inFlightOf(cache) {
  let pending = inFlightByCache.get(cache)
  if (!pending) {
    pending = new Map()
    inFlightByCache.set(cache, pending)
  }
  return pending
}

/**
 * Create a small TTL cache with bounded capacity.
 * @param {{ ttlMs?: number, maxEntries?: number }} [options] - entry lifetime and capacity.
 * @returns {{ get: (key: string) => any, set: (key: string, value: any) => void, clear: () => void, size: number }}
 *   the cache; `size` is a property reporting how many entries are retained.
 */
export function createTtlCache(options = {}) {
  const ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0 ? options.ttlMs : DEFAULT_TTL_MS
  const maxEntries = Number.isFinite(options.maxEntries) && options.maxEntries >= 1
    ? Math.trunc(options.maxEntries)
    : DEFAULT_MAX_ENTRIES
  /** @type {Map<string, { value: any, at: number }>} */
  const entries = new Map()

  // Capacity is tiny (120 by default), so a linear scan for the oldest write is
  // cheaper than tracking a second ordered structure.
  function evictOverflow() {
    while (entries.size > maxEntries) {
      let oldestKey
      let oldestAt = Infinity
      for (const [key, entry] of entries) {
        if (entry.at < oldestAt) {
          oldestAt = entry.at
          oldestKey = key
        }
      }
      if (oldestKey === undefined) return
      entries.delete(oldestKey)
    }
  }

  return {
    get(key) {
      if (typeof key !== 'string') return undefined
      const entry = entries.get(key)
      if (!entry) return undefined
      if (Date.now() - entry.at >= ttlMs) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },
    set(key, value) {
      if (typeof key !== 'string') return
      entries.set(key, { value, at: Date.now() })
      evictOverflow()
    },
    clear() {
      entries.clear()
    },
    get size() {
      return entries.size
    },
  }
}

/**
 * Load one value through a cache with single-flight deduplication.
 *
 * A cache hit is returned as-is. On a miss the first caller's `factory()` runs
 * and its promise is shared by every caller with the same cache and key; on
 * fulfilment the value is cached and the in-flight entry removed. On rejection
 * the in-flight entry is removed and the rejection propagated, so the next call
 * starts a fresh attempt instead of waiting on a settled promise.
 *
 * Note: a resolved `undefined` is stored but reads back as a miss, because
 * `undefined` is also the cache-miss marker; factories should return a defined
 * value.
 * @template T
 * @param {{ get: (key: string) => any, set: (key: string, value: any) => void }} cache - cache created by {@link createTtlCache}.
 * @param {string} key - cache key.
 * @param {() => Promise<T>} factory - loader; invoked at most once per key in flight.
 * @returns {Promise<T>} the cached value or the freshly loaded one.
 */
export function dedupe(cache, key, factory) {
  const cached = cache.get(key)
  if (cached !== undefined) return Promise.resolve(cached)

  const pending = inFlightOf(cache)
  const running = pending.get(key)
  if (running) return /** @type {Promise<T>} */ (running)

  const task = Promise.resolve()
    .then(() => factory())
    .then(
      (value) => {
        pending.delete(key)
        cache.set(key, value)
        return value
      },
      (error) => {
        pending.delete(key)
        throw error
      },
    )
  pending.set(key, task)
  return task
}
