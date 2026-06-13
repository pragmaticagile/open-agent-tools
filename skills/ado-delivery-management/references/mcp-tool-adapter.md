# MCP Tool Adapter

Use this when the available Azure DevOps MCP is not `ado-plus-mcp`.

## Discovery

First determine what tools exist:

- connection or auth status
- list projects
- list teams
- search work items or run WIQL
- get work item
- list current iteration/sprint
- list sprint work items
- list bugs
- read capacity
- list Delivery Plans or roadmap data
- list repos, pipelines/builds, test plans, dashboards

If tool names differ, map by capability, not by exact name.

## Minimum Capability Sets

### Basic Reports

Need:

- work item search, WIQL, or issue/work item list
- fields: ID, title, work item type, state, assigned to, priority/severity, iteration, area, changed/created date

Can produce:

- backlog health
- daily brief
- risk list
- owner actions

### Sprint Reports

Need:

- current sprint/iteration or sprint work item list
- item state and owner

Helpful:

- completed work, remaining work, story points, effort, tags, bugs, blockers, capacity

Can produce:

- sprint health
- remaining work
- blocker/action list
- bug risk
- capacity visibility

### Delivery Plan / Roadmap Reports

Need one or more:

- Delivery Plan timeline
- epics/features
- target dates
- area/iteration paths
- tags
- parent/child hierarchy

Can produce:

- Delivery Plan confidence
- goal alignment
- target-date risk
- roadmap risk

### Team Member Focus

Need:

- assigned work items for the person
- state, priority/severity, iteration, changed date, blocker/link fields when available

Can produce:

- daily focus
- personal trend observations
- improvement actions

### Engineering Readiness

Need one or more:

- repo list
- pipeline list and recent runs
- test plans/suites/cases
- dashboards/widgets

Can produce:

- engineering readiness summary
- release/test/pipeline risk
- missing visibility warnings

## When Data Is Missing

Say what is missing and continue with the best available fallback.

Examples:

- If Delivery Plans are blocked, use epics, features, tags, area paths, iterations, and target dates.
- If estimates are missing, use item counts and status movement.
- If capacity is unavailable, label capacity confidence as low and use owner load as a proxy.
- If dashboard APIs are unavailable, ask for dashboard screenshots or use work item/pipeline/test data.
- If user identity is unknown, ask for display name or email text accepted by the MCP.

## Write Actions

Do not write by default. `ado-plus-mcp` is read-only. If another MCP has write tools:

1. Confirm the intended change.
2. Prefer a dry run when available.
3. Use exact work item IDs and field values.
4. Report what changed.
5. Never infer destructive changes from vague wording.
