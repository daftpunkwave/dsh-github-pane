<!--
This PR template is a reference. Water takes no fixed shape: organize the sections around the actual code change and add, remove, or adjust sections as needed.

PR titles should follow Conventional Commits and summarize the change with a verb-led, concrete capability:
for example `fix(client): register the bundle under the package name` or `feat(pane): collapse resolved review threads by default`.
Common types: feat | fix | docs | refactor | perf | test | style | build | ci | chore | revert.

The core content should cover at least: what changed (What), why (Why), tests and verification, and compatibility notes (add how (How) for complex implementations), so the change is independently readable and focused on the code and diff.
The PR sidebar has no specific requirements; make good use of PR labels and apply at least one label that expresses the primary task (for example the core realm/*, area/* domain, or the nature of the change).
-->

## Related issue / PR / discussion (optional, multiple allowed)

<!-- Link the issues this PR fixes or relates to, prior PRs, or discussions. Multiple links are allowed (for example: Fixes #123, Relates to #100, #200). Leave empty or delete this section when there is no related item. -->

## What changed (suggested)

<!-- Briefly summarize the business scenario and core delivery goal of this PR, and state what actually changed. -->

## Why (suggested)

<!-- Explain why the change is needed. Describe the defect, edge-case hole, performance bottleneck, missing capability, or architecture technical debt in the existing implementation. -->

## How (optional)

<!-- Focus on the code and diff perspective: describe the technical approach, the core modules, functions, or type contracts changed, and the key design tradeoffs. Leave empty or omit for small, obvious changes. -->

## Tests and verification (suggested)

<!-- Record the local test cases, automated scripts, or manual review steps and give checkable objective results (for example commands run, passing test counts, gate status). -->

## Compatibility and impact (suggested)

<!-- Per repository conventions, a PR must state its compatibility impact. Explain whether there are breaking changes, public API or contract changes, state migrations, or runtime dependency effects; when there is no breaking impact, state it explicitly (for example "No breaking changes" with the reason). -->

## Notes for the reviewer (optional)

<!-- Point the reviewer at the core modules, non-obvious design decisions, special context constraints, complex branches, or known items to iterate on later. -->

## PR self-review checklist (optional, authors may adjust)

<!-- For the PR author to check before submitting. The items below are generic references; check, add, remove, or replace them according to the actual change: -->
- [ ] **Clean code and self-review:** reviewed the local diff and removed all temporary debug code (such as `console.log`, `debugger`), obsolete comments, and unused TODOs.
- [ ] **Local verification passed:** ran the applicable tests and code gates locally (such as `npm run check` and the repository test harness) with no errors.
- [ ] **Independently readable:** the title and body focus on the code itself, explain the background and implementation clearly, and do not reference internal plan numbers or speculative filler.
- [ ] **Boundary and contract guards:** existing module responsibilities and one-way dependencies are intact, and core security and rule checks remain on the core trust boundary.

## Additional information (optional)

<!-- Add external technical documentation, design drafts, references, blog posts, prerequisites, or delivery constraints. -->
