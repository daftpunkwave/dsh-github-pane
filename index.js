/**
 * Core responsibility: compose the Host half of the GitHub workbench and own the
 * lifecycle of the HTTP routes it serves to the Web page.
 * Contracts: requires the `webServer` service to mount routes and the
 * `connection` service to authorize them; every read is delegated to
 * `host/routes.js`, which reaches GitHub through the local `gh` CLI.
 * Constraints: no session state, no writes to GitHub, and no routes mounted
 * outside the effect that owns their disposal.
 */
import { createRoutes } from './host/routes.js'

export const name = 'github-panel'

export const inject = ['webServer', 'connection']

export function apply(ctx) {
  ctx.effect(() => {
    const connection = Reflect.get(ctx, 'connection')
    if (!connection || typeof connection.requestRejection !== 'function') {
      throw new Error('github-panel: the connection service is required to authorize page requests')
    }
    const disposers = createRoutes(ctx.webServer, (req) => connection.requestRejection(req))
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'github-panel: routes')
}
