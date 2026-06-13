# Jira Delivery Management Skill

This guide helps users run the Jira Delivery Management skill across different AI clients.

The canonical skill lives here:

```text
skills/jira-delivery-management/
```

It is designed as an Agent Skills-style package with:

- `SKILL.md`
- `references/`
- `agents/openai.yaml`

## Visual Reporting Promise

The skill is designed for dashboard-style Jira reporting, not long text summaries. For PMO, sprint, roadmap, backlog, daily, and team reports it should use multiple visuals where the client supports them:

- KPI/RAG scorecards
- Progress and completion charts
- Scope, status, priority, owner, and aging distributions
- Risk heatmaps
- Dependency maps
- Capacity vs completed work charts
- Action and decision registers

When rich chart or image rendering is not available, the skill falls back to portable Markdown chart tables, colored RAG markers, colored progress blocks, and Mermaid diagrams where supported. If a client strips color, the report still includes clear text labels such as Red, Amber, and Green.

## Compatibility Promise

The skill is intentionally tool-agnostic:

- Works best with `jira-plus-mcp`.
- Works with other Jira MCP servers when they provide equivalent Jira project, issue, JQL, sprint, or board tools.
- Works without an MCP when the user provides Jira CSV, exported reports, pasted issue data, or screenshots/tables.

Different AI clients load reusable instructions differently. Use the matching setup below.

## Codex

Use the skill folder directly:

```text
skills/jira-delivery-management/
```

Example prompt:

```text
Use $jira-delivery-management to create a sprint health report with risks and team actions.
```

Recommended with:

```text
mcp-servers/jira-plus-mcp
```

## Claude

Claude Skills-compatible clients can use the same skill folder as a skill package. If your Claude plan or client supports custom skills, package or import:

```text
skills/jira-delivery-management/
```

Example prompt:

```text
Use the Jira Delivery Management skill with jira_plus to summarize today’s sprint risks and team actions.
```

If custom skills are not available in your Claude plan, paste the contents of `SKILL.md` into Claude project instructions and keep the `references/` files nearby as project knowledge.

## Cursor

Cursor users can use the skill as project rules. Create a rule such as:

```text
.cursor/rules/jira-delivery-management.mdc
```

Copy this short adapter:

```markdown
---
description: Jira delivery management reports, risks, roadmap, sprint health, daily focus, and team actions.
alwaysApply: false
---

Use the repository skill at `skills/jira-delivery-management/SKILL.md`.

When users ask for Jira roadmap, backlog, sprint, daily report, risk, dependency, capacity, team member focus, or delivery improvement work:

1. Follow `skills/jira-delivery-management/SKILL.md`.
2. Load only the needed files from `skills/jira-delivery-management/references/`.
3. Use available Jira MCP tools when configured.
4. If no Jira MCP is available, ask for project key, JQL result, CSV, or pasted issue data.
5. Do not write to Jira unless the user explicitly asks.
```

## VS Code / GitHub Copilot

For GitHub Copilot custom instructions, add a repository instruction file such as:

```text
.github/copilot-instructions.md
```

Copy this short adapter:

```markdown
When the user asks for Jira delivery management, use `skills/jira-delivery-management/SKILL.md` as the operating guide.

Support Product Owners, Product Managers, Delivery Leads, Senior Managers, PMO, and Team Members with Jira roadmap, backlog, sprint, daily reports, risks, dependencies, capacity, personal focus, and continuous improvement.

Prefer Jira MCP tools when available. If `jira-plus-mcp` is available, use its connection, project capability, board, sprint, issue search, report, risk, Plans/Roadmaps, and safe GET tools. If another Jira MCP is available, map by capability. If no MCP is available, ask for Jira export, JQL result, or pasted issue data.

Keep output visual-first and action-first: KPI/RAG, charts, risks, actions, trends/learnings, assumptions/gaps. Do not write to Jira unless explicitly asked.
```

## Other MCP Clients

Use the skill as a reusable system/project instruction:

```text
Read and follow skills/jira-delivery-management/SKILL.md for Jira delivery requests.
```

Then connect any Jira MCP. The skill does not require exact tool names; it maps to capabilities such as:

- list projects
- run JQL/search issues
- get issue
- list boards/sprints
- list sprint issues
- read comments/transitions
- create/update only after explicit user approval

## Recommended First Test

Ask:

```text
Use Jira Delivery Management to create a daily delivery brief for PROJECT_KEY. Include risks, blockers, and team actions.
```

Then ask:

```text
Use Jira Delivery Management to create a team member focus report for my assigned Jira work.
```

Expected result:

- The assistant identifies available Jira access.
- It asks only for missing project/board/sprint context.
- It returns a focused visual report, not a raw Jira dump.
- It separates facts, risks, actions, and assumptions.

## Example Visual Prompts

```text
Use jira-delivery-management with jira_plus to create a PMO dashboard for project PROJECT_KEY. Include KPI cards, RAG status, scope/status charts, risk heatmap, dependency map, aging chart, missing-owner view, and action register.
```

```text
Use jira-delivery-management with jira_plus to create a sprint health dashboard. Include completed-vs-remaining chart, blocker/bug chart, carryover risk matrix, owner action board, and data gaps.
```

```text
Use jira-delivery-management with jira_plus to create a team capacity dashboard. Include capacity vs completed work by member, net difference, incomplete work, blockers, and next actions.
```
