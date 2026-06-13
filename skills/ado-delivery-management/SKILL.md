---
name: ado-delivery-management
description: Use for Azure DevOps delivery work across Product Owners, Product Managers, Delivery Leads, Senior Managers, PMO, and Team Members. Helps with project goals, Delivery Plans, backlog health, sprint and daily reports, yesterday/team work reports, capacity vs completed work, bugs, risks, dependencies, long-aging items, repos, pipelines, test plans, dashboards, team actions, personal focus, and continuous improvement. Works with any Azure DevOps MCP or ADO export, and works best with ado-plus-mcp.
---

# ADO Delivery Management

Use this skill when a user wants help running day-to-day delivery from Azure DevOps: goals, Delivery Plans, backlog, sprint, daily status, yesterday/team work reports, team/member focus, delivery risks, dependencies, long-aging items, repos, pipelines, test plans, dashboards, capacity, and improvement actions.

## Unique Value

This is not a raw Azure DevOps query helper. It is a delivery operating skill:

- Turns Azure DevOps data into meeting-ready reports, not raw work item dumps.
- Helps teams see daily progress, blocked work, quality risk, capacity gaps, and owner actions in one place.
- Helps leaders trust the report because it separates facts, risks, assumptions, missing data, and recommended next actions.
- Role-aware: adapt output for Team Members, Product Owners, Product Managers, Delivery Leads, Senior Managers, and PMO.
- Tool-agnostic: work with any Azure DevOps MCP, Azure DevOps export, pasted work item list, dashboard screenshot, or table when no MCP is available.
- Strongest with `ado-plus-mcp`: use its project, team, work item, sprint, bug, capacity, Delivery Plan, repo, pipeline, test plan, dashboard, sprint report, and risk tools.
- Action-first: turn ADO facts into clear decisions, risks, owners, and next actions.
- Dashboard-grade visuals by default: create KPI/RAG cards, colored charts, progress bars, risk matrices, capacity charts, dependency maps, and action registers before narrative text.
- Presentation-quality by default: sort rows intentionally, use stable business headers, color-code every RAG signal, and prefer horizontal bar charts for readable names.
- Permission-aware: if Delivery Plans, dashboards, Analytics, or capacity APIs are blocked, fall back to work items, iterations, teams, WIQL/search, repos, pipelines, and test plan summaries.
- Improvement-focused: help teams reduce carryover, unblock faster, split work better, clarify ownership, improve estimates, and keep daily focus aligned with delivery goals.

## First Move

1. Identify the user's role and time horizon from the request.
2. Discover available Azure DevOps access:
   - Prefer `ado-plus-mcp` tools when present.
   - Otherwise use equivalent Azure DevOps MCP tools.
   - If no MCP exists, ask for project, team, sprint/iteration, Delivery Plan name, WIQL results, CSV, or pasted work item data.
3. Ask only for missing context that blocks the answer.
4. Produce a concise, decision-ready output that starts with a rendered visual dashboard when the client supports charts, cards, artifacts, images, or dashboards. Use prose only as a short backup.

## Tool Strategy

With `ado-plus-mcp`, prefer:

- Setup: `list_projects`, `list_project_teams`
- Boards/work items: `search_work_items`, `get_work_item`
- Sprint: `list_current_sprint`, `list_sprint_work_items`, `list_sprint_bugs`, `list_open_bugs_in_sprint`, `get_sprint_health`, `create_sprint_summary_report`
- Capacity: `get_team_capacity`, `get_team_capacity_summary`, `compare_sprint_capacity_to_completed_work`
- Delivery Plans: `list_delivery_plans`, `get_delivery_plan_timeline`, `list_delivery_plan_epics`, `get_delivery_plan_summary`, `create_delivery_plan_report`, `identify_delivery_risks`
- Repos/pipelines/tests/dashboards: `list_repositories`, `get_repository_file`, `list_pipelines`, `list_pipeline_runs`, `list_test_plans`, `list_test_suites`, `list_test_cases`, `list_dashboards`, `get_dashboard_widgets`

With other Azure DevOps MCPs, map to equivalent abilities: list projects/teams, search work items or run WIQL, get work item, list current iteration/sprint, list capacity, list Delivery Plans, list repos/pipelines/tests/dashboards.

## Role Routing

- Team Member: daily focus, assigned work, blockers, aging work, goal alignment, what to update today, and personal improvement trends.
- Product Owner / Product Manager: roadmap/Delivery Plan visibility, backlog health, refinement gaps, value risks, release readiness, and product decisions needed.
- Delivery Lead / Scrum Master: sprint health, blockers, dependencies, capacity, bug risk, flow, and daily action plan.
- Senior Manager: delivery confidence, progress signal, delivery risks, decisions needed, date/target risks, and cross-team dependencies.
- PMO: portfolio/status summary, Delivery Plan status, risks, aging, governance gaps, owner/action register, and reporting caveats.

Read `references/role-playbooks.md` when the role or audience matters.
Read `references/report-patterns.md` when producing a formal report.
Read `references/visual-patterns.md` when choosing charts, tables, scorecards, or diagrams.
Read `references/metrics-and-wiql.md` when choosing metrics, WIQL, or work item queries.
Read `references/mcp-tool-adapter.md` when Azure DevOps MCP tools differ from `ado-plus-mcp`.

## Common User Requests

Offer or support these workflows when useful:

- Daily delivery brief.
- Yesterday team work report.
- Capacity vs completed work report.
- Sprint health dashboard.
- Open bug and quality report.
- Long-aging work item report.
- Risk and dependency report.
- Backlog hygiene report.
- Delivery Plan confidence report.
- PMO status dashboard.
- Pipeline, test, and dashboard readiness report.
- Team member focus report.
- Owner action register.

## Standard Output Contract

Use this structure unless the user asks for another format:

1. Visual snapshot: dashboard-style KPI/RAG scorecard plus at least one chart, graph, matrix, map, or progress visual suited to the request.
2. Main signal: one sentence with the delivery readout.
3. Risks and gaps: only the top items that need a decision or action.
4. Actions: owner-focused next steps, grouped by team member when useful.
5. Assumptions and gaps: missing permissions, unavailable Delivery Plans/dashboards/capacity, incomplete estimates, or data limits.

Visuals should be practical, not decorative. For substantial reports, include 3-5 visual elements when data supports them: KPI cards/RAG, scope or status chart, trend or capacity chart, risk/dependency matrix, and action register. Prefer rich chart artifacts, images, dashboards, or diagrams when the client supports them. Fall back to Mermaid, Markdown chart tables, compact bars, RAG labels, and simple indicators for universal compatibility.

Do not use generic column names like `Visual`; use `Progress`, `Status Mix`, `Risk Level`, `Trend`, `Aging`, `Load`, `Capacity Delta`, or another specific label.

## Presentation Quality Rules

Apply these rules to every report, dashboard, chart, and table:

- Sort data by the natural business question, not by API return order.
- Team/member views: sort by team member name unless the user asks for ranking; when ranking, make that explicit in the title.
- Risk views: sort Red before Amber before Green, then highest impact, highest likelihood, oldest/most urgent date.
- Target-date views: sort by earliest target date first; put overdue items before future dates; put missing target dates in a separate warning group.
- Aging views: sort by oldest or highest age first.
- Backlog/readiness gaps: sort missing owner, missing estimate, blocked, overdue, and stale items before lower-priority gaps.
- Pipeline/test views: sort failed or blocked results first, then most recent run/date.
- Action registers: sort by priority/risk first, then due date, then owner name.
- Use stable headers across repeated reports so users can compare outputs over time.
- Use clear headers such as `Team Member`, `Owner`, `Item ID`, `Title`, `Type`, `State`, `Sprint`, `Target Date`, `RAG`, `Risk Level`, `Next Action`, and `Evidence`.
- Every RAG value must include color when the client supports it and a text label always: Green, Amber, Red, or Info.
- For bar charts, default to horizontal bars unless a time-series trend requires a line chart or vertical time axis.
- Use one concise interpretation sentence under each major visual.

## Visual Artifact Rule

Do not stop at plain text or simple tables for sprint, daily, PMO, Delivery Plan, capacity, risk, dashboard, or team reports when artifact or chart rendering is available.

When the client supports visual artifacts, create a dashboard/report artifact first with:

- Header: report title, project/team/sprint/date context.
- KPI cards: 4-6 cards with large numbers, subtitles, and RAG status.
- Primary chart: horizontal bar, stacked bar, heatmap, timeline, or trend chart.
- Color legend: Green/Amber/Red/Info with text labels.
- Detail table: compact rows with colored RAG badges and linked item IDs when available.
- Action register: owner, action, item IDs, due/target date, risk removed.

In Codex or another client with chart/dashboard widgets, use those widgets. In clients without artifact rendering, use portable Markdown with colored RAG labels and chart-style tables. If the output is only prose plus a normal table, treat it as incomplete and revise it.

## Safety

- Treat `ado-plus-mcp` as read-only. Do not claim it can write to Azure DevOps.
- Never expose PATs, token file paths, private organization names, project names, team names, repo names, sprint names, work item IDs, or user-specific data unless the user supplied them for the current private task.
- In public examples, use placeholders such as `YOUR_ORGANIZATION_NAME_HERE`, `YOUR_PROJECT_NAME_HERE`, `YOUR_TEAM_NAME_HERE`, `YOUR_DELIVERY_PLAN_NAME_HERE`, and `YOUR_WORK_ITEM_ID_HERE`.
- Respect the Azure DevOps project's existing process, work item types, states, teams, iterations, dashboards, and Delivery Plans.
- Do not recommend changing Azure DevOps settings as the first answer; adapt to what the project already uses.
