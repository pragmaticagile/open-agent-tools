# MCP Tool Adapter

Use this when the available Jira MCP is not `jira-plus-mcp`.

## Discovery

First determine what tools exist:

- connection or auth status
- list projects
- search issues or run JQL
- get issue
- list boards
- list sprints
- list sprint issues
- list comments
- list transitions
- create or update issue

If tool names differ, map by capability, not by exact name.

## Minimum Capability Sets

### Basic Reports

Need:

- JQL search or issue list
- issue fields: key, summary, type, status, assignee, priority, updated, created

Can produce:

- backlog health
- daily brief
- risk list
- owner actions

### Sprint Reports

Need:

- active sprint or sprint issue list
- issue status and owner

Can produce:

- sprint health
- remaining work
- blocker/action list

### Roadmap Reports

Need one or more:

- epics
- versions/releases
- components
- labels
- parent links
- Plans/Roadmaps when available

Can produce:

- roadmap confidence
- goal alignment
- release risk

### Team Member Focus

Need:

- assigned issues for the person
- status, priority, updated date, blocker/link fields when available

Can produce:

- daily focus
- personal trend observations
- improvement actions

## When Data Is Missing

Say what is missing and continue with the best available fallback.

Examples:

- If Plans are blocked, use epics, versions, labels, and sprint goals.
- If estimates are missing, use item counts and status movement.
- If board/sprint tools are missing, use JQL with sprint fields or ask for sprint name.
- If user identity is unknown, ask for display name, account ID, or email text accepted by the MCP.

## Write Actions

Do not write by default. For any MCP:

1. Confirm the intended change.
2. Prefer a dry run when available.
3. Use exact Jira keys and field values.
4. Report what changed.

