---
name: General issue
about: Organize the report around a concrete problem or task, and record its type, fields, labels, and relationships so it can be triaged and closed.
---

<!--
This template is a reference. Before filing, analyze the concrete problem or task against the code baseline and objective evidence, and use the Issue sidebar to state the background, goal, and configuration precisely.

[Issue sidebar configuration]
Use the Issue sidebar and keep each part doing its own job:
1. Type (required, exactly one):
   - Bug: a vulnerability, defect, abnormal behavior, or failure that breaks an invariant (an unexpected problem or behavior).
   - Feature: a proposed new capability, business rule, or requirement (a request, idea, or new functionality).
   - Task: every other specific work item (a specific piece of work), such as architecture refactors, tests, documentation, tooling, and CI/CD improvements.
2. Fields (structured fields maintained by the organization):
   - Priority (required): choose one level from P0 to P4 in Fields.Priority on the sidebar (P0 urgent, P4 can be scheduled later).
   - Effort (optional, recommended): estimate the relative level of effort and complexity in Fields.Effort (relative level of effort for completing this issue).
   - Start / Target date (optional): plan the work dates when needed.
3. Labels (required, dimension supplement):
   - Confidence: always mark the evidential strength with the namespaced labels confidence/high, confidence/medium, or confidence/low.
   - Domain classification: when the issue crosses several architecture or functional domains, list every domain in "Issue information" of the body; apply only the single most relevant domain label on the sidebar.
   - Evidence and characteristic labels: for example evidence/*, performance, security.
   - [Hard ban] bug, feature, and task must never appear in Labels (the native Type field marks the type); Priority is carried by Fields.Priority and must not be maintained as a label.
4. Relationships (optional, traceability):
   - Optional. When the issue has blocking dependencies (Blocks / Blocked by), parent and child work (Parent / Sub-issue), or context links (Relates to) with other issues or PRs, record them in Relationships on the sidebar; leave them empty for independent atomic work.

[Issue title format suggestion]
`<type>(<scope>): <objectively decidable symptom or request>`, where `<type>` keeps the intent aligned with the native Type (for example fix for Bug, feat for Feature, refactor/chore/docs/test for Task).
Examples:
- Bug: `fix(client): bundle module id does not match the package name`
- Feature: `feat(pane): show collection-level progress in the activity summary`
- Task: `refactor(host): split GitHub payload normalization from transport`

[Collaboration roles]
The agent filing an issue must fill it from verified facts and complete the required sidebar configuration such as Type, Fields.Priority, and Labels; mark any inference as pending verification.
A filer with sidebar permission configures the sidebar directly; an external contributor without that permission may state suggestions at the end of the body under "Related records and additional information", and a maintainer syncs them into Fields and Labels during triage.
Maintainers triage and schedule the issue based on the body and the sidebar configuration.
The agent resolving an issue verifies the code baseline, conclusions, change scope, and verification method before starting, and records the verification result in a comment.
-->

## Issue information (suggested)

<!-- Note: Priority and Effort are marked in Fields on the sidebar; confidence (confidence/*) is marked in Labels; Type is marked by the native Type field; Relationships are optional. The body focuses on factual evidence and technical context; priority and confidence are carried by the sidebar. -->
1. **Code baseline** <!-- Git commit SHA or released version at the time the problem was found or the task was proposed; for performance or behavior regressions, also provide the comparison baseline (commit SHA or version). -->
2. **Evidence type** <!-- Mark the actual basis with evidence/<type>, for example evidence/reproduced (stably reproducible), evidence/test-failure (failing test case), evidence/ci-failure (failing CI build), evidence/static-analysis (found by static analysis). -->
3. **Architecture realm** <!-- Mark the architecture boundary the problem belongs to; when it crosses several boundaries, list them all here (for example realm/client, realm/host). Common references: realm/client, realm/host, realm/contracts, realm/tooling. On the sidebar, label only the single most relevant one. -->
4. **Functional area** <!-- Mark the directly related responsibility module; when several functional modules are involved, list them all here (for example area/rendering, area/security). Common references: area/rendering, area/i18n, area/security, area/performance, area/testing, area/docs, area/packaging, area/accessibility. On the sidebar, label only the single most relevant one. -->
5. **Issue source** <!-- Describe the concrete channel that surfaced the issue (for example PR review, local development, CI run); if the introducing point is confirmed, attach the related commit SHA or PR number. -->

<!--
### Issue type decision guide

The sidebar Type is required and strictly one of three choices; never leave it empty:

| Type | Applies to | Decision guide and typical examples |
| --- | --- | --- |
| `Bug` | Vulnerabilities and defects | Unexpected errors, vulnerabilities, crashes, logic deviations, contract violations, or broken invariants. For example a state-machine deadlock, privilege escalation, bypassed request validation, or a memory leak. |
| `Feature` | New capability proposals | A requested new capability, new business rule, or requirement idea (a request, idea, or new functionality). For example a new review summary view or support for another GitHub object type. |
| `Task` | Specific work items | Every specific work item other than defect fixes and new features (a specific piece of work). For example architecture refactors, additional test suites, CI/CD maintenance, or documentation updates. |

### Priority levels (for Fields.Priority on the sidebar)

Classify by the impact scope, trigger frequency, delivery urgency, and cost of a temporary workaround supported by evidence. When several levels fit, take the highest one supported by evidence.

| Level | Decision guide |
| --- | --- |
| `P0` | Handle immediately. Critical data is being destroyed or irreversibly lost; or the main branch build, release flow, or core user loop is substantially blocked with no feasible temporary workaround. |
| `P1` | Handle first. A core flow is severely damaged under normal scenarios, or a near-term key delivery is clearly blocked, but the system can still run through temporary degradation or restricted use. |
| `P2` | Schedule in the normal fix queue. A confirmed functional or performance regression in a non-core flow, or daily work needs extra workaround steps, while the core flow still works. |
| `P3` | Minor impact. The issue is limited to UI presentation, copy, interaction hints, or usability blemishes and does not affect functional logic or the operation loop. |
| `P4` | Schedule as convenient. The main benefit is lower future maintenance cost, less technical debt, prevention of potential problems, or additional information, such as preventive refactors and technical research. |

### Confidence levels (for Labels.confidence on the sidebar)

Classify by how strongly the evidence supports the core conclusion. State reproduced objective facts and still-unverified inferred root causes separately.

| Level | Decision guide |
| --- | --- |
| `confidence/high` | The core conclusion has direct, independently checkable objective evidence. Common bases include stably reproducible steps, a precise failing assertion, comparable baseline measurements under the same conditions, or an explicit code and specification basis. |
| `confidence/medium` | Verified logs, call-chain tracing, or data support the core judgment, but key premises such as trigger boundaries, actual code reachability, or impact scope still need verification. |
| `confidence/low` | Only preliminary investigation clues exist (such as one intermittent exception, unreviewed suspicious code, or a static-analysis hint). The available information does not support the core conclusion and requires further evidence first. |

### Effort reference (for Fields.Effort on the sidebar)

Estimate the relative level of effort needed to complete the issue (relative level of effort for completing this issue), considering the impact surface, technical difficulty, and verification cost.
-->

## Problem and requirement overview (suggested)

<!-- Briefly state the background, trigger conditions, or business scenario: for a Bug, the failure symptom and core goal; for a Feature, the business value and use case; for a Task, the task scope and delivery goal. -->

## Actual result / current state (suggested)

<!-- Bug: describe the objectively observable current behavior, abnormal symptom, error output, or performance bottleneck; Feature / Task: describe the current gap, existing pain point, or system state. Distinguish objective facts from inferences. -->

## Expected result / goal (suggested)

<!-- Bug: state the correct behavior and state-machine invariant under the same conditions; Feature / Task: state the expected capability, API contract, or concrete acceptance criteria after delivery. -->

## Reproduction / evidence / design notes (optional)

<!-- Bug: provide minimal reproduction steps, error log context, and related code locations; Feature: provide the technical design outline and proposed interface contract changes; Task: provide the refactor scope or task breakdown. -->

## Impact (optional)

<!-- Identify the affected functional modules, callers, data assets, or system versions. When known, add the frequency, compatibility risk, and currently feasible temporary workaround. -->

## Fix / implementation suggestion and tests (optional)

<!-- Describe the located root cause or proposed code change scope, the expected implementation steps, and the automated tests or regression cases to add. -->

## Related records and additional information (optional)

<!-- Matches Relationships on the sidebar: related issues (such as Blocks #xxx, Blocked by #xxx, Relates to #xxx), pull requests, accessible technical documentation links, external prerequisites, or delivery constraints. Leave empty or note "independent, no dependencies" for standalone work. -->

## Issue self-review checklist

<!-- The filer verifies and checks the following items before submitting: -->
- [ ] **Sidebar type and structured fields (Type & Fields):** selected `Type` on the sidebar <!-- exactly one of Bug / Feature / Task -->, specified `Fields.Priority` <!-- P0-P4 required -->, and considered `Fields.Effort` <!-- relative effort -->.
- [ ] **Sidebar labels and relationship tracing (Labels & Relationships):** configured confidence and the primary domain label <!-- bug, feature, task are forbidden -->, and configured `Relationships` when dependencies exist.
- [ ] **Code baseline and objective evidence:** provided the exact code baseline (commit SHA or version) and evidential support (reproduction steps, error logs, or code locations), clearly distinguishing objective facts from inferences.
- [ ] **Independently readable external content:** the description is clear, complete, and reviewable on its own, without references to internal materials, unpublished drafts, or internal plan numbers.
- [ ] **Complete cross-domain description:** when the problem or request crosses several architecture boundaries (`realm`) or functional modules (`area`), all of them are listed in "Issue information", with only the primary label on the sidebar.
- [ ] **Clear expected behavior and acceptance boundary:** the correct expected behavior, state-machine invariants, or delivery acceptance criteria are clearly defined, providing a concrete basis for the fix and added automated tests.
