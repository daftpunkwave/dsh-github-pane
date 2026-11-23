# Architecture

`dsh-github-pane` is a DSH bundle with a Host half that talks to GitHub and a Web client half
that renders the right-sidebar pane.

```
Session working directory
        │  git remote
        ▼
Host plugin (index.js) ──► host/routes.js ──► host/github.js ──► gh CLI ──► GitHub
        │                        │
        │ webServer              │ response
        ▼                        ▼
Browser client (client.js) ── sidebar.right.pane.tab slot
```

## Host half

`index.js` is the bundle's Host plugin. It injects the `webServer` and `connection` services
and, inside one effect, mounts every route from `host/routes.js`. The effect returns the
disposers it received, so disabling the bundle unmounts the routes.

Every request is authorized before it reaches GitHub: `connection.requestRejection(req)`
rejects requests that do not originate from the DSH page. The routes never trust the client
for repository identity beyond the `owner/name` string it sends; the Host resolves the rest
through `gh`.

`host/gh.js` wraps `gh api` (REST) and `gh api graphql` with timeouts and normalized errors
(`missing`, `unauthenticated`, `rate-limited`, `not-found`, `invalid-repo`, `discussions-unavailable`,
and so on). The only write operation is `submitReview`, which POSTs a review event to GitHub.
`host/github.js` owns every query and normalizer: pull requests, issues, discussions, diffs,
comments, reviews, review threads, checks, and commits. It also extracts GitHub's
`bodyHTML` alongside the plain body.

Responses are cached in Host memory for 30 seconds; the refresh button bypasses the cache.

### HTTP surface

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/github-panel/repo` | Resolve repository and viewer for a working directory. |
| `GET` | `/api/github-panel/list` | List pull requests, issues, or discussions. |
| `GET` | `/api/github-panel/detail` | One item with comments, reviews, timeline data, and threads. |
| `GET` | `/api/github-panel/diff` | Changed files with patches for a pull request. |
| `POST` | `/api/github-panel/review` | Submit an approve / request-changes / comment review. |

All endpoints answer JSON. Failures carry a `reason` from the error list above so the client
can localize them.

## Web client half

`client.js` is a single module registered through DSH's client module loader. It declares the
`sidebar.right.pane.tab` slot and registers the right-sidebar tab type, the tab body, and the
session-header trigger.

State lives in the pane, not in the Host, except for the 30-second cache. List/detail state and
the list scroll position survive switching right-sidebar tabs because the tab is registered with
`keepMounted`.

### Rendering

- Bodies and comments are GitHub's own `bodyHTML`, not a re-parsed Markdown string. The client
  walks that HTML with an allow-list (`renderGitHubHtml`): only known tags, attributes, and
  class names survive; scripts, event handlers, inline styles, unsafe URLs, and embedded
  frames are dropped. External links always open with `noopener noreferrer`.
- The official `github-markdown-css` rules are vendored verbatim; its light/dark palettes are
  replaced with bindings to DSH theme tokens, so the pane follows the app theme and never
  guesses at the system appearance.
- Diffs are parsed from patch text on the client (line numbers, additions/deletions, hunks).
  Unified and split views share the same parser; review threads are attached by new or old
  line number.
- Mermaid `flowchart` / `graph` blocks are laid out by a small built-in renderer; other diagram
  kinds fall back to the source block with a link to GitHub.

### Theming and fonts

The stylesheet only uses DSH tokens (`--dsw-alias-*`, `--dsw-radius-*`) plus neutral fallbacks.
Inter (UI) and JetBrains Mono (code) are embedded as latin-subset WOFF2 data URIs under the SIL
OFL 1.1; Chinese and other CJK text falls back to the host's UI font.

## Constraints

- No build step and no runtime dependencies: the host is ESM, the client is one module loaded by
  DSH, and the stylesheet is a template string inside `client.js`.
- The pane never calls GitHub from the browser; the Host is the only egress point.
- Read-only apart from review submission. Adding another write operation means adding an
  authorization-checked Host route first, then a client action.
- Only `github.com` remotes are resolved.

## Verifying a change

1. `node scripts/check.mjs` for syntax.
2. Install the checkout as a linked bundle and open a session in a GitHub checkout.
3. Check the Summary, Changes, inline threads, review submission, activity filters, and both
   themes. There is no automated test suite yet; verification is manual against a real
   repository.
