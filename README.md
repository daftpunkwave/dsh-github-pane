# dsh-github-pane

A GitHub review pane for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It adds a **GitHub** tab to the right sidebar so you can read and review the pull requests, issues, and discussions of the repository in the current session's working directory without leaving the app.

## Highlights

- **Zero setup per repository.** The pane resolves the GitHub repository from the session's working directory (via the checkout's `git remote`).
- **Pull request review.** Open/closed lists, a summary with title, labels, branch, checks, review decision and merge state, the rendered description, and an activity timeline. The changes view has unified/split diffs, per-file collapse, expand/collapse all, sticky file headers, and inline review threads.
- **Issues and discussions.** Bodies, labels, assignees, answered state, replies, and the same activity timeline.
- **GitHub-grade rendering.** Bodies and comments are GitHub's own server-rendered `bodyHTML`, styled with the official `github-markdown-css` (MIT) and re-colored through DSH theme tokens. Alerts, task lists, tables, `<details>` blocks, footnotes, emoji, and code highlighting match the web UI; Mermaid flowcharts are rendered in the pane.
- **Review actions.** Submit a review (approve / request changes / comment) from the top of the pane — the only write operation. Any comment or review thread can be quoted into the chat composer, opened on GitHub, or copied.
- **Activity controls.** Scope the timeline to all activity, unresolved review threads, or your own activity; filter by event type and author; sort newest or oldest first.
- **Sanitized rendering.** GitHub's HTML passes a second tag/attribute/class allow-list in the client; scripts, inline handlers, styles, and unsafe URLs are dropped, and external links open with `noopener noreferrer`.
- **English and Chinese UI**, with a bundled Inter (UI) and JetBrains Mono (code) latin subset so the pane looks the same on every machine.

## Requirements

- DeepSeek Harness with the right sidebar (Web or Desktop surface).
- [GitHub CLI](https://cli.github.com/) installed and signed in (`gh auth login`). All GitHub access goes through this account, so the pane can read exactly what `gh` can read. No separate OAuth app is needed.
- A session working directory that is a Git checkout with a `github.com` remote.

## Install

1. Open **Settings → Plugins** in DSH (the Plugin Manager).
2. Install this bundle from `github:daftpunkwave/dsh-github-pane` (pin a commit for reproducible updates), or from npm as `dsh-github-pane` once it is published.
3. Enable the bundle and open a session whose working directory is a GitHub checkout.
4. Open the pane from the GitHub icon in the session header, or from **+** in the right sidebar and then **GitHub**.

For local development, install the checkout as a linked directory instead and enable the bundle; edits are picked up from the source tree.

## Usage

- The tab row switches between **Pull requests**, **Issues**, and **Discussions**; the state selector filters the list.
- **Summary** shows the description, metadata, checks, reviewers, changed files, commits, and the activity timeline. **Changes** shows the diff and inline review threads.
- Review threads show who wrote them and whether they are unresolved. Unresolved threads start expanded; resolved threads start collapsed with a preview of the first comment and can be reopened.
- **Submit review** is available on open, non-draft pull requests and requires the signed-in `gh` account to have review permission on the repository.
- The refresh button re-reads GitHub through the host; the panel otherwise keeps a 30-second in-memory cache.

## Limitations

- Read-only apart from submitting a review. Editing, merging, closing, labeling, and other mutations still belong on GitHub.
- Only `github.com` remotes are supported.
- The pane lists up to 40 items per family and caps diff details (100 files, 400 lines per file); when a cap is reached the pane says so and points to GitHub for the rest.
- Data comes from the local `gh` CLI, so it is unavailable when `gh` is missing, signed out, or rate-limited.

## Development

The plugin has no build step: the host is plain ESM, and the web client is a single CommonJS-style module loaded by DSH's client loader.

| Path | Responsibility |
| --- | --- |
| `index.js` | Host plugin entry: mounts the HTTP routes and owns their lifecycle. |
| `host/routes.js`, `host/http.js` | Request routing, JSON responses, and page-request authorization. |
| `host/gh.js` | Thin `gh api`/`gh api graphql` wrapper, including the review write. |
| `host/github.js` | GraphQL/REST queries and normalizers for pull requests, issues, discussions, diffs, and reviews. |
| `client.js` | Sidebar tab registration, all UI, the HTML renderer, and the stylesheet. |
| `cordis.patch.yml` | Loader patch that inserts the plugin row. |
| `locale/` | Plugin Manager title and description. |
| `docs/ARCHITECTURE.md` | Data flow, security boundaries, and design notes. |

Run the syntax check before committing:

```sh
node scripts/check.mjs
```

## License

MIT. See [LICENSE](./LICENSE).

The bundled Inter and JetBrains Mono latin subsets are licensed under the SIL Open Font License 1.1; the copyright notices are in the stylesheet header of `client.js`.
