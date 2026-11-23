# Coding Agent Work Instructions

This project is a DeepSeek Harness (DSH) plugin bundle. It combines a Node.js host plugin (`index.js`, `host/`) that exposes authorized, read-only GitHub data through the DSH web server with a browser client bundle (`client.js`) that renders a GitHub pane in the right sidebar of the DSH Web and Desktop surfaces. GitHub access goes through the local `gh` CLI; the only write operation is submitting a pull request review. This is a public repository and English is its default language.

## Meta-Directive and Precedence

These instructions are the mandatory rules for AI coding agents working in this repository. Requirement analysis, implementation, refactoring, review, testing, commits, and the full pull request lifecycle must follow them without exception; do not take shortcuts, skip steps, or silently ignore them. The project's own rules take precedence; when external generic guidance conflicts with `AGENTS.md` and the responsible project documents, the project rules win.

## Reading and Specifications

Read [README](README.md) and [Architecture](docs/ARCHITECTURE.md) first, then the target files, their callers and callees, configuration, and data flow before changing behavior. Public DSH APIs used by this bundle (web server routes, connection authorization, sidebar tabs, slots, locale) are governed by the official DSH documentation; verify the API contract there before relying on it.

Rules, identifiers, API contracts, configuration, user-visible copy, and prompts are owned by their responsible documents and must not be changed silently during implementation. The conventions themselves may be revised for a stated requirement, with the related contracts updated together. Before editing, find the existing abstractions; make only the minimal complete change the task requires. If a contradiction or an uncovered decision affects the outcome, report the impact and confirm instead of deciding silently; do not add unapproved dependencies or services.

## Git Workflow and Full Pull Request Lifecycle

### Branches and authorization

`main` is the default branch; changes reach it through pull requests, never through direct commits.

- **Strict authorization:** committing, pushing, creating a PR, and merging require explicit authorization for the current task; prior authorizations do not carry over.
- Create a dedicated task branch from the latest `main`; preserve existing uncommitted work and never clean the working tree with reset or force push. Name branches `<type>/<kebab-case-description>`.
- One commit handles one logical change.

### Prior-issue policy and end-to-end PR ownership

- **Prior-issue policy (on demand):** prefer filing an issue before fixing a bug (a tiny, self-evident bug does not have to wait for an issue); new features, routine refactors, documentation, and CI changes do not require a prior issue; any change that is large, wide in impact, or involves complex design should start from an issue.
- **Issue conventions and sidebar responsibilities:** use the issue sidebar for what it owns:
  1. **Type (required, exactly one):** `Bug` for defects and vulnerabilities, `Feature` for proposed functionality, and `Task` for other work items (architecture refactors, tests, documentation, tooling, CI/CD).
  2. **Fields:** `Priority` is required (`P0`-`P4`); `Effort` is optional and recommended.
  3. **Labels:** confidence uses `confidence/high`, `confidence/medium`, or `confidence/low`; domains use `realm/*` and `area/*`. **Never put `bug`, `feature`, or `task` in labels**; the native Type field is the only place for the type. Priority lives in Fields, not in labels.
  4. **Relationships (optional):** record blocking (`Blocks`/`Blocked by`), parent/child (`Parent`/`Sub-issue`), or context (`Relates to`) links when they exist; leave them empty for independent atomic work.
- **Issue and PR body/sidebar conventions:** priority and confidence are carried by the sidebar, not the body; an external contributor without sidebar permission may state suggestions at the end of the body for a maintainer to sync during triage. Keep every crossed domain in the body while labeling only the single most relevant one. PRs have no native structured fields; use PR labels for the primary domain or task category and keep the body self-contained.
- **End-to-end ownership:** once a PR is created or taken over, follow it until it is fully mergeable: all required CI and quality gates pass and every review comment is handled.
- **Mandatory self-review and local verification before pushing:** before every commit and push, review your own diff, run and pass the applicable test suites and checks (`npm run check` and any harness added to the repository), and update affected comments. Never push repeatedly without local self-review and verification.
- **Wait for checks; never jump the queue:** after pushing, wait through the app's CI notifications until all required checks and triggered reviewers finish. **Never push again** before every required check and reviewer has completed the current round.
- **Two-channel issue extraction:** once all checks and reviews for the round have finished, read both channels completely: (A) all review comments and inline comments, especially problems that tools fold outside the diff range; (B) the detailed logs of every failed check.
- **One batch fix and push:** fix everything collected in the round locally, self-review and verify, push once to the PR, and re-enter the wait loop until the PR is fully mergeable.

### Strict resolve conditions

Every resolvable review thread (review threads and inline comments) must be resolved compliantly before a branch can merge; ordinary comments are not threads and must be verified, fixed, and answered. Resolve a thread only in one of these three cases:

1. **Real problem, actually fixed:** the thread reported a real issue, and the fix is implemented and verified locally.
2. **Confirmed false positive:** code logic, type contracts, and runtime context were checked carefully and the report is conclusively wrong.
3. **Out-of-scope but valuable, and a new issue exists:** the report is real and valuable but too large, too complex, or outside the current PR, and a new standalone issue has been created for it (never resolve before the issue exists).

**Hard ban:** never resolve a thread outside these three cases. Never resolve a thread merely to clear the queue while neither fixing, disproving, nor filing an issue.

### Commit format

Conventional Commits: `<type>(<scope>): <subject>`; the scope is optional. Supported types:

| type | Purpose |
|---|---|
| feat | New or extended functionality |
| fix | Correction of incorrect behavior |
| docs | Documentation and development conventions |
| refactor | Structural change with neither new behavior nor bug fixes |
| perf | Performance optimization |
| test | Test cases, fixtures, and test infrastructure |
| style | Formatting that does not change behavior (not UI features) |
| build | Build, packaging, compilation configuration, and dependency management |
| ci | CI/CD automation: checks, release, deployment, and rollback |
| chore | Maintenance outside the types above |
| revert | Revert an existing commit with `git revert` and a stated reason |

- CI and CD share `ci`, distinguished by `ci(check)`, `ci(release)`, `ci(deploy)`, and `ci(rollback)`. Use `build(deps)` for dependency upgrades and a responsibility scope such as `fix(auth)` for security fixes; do not invent `deps`, `security`, or `hotfix` types. A commit generated by `git revert` may keep its standard title.
- **Language constraints:** commit and PR titles, bodies, and comments default to English; keep English proper nouns and the Conventional Commits type/scope. No 72-character line limit applies.
- **Titles and bodies:** state the concrete functionality in the title, starting with a verb and keeping it concise; the body explains what changed, why, how it was verified, and the compatibility impact. Titles, bodies, comments, and the change itself must be independently readable. Never commit secrets or private local configuration.
- Complete self-review and applicable checks before pushing. After the required checks and reviews pass, only an authorized squash merge is allowed; merge commits and rebase merges are forbidden. Branch cleanup follows separate authorization; never discard work just to keep the tree clean.

### Squash merge commit message

- The merge title summarizes the change using the PR title and appends `(#PR)`; do not duplicate an existing suffix.
- The merge body keeps every commit's complete title, body, and trailers in commit order; do not rewrite, summarize, or omit anything. List separators are allowed, but the original content must not change; a single commit is preserved just as completely.
- Before merging, verify the commit list and body against the final PR head so the last push is not missed; never replace the commit history with a separately written PR summary.
- The squash produces one new commit on `main`; what is preserved is the commit message, not the original SHA, parentage, or separate commit objects. After merging, verify the title, body, PR links, and the final change are consistent.

## Independently Readable External Content and Changes

- **External deliverables are self-contained:** user replies, commits, PRs, issues, review comments and replies, delivery reports, release notes, public documentation and user-visible copy, plus every public source, configuration, test, and documentation change must be understandable and reviewable on their own. Never depend on internal materials the audience cannot access, unpublished drafts, local configuration, uncommitted code, or implicit agreements. Provide the necessary background, contracts, configuration requirements, and checkable evidence directly in the deliverable; public links supplement evidence, and key explanations belong in the deliverable itself.
- **No internal numbering or plan references:** never write things such as "implement phase 2", "complete section 3.2 of the spec", or "finish todo list" in external content. Internal plan numbers, section locators, and report templates with internal identifiers are for internal collaboration only; this section governs everything external.
- **Pure code and diff perspective:** explain with concrete scenarios and capability names why the change was made, what actually changed, what it affects, and how to verify and accept it (Changed What & Why). All descriptions must focus on the change itself and its technical reasons; empty commits such as `fix: update files`, `chore: format code`, or `refactor: optimize logic` are forbidden.
- **No speculation or future plans:** never explain modules that did not actually change or describe planned future work in commits and PRs.

## Architecture, Implementation, and Engineering Rules

### Core engineering rules and repair principles

- **Evidence first:** judge only from the actual code, actual runtime behavior, dependency relations, and actual contracts; never claim a problem from surface reading, personal preference, or decontextualized best practices.
- **Four-step problem confirmation:** for every problem, confirm (1) whether it actually exists, (2) whether it has real impact or a reasonable risk, (3) what the correct expected behavior is, and (4) where the most appropriate fix belongs.
- **Minimal precise fixes; no mechanical padding:** prefer local, explicit, minimal, complete fixes; keep existing correct behavior, public contracts, and module boundaries; never change unrelated behavior; avoid new complexity. Never pad for review metrics with unnecessary branches, redundant exception handling, abstract shells, blind caching or retries, filler comments, fragile tests, or fragmented files.
- **No speculation / zero hallucination:** never invent unreliable APIs, uncertain dependency versions, or nonexistent package names. When the architecture, dependency version, or interface definition is unclear, stop and check in this order: (1) local source, lock files, and configuration; (2) official documentation; (3) ask the user for clarification.
- **Zero artifacts left behind:** before delivering or committing, remove debug statements (`console.log`, `debugger`), commented-out dead code, temporary mock or stub data, and leftover TODO markers.

### Architecture and security boundaries

- **Separation of concerns over cohesion:** the host plugin and browser client are separated by an HTTP contract. The browser never calls GitHub directly and never runs host code; the host never renders UI. The host owns process execution (`gh`, `git`), request authorization, caching, and HTTP response shaping; the client owns rendering, interaction, and presentation. Every contribution point (route, loader row, sidebar tab, slot, locale namespace) must keep a unique, package-scoped identity.
- **Single responsibility and physical isolation (SRP):** one source file carries one clear responsibility; if a file mixes two unrelated domains or contexts, split it physically regardless of line count. Split along natural boundaries; never create shallow forwarding layers (no passthrough or wrapper hell). A single source file should not exceed 500 lines; when it does, split by responsibility rather than breaking module boundaries.
- **Dependency inversion and testability (DIP):** core behavior must receive external dependencies through explicit parameters or dependency injection. Pure logic (query construction, response normalization, diff and activity shaping, HTML sanitization) must be testable without a live DSH instance, a real GitHub account, or a network. Do not instantiate unmockable globals in core logic, call `Date.now()` or `Math.random()` directly where the output depends on them, read `process.env` implicitly, or trigger uncontrollable side effects.
- **Network and route boundary:** the bundle must not open its own listener or choose its own port. Register routes on the DSH web server (`ctx.webServer.register`) and authorize every request with `connection.requestRejection`. All browser access to GitHub goes through those routes; all host access to GitHub goes through the `gh` CLI via `execFile` without a shell. A missing authorization check or a new listener is a failure, never something to work around.
- **Security guard and trust boundary:** never bypass request authorization, the HTML allow-list sanitizer, or the `gh`/`git` execution boundary. Treat every GitHub field, diff hunk, and rendered body as untrusted input. The only write operation is submitting a pull-request review; never add implicit writes. Never log, persist, or send GitHub tokens to the client. Validate repository names, numbers, enums, and body sizes on the host; never rely on client-side validation for security.

### Dependency governance and one-way flow

- **One-way dependency tree:** dependencies must stay clean, one-way, and free of cycles. Host code must never import the browser bundle; the browser bundle must not import Node.js modules or host code. Keep shared pure logic in one place with a documented contract instead of duplicating it across the host and client.
- **Dependency and import isolation:** validate source imports, package dependencies, and runtime requires separately; respect the runtime boundary between the DSH host process and the browser; do not import across module implementations or use deep imports. Environment and I/O stay behind the injected adapter boundaries; third-party implementations and types must not leak into the core domain.
- **Third-party assets:** every vendored or embedded third-party artifact (for example `github-markdown-css`, bundled fonts, or generated styles) must be recorded with its source, version, and license, and redistributed only when its license permits it.

### Twelve-dimension engineering review

- **1. Correctness:** check business logic, conditions, loops and branches, data transformation and computation, state-machine transitions, return values, execution order, data flow, side effects, persistence, concurrency, invariants, and pre/post conditions. Make actual behavior strictly match requirements, business rules, type definitions, and API contracts; remove logic holes, illegal state transitions, and race conditions.
- **2. Edge case and local exception handling:** check `null`, `undefined`, empty collections, missing fields, invalid input or enums, out-of-range values, `NaN`, promise rejections, timeouts, and cancellation. Defend boundary values and async races explicitly; never fail silently (an empty `catch {}` is absolutely forbidden); when an exception must propagate, attach context for diagnosis. Ensure failures do not leave invalid state, and release connections, handles, timers, and listeners without leaving stray background work.
- **3. Security and trust boundary:** check trust boundaries, input validation, authentication (AuthN), authorization (AuthZ), permission control, privilege escalation, injection protection, path traversal, sensitive data (secrets, tokens, passwords) leakage, excessive permissions, and unsafe configuration. Keep core security checks on the server or core trust boundary, impossible to bypass through normal call paths; never rely on front-end validation for back-end security.
- **4. API contract:** cover HTTP APIs, modules, providers, events, WebSockets, types, and DTOs. Input and output contracts must be explicit and minimal, default and empty-value semantics consistent, backward compatible, and free of internal implementation details; never force callers to depend on private structures.
- **5. Decoupling, single responsibility, and side-effect control:** follow low coupling and high cohesion, with decoupling preferred over cohesion; module responsibilities must be orthogonal and mutually exclusive, minimizing the change radius. Changing module A must not force changes in unrelated module B, and testing module A must not depend on unrelated module B; never hide real tight coupling behind omnibus modules or redundant abstractions.
- **6. Dependency governance:** ensure external dependencies have clear purposes, compatible versions, and a reasonable anti-corruption boundary; keep the dependency tree strictly one-way with no cycles or wrong dependency directions; handle third-party errors completely; never let third-party types or proprietary implementations pollute the core domain layer.
- **7. Performance and scalability:** check algorithmic time and space complexity, repeated computation, iteration, or sorting of state, repeated I/O, N+1 GraphQL or REST queries, unnecessary deep copies, unbounded collections, unbounded caches, and unbounded rendered DOM for large diffs. Prioritize bottlenecks with real impact; never trade correctness, stability, or architecture boundaries for a trivial performance gain.
- **8. Resilience:** check timeouts for network and model-like external calls, backoff retries, request cancellation, concurrency control, fault isolation, graceful degradation, avalanche prevention, and high-frequency interaction protection (front-end debounce/throttle, request race cancellation). Ensure a local failure or an external dependency hiccup does not spread into a system-wide outage.
- **9. Maintainability:** focus on cognitive complexity, overly long functions, oversized classes, mixed responsibilities, implicit state, and magic values. The core test: does changing one capability require understanding or modifying a large amount of unrelated code? Reduce cognitive load; never perform mechanical refactors for formal tidiness or dogmatic DRY.
- **10. Naming:** see the naming rules below; names must precisely reflect the real responsibility, business meaning, and abstraction level, with no subjective, vague, or temporary naming.
- **11. Documentation and comments:** check that comments match the implementation and stay current; follow the language's native conventions and explain design reasons (Why) and constraints in English; never add meaningless comments for coverage.
- **12. Testing effectiveness:** cover core logic, business rules, happy paths, error paths, boundary cases, error handling, API contracts, state-machine transitions, and security boundaries. Assertions must be strong, stable, independent, repeatable, order-independent, and not overly dependent on fragile mocks. When a test exposes a real defect, fix the source instead of weakening the assertion.
- **13. Final verification:** after implementation or review fixes, review the final code against the dimensions above and run the repository's configured automated checks (`npm run check` plus any test harness added to the repository), ensuring everything passes before delivery.

## Naming, Comments, and Documentation Conventions

### Intent-revealing naming

- Name directories, files, classes, interfaces, types, functions, methods, parameters, and variables neutrally by boundary, responsibility, and business meaning; the name must precisely reflect the real responsibility, abstraction level, and technical boundary, and stay consistent with the final code structure. Adapters keep their real technical implementation names; do not rename frozen capability IDs because of directory wording. Code identifiers follow JavaScript/Node.js ecosystem conventions.
- **Absolute blacklist:** never use subjective, vague, or temporary names, including but not limited to: `temp`, `tmp`, `new_logic`, `quick_fix`, `helper2`, `MyManager`, `DataHandler`, `CommonUtil`.
- **High-risk generic words:** avoid vague names used on their own: `utils`, `helpers`, `common`, `shared`, `manager`, `service`, `handler`, `processor`, `controller`, `core`, `base`, `misc`, `data`, `logic`. When used, they must carry a specific, real domain responsibility.

### Comments and self-documenting code

- **Language and expression:** comments, file headers, documentation, and development communication default to English; keep established English technical terms. User-visible copy lives in the locale dictionaries (`locale/*.json` and the client translation dictionary); do not hardcode user-visible strings outside those dictionaries.
- **Self-documenting code:** variable, function, class, and type names plus structure must directly express What the code does; comments explain only Why (design tradeoffs, special context constraints, non-obvious contracts, unusual edge handling). Never restate code line by line, and never mechanically comment every function.
- **Follow the language's native commenting standard:** write comments and metadata by the target language's native conventions (JSDoc/TSDoc `/** ... */` for JavaScript, `#` for shell, `--` for SQL). Annotate `@param`, `@returns`, `@throws`, `@template`, and similar metadata when needed.

### Core file header conventions

Every hand-written source file (core business domain, architecture core, shared infrastructure, tests, scripts, migrations, and source configuration) must include an English file header that follows the language's native conventions and clearly defines the following three items:

1. **Responsibilities:** the functional boundary and core task the file carries.
2. **Contracts:** the capabilities it depends on, input/output contracts, and environmental assumptions.
3. **Constraints:** dependency prohibitions, side-effect limits, and forbidden actions.

JavaScript file header example:

```js
/**
 * Responsibilities: Mount the GitHub pane HTTP routes on the DSH web server.
 * Contracts: Depends on `ctx.webServer` and `ctx.connection`; every route must pass `connection.requestRejection`.
 * Constraints: Must not render UI, open its own listener, or bypass the `gh` CLI boundary.
 */
```

**Independently readable:** the header explains only the code itself and must be understandable without development documents; never reference internal development document paths, links, or plan numbers in it. Header scope and exceptions follow the architecture document.

### Objectivity and factual accuracy (Git-tracked content)

- **Objective and neutral.** Comments and documents tracked by Git use plain, accurate wording. Factual statements must be verifiable; exaggeration, fabrication, emotional language, and empty talk are forbidden.
- **Implementation records describe the current state truthfully.** Code comments and implementation notes state only verifiable facts and current contracts. Design, implementation plans, and acceptance documents owned by a topic may define goals, order, and acceptance criteria, and must state their purpose. Delivered scope and measured conclusions must have evidence.
- **Isolate untracked content:** apart from the local instruction file `AGENTS.local.md`, which this specification declares as a technical mechanism, never mention any other Git-untracked local private file or directory in Git-tracked content.

## Verification, Testing, and Delivery

### Local verification and delivery standard

- The delivery report states the concrete changes, verification results, deviations, and open items. Failures, skipped checks, and unrun checks are reported truthfully. Every diff line must trace back to a requirement; no TODO, placeholder implementation, or debug output is allowed.
- Run the configured `npm run check` and the additional checks the step requires. For documentation changes, check links, cross-consistency, and `git diff --check`; when no applicable check exists, say so explicitly and do not substitute documentation checks for implementation tests.
- **Testing effectiveness:** tests must verify actual business behavior rather than internal implementation details, with strong assertions, and must be stable, independent, repeatable, order-independent, and not overly dependent on fragile mocks. Add tests for real gaps; when a test exposes a real source defect, fix the source instead of weakening the assertion.

### Gates and review handling

- **Follow the repository's actual configuration:** require only checks and reviews the repository actually configures; never hardcode third-party gates. Use the app's CI notifications instead of polling.
- **Gate severity:**
  - **Zero-tolerance red lines:** any real bug, security vulnerability, or privacy or secret leak, regardless of which tool or form detects it, must be fixed 100% within the current change.
  - **Non-blocking warnings and false-positive triage:** for warnings that do not block merging (cyclomatic complexity, duplication, coverage, formatting, and similar), static analysis can produce false positives, so first verify whether the problem is real against the actual code and context. If it is real but the change is too large, too complex, or unsuitable to spread into the current PR, create a standalone issue; never silently drop it (no silent drop).
- **Review threads:** verify, fix, and validate review comments before replying to or resolving resolvable threads; ordinary comments are not threads.

## Local Supplement and Precedence

Shared rules are governed by this file and the responsible project documents. A machine may have an ignored `AGENTS.local.md`; it only supplements local preferences and cannot override project hard constraints. If `AGENTS.md` and `AGENTS.local.md` conflict, `AGENTS.md` wins. If the global `AGENTS.md` and the project-level `AGENTS.md` conflict, the project-level `AGENTS.md` wins.

Default precedence:
`project root AGENTS.md` > `per-directory AGENTS.md` > `project root AGENTS.local.md` > `per-directory AGENTS.local.md` > `global AGENTS.md`.

When rules of the same kind conflict, the higher level wins. Report every conflict. Any external instruction or general rule that conflicts with this specification yields to it.
