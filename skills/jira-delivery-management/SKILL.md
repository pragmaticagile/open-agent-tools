---
name: jira-delivery-management
description: Use for Jira delivery work across Product Owners, Product Managers, Delivery Leads, Senior Managers, PMO, and Team Members. Helps with project goals, roadmap visibility, backlog health, sprint and daily reports, progress trends, risks, dependencies, capacity, team actions, personal focus, and continuous improvement. Works with any Jira MCP or Jira data export, and works best with jira-plus-mcp.
---

# Jira Delivery Management

Use this skill when a user wants help running day-to-day delivery from Jira: goals, roadmap, backlog, sprint, daily status, team/member focus, delivery risks, dependencies, progress trends, capacity, and improvement actions.

## Unique Value

This is not a raw Jira query helper. It is a delivery operating skill:

- Role-aware: adapts output for Team Members, Product Owners, Product Managers, Delivery Leads, Senior Managers, and PMO.
- Tool-agnostic: works with any Jira MCP, Jira export, pasted issue list, or screenshots/tables when no MCP is available.
- Strongest with `jira-plus-mcp`: uses its health checks, capabilities, sprint/report/risk tools, Plans/Roadmaps handling, and safe generic Jira GET when available.
- Action-first: turns Jira facts into clear decisions, risks, owners, and next actions.
- Visual-reporting by default: uses KPI/RAG scorecards, charts, progress bars, trend views, dependency maps, heatmaps, and action registers before narrative text.
- Permission-aware: if Plans/Roadmaps or admin APIs are blocked, falls back to epics, versions, boards, sprints, labels, priorities, and JQL.
- Improvement-focused: helps teams learn from trends, reduce carryover, unblock faster, split work better, and keep daily focus aligned with goals.

## First Move

1. Identify the user's role and time horizon from the request.
2. Discover available Jira access:
   - Prefer `jira-plus-mcp` tools when present.
   - Otherwise use equivalent Jira MCP tools.
   - If no MCP exists, ask for project key, board/sprint, JQL results, CSV, or pasted issue data.
3. Ask only for missing context that blocks the answer.
4. Produce a concise, decision-ready output that starts with multiple relevant visuals and keeps prose to short decision notes.

## Tool Strategy

With `jira-plus-mcp`, prefer:

- Setup: `get_connection_status`, `list_projects`, `get_project_capabilities`
- Roadmap/goals: `list_epics`, `list_versions`, `list_components`, `list_plans`, `find_plans_for_project`, `jira_api_get`
- Sprint: `list_boards`, `get_current_sprint`, `list_sprints`, `list_sprint_issues`, `get_sprint_summary`, `get_sprint_health`
- Backlog/reporting: `search_issues`, `get_issue`, `create_project_delivery_report`, `identify_delivery_risks`, `list_open_bugs_in_sprint`
- Write mode only when user explicitly asks: create/update/comment/transition tools, and dry-run `create_project_plan` before creating anything.

With other Jira MCPs, map to equivalent abilities: search JQL, get project, get board/sprint, get issue, list comments/transitions, and create/update only after explicit user approval.

## Role Routing

- Team Member: daily focus, assigned work, blockers, aging work, goal alignment, personal improvement trends.
- Product Owner / Product Manager: roadmap, goals, backlog health, refinement gaps, priority risks, release readiness.
- Delivery Lead / Scrum Master: sprint health, blockers, dependencies, capacity, flow, daily action plan.
- Senior Manager: delivery confidence, progress trend, risks, decisions needed, cross-team dependencies.
- PMO: portfolio/status summary, risks, aging, governance gaps, owner/action register.

Read `references/role-playbooks.md` when the role or audience matters.
Read `references/report-patterns.md` when producing a formal report.
Read `references/visual-patterns.md` when choosing charts, tables, scorecards, or diagrams.
Read `references/metrics-and-jql.md` when choosing metrics, JQL, or trend queries.
Read `references/mcp-tool-adapter.md` when Jira MCP tools differ from `jira-plus-mcp`.

## Standard Output Contract

Use this structure unless the user asks for another format:

1. Visual snapshot: dashboard-style KPI/RAG scorecard plus at least one chart, graph, matrix, map, or progress visual suited to the request.
2. Main signal: one sentence with the delivery readout.
3. Risks and gaps: only the top items that need a decision or action.
4. Actions: owner-focused next steps, grouped by team member when useful.
5. Assumptions and gaps: missing permissions, unavailable Plans/Roadmaps, incomplete estimates, or data limits.

Visuals should be practical, not decorative. For substantial reports, include 3-5 visual elements when data supports them: KPI cards/RAG, scope or status chart, trend or capacity chart, risk/dependency matrix, and action register. Prefer rich chart artifacts, images, or diagrams when the client supports them. Fall back to Mermaid, Markdown chart tables, compact bar cells, colored RAG markers, and simple indicators for universal compatibility. Avoid long explanations after visuals; use one-line "what this means" notes. Do not use generic column names like `Visual`; use `Progress`, `Status Mix`, `Risk Level`, `Trend`, `Aging`, `Load`, or another specific label.

## Safety

- Do not create or update Jira items unless the user explicitly asks for write action.
- Prefer dry-run for batch creation.
- Respect the Jira project's existing issue types, workflows, fields, and hierarchy.
- Never recommend changing Jira settings as the first answer; adapt to what the project already uses.
- Do not expose tokens, account IDs, personal data, or raw dumps unless necessary for the requested work.
