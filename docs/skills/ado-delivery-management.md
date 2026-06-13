# ADO Delivery Management Skill

This guide helps users run the ADO Delivery Management skill across different AI clients.

The canonical skill lives here:

```text
skills/ado-delivery-management/
```

It is designed as an Agent Skills-style package with:

- `SKILL.md`
- `references/`
- `agents/openai.yaml`

## Dashboard-Grade Visual Reporting Promise

The skill is designed for dashboard-style Azure DevOps reporting, not long text summaries. For PMO, sprint, Delivery Plan, backlog, daily, capacity, engineering readiness, and team reports it should create rendered dashboards where the client supports artifacts, charts, cards, images, or report views.

Expected visual output:

- KPI/RAG scorecards
- Progress and completion charts
- Scope, state, priority, owner, and aging distributions
- Bug and blocker charts
- Capacity vs completed work charts
- Delivery Plan risk tables
- Pipeline/test/dashboard readiness views
- Risk heatmaps
- Dependency maps
- Action and decision registers

For daily capacity and completed-work reports, the expected shape is a dashboard with a title band, context cards, large KPI cards, a horizontal completed-work/utilization chart, a color legend, and a per-member breakdown with RAG badges.

The skill also applies report-quality standards automatically:

- Team/member reports sort by team member name unless the user asks for a ranking.
- Risk reports sort highest-risk items first.
- Target-date reports show overdue and earliest target dates first, with missing dates called out separately.
- Aging reports show oldest items first.
- RAG status is color-coded where supported and always includes the text label: Green, Amber, Red, or Info.
- Bar charts use horizontal bars by default so names and labels stay readable.
- Reports use stable headers such as `Team Member`, `Owner`, `Item ID`, `State`, `Target Date`, `Risk Level`, `RAG`, `Evidence`, and `Next Action`.

When rich chart or image rendering is not available, the skill falls back to portable Markdown chart tables, RAG labels, compact progress bars, and Mermaid diagrams where supported. If a client strips color, the report still includes clear text labels such as Red, Amber, and Green. Plain prose plus a normal table should be treated as incomplete for substantial reports.

## Unique Value

This skill is not just a list of Azure DevOps commands. It helps teams turn Azure DevOps data into daily delivery decisions.

The value for users:

- Delivery Leads can run daily reviews faster with visual sprint, bug, blocker, capacity, and action reports.
- Product Owners and Product Managers can see backlog health, Delivery Plan confidence, missing dates, missing owners, and priority risks.
- PMO and Senior Managers can get concise status reports with RAG, risks, decisions needed, and evidence from Azure DevOps.
- Team Members can get a focused view of assigned work, blockers, aging items, and what to update today.
- Teams can reduce manual report preparation by turning Azure DevOps data into repeatable dashboards and action registers.

It is built for common working questions:

- What did the team complete yesterday, and who had no completed items or was off?
- Which bugs, blocked items, stale items, missing owners, and missing estimates need attention today?
- Is the current sprint healthy enough to trust?
- Are Delivery Plan items missing owners, target dates, or showing date risk?
- What should a Product Owner, Delivery Lead, Senior Manager, PMO, or Team Member do next?

The matching `ado-plus-mcp` server supplies the read-only Azure DevOps access. This skill adds the operating model: role-aware reports, visual-first summaries, risk interpretation, and owner-focused next actions.

## What Users Can Ask For

Common reports and workflows:

- Daily delivery brief
- Yesterday team work report
- Capacity vs completed work report
- Sprint health dashboard
- Open bug and quality report
- Long-aging work item report
- Risk and dependency report
- Backlog hygiene report
- Delivery Plan confidence report
- PMO status dashboard
- Pipeline, test, and dashboard readiness report
- Team member focus report
- Owner action register

The skill is designed to turn Azure DevOps data into a useful working view: what changed, what is at risk, who owns the next action, and what needs attention today.

## Compatibility Promise

The skill is intentionally tool-agnostic:

- Works best with `ado-plus-mcp`.
- Works with other Azure DevOps MCP servers when they provide equivalent project, team, work item, sprint, capacity, Delivery Plan, repo, pipeline, test, or dashboard tools.
- Works without an MCP when the user provides Azure DevOps CSV, exported reports, pasted work item data, dashboard screenshots, or tables.

Different AI clients load reusable instructions differently. Use the matching setup below.

## Codex

Use the skill folder directly:

```text
skills/ado-delivery-management/
```

Example prompt:

```text
Use $ado-delivery-management to create a sprint health report with risks and team actions.
```

Recommended with:

```text
mcp-servers/ado-plus-mcp
```

## Claude

Claude Skills-compatible clients can use the same skill folder as a skill package. If your Claude plan or client supports custom skills, package or import:

```text
skills/ado-delivery-management/
```

Example prompt:

```text
Use the ADO Delivery Management skill with ado_plus to summarize today's sprint risks and team actions.
```

If custom skills are not available in your Claude plan, paste the contents of `SKILL.md` into Claude project instructions and keep the `references/` files nearby as project knowledge.

## Cursor

Cursor users can use the skill as project rules. Create a rule such as:

```text
.cursor/rules/ado-delivery-management.mdc
```

Copy this short adapter:

```markdown
---
description: Azure DevOps delivery management reports, risks, Delivery Plans, sprint health, daily focus, capacity, engineering readiness, and team actions.
alwaysApply: false
---

Use the repository skill at `skills/ado-delivery-management/SKILL.md`.

When users ask for Azure DevOps roadmap, Delivery Plan, backlog, sprint, daily report, risk, dependency, capacity, repo, pipeline, test plan, dashboard, team member focus, or delivery improvement work:

1. Follow `skills/ado-delivery-management/SKILL.md`.
2. Load only the needed files from `skills/ado-delivery-management/references/`.
3. Use available Azure DevOps MCP tools when configured.
4. If no Azure DevOps MCP is available, ask for project, team, sprint/iteration, WIQL result, CSV, pasted work item data, or screenshots.
5. Treat `ado-plus-mcp` as read-only.
```

## VS Code / GitHub Copilot

For GitHub Copilot custom instructions, add a repository instruction file such as:

```text
.github/copilot-instructions.md
```

Copy this short adapter:

```markdown
When the user asks for Azure DevOps delivery management, use `skills/ado-delivery-management/SKILL.md` as the operating guide.

Support Product Owners, Product Managers, Delivery Leads, Senior Managers, PMO, and Team Members with Azure DevOps Delivery Plans, backlog, sprint, daily reports, bugs, risks, dependencies, capacity, personal focus, repo/pipeline/test/dashboard readiness, and continuous improvement.

Prefer Azure DevOps MCP tools when available. If `ado-plus-mcp` is available, use its project, team, work item, sprint, bug, capacity, Delivery Plan, repo, pipeline, test plan, dashboard, report, and risk tools. If another Azure DevOps MCP is available, map by capability. If no MCP is available, ask for Azure DevOps export, WIQL result, pasted work item data, or screenshots.

Keep output visual-first and action-first: KPI/RAG, charts, risks, actions, trends/learnings, assumptions/gaps. Treat `ado-plus-mcp` as read-only.
```

## Other MCP Clients

Use the skill as a reusable system/project instruction:

```text
Read and follow skills/ado-delivery-management/SKILL.md for Azure DevOps delivery requests.
```

Then connect any Azure DevOps MCP. The skill does not require exact tool names; it maps to capabilities such as:

- list projects
- list teams
- search work items or run WIQL
- get work item
- list current sprint/iteration
- list sprint work items
- read capacity
- list Delivery Plans
- list repos, pipelines, tests, and dashboards

## Recommended First Test

Ask:

```text
Use ADO Delivery Management to create a daily delivery brief for project YOUR_PROJECT_NAME_HERE and team YOUR_TEAM_NAME_HERE. Include risks, blockers, and team actions.
```

Then ask:

```text
Use ADO Delivery Management to create a team member focus report for my assigned Azure DevOps work.
```

Expected result:

- The assistant identifies available Azure DevOps access.
- It asks only for missing project/team/sprint context.
- It returns a focused visual report, not a raw Azure DevOps dump.
- It separates facts, risks, actions, and assumptions.

## Quick Local Test Prompts

Use these after your Azure DevOps MCP is configured:

```text
Use ado_plus to list my Azure DevOps projects.
```

```text
Use ADO Delivery Management with ado_plus to create a sprint health dashboard for project YOUR_PROJECT_NAME_HERE and team YOUR_TEAM_NAME_HERE.
```

```text
Use ADO Delivery Management with ado_plus to create a yesterday team work report for project YOUR_PROJECT_NAME_HERE and team YOUR_TEAM_NAME_HERE. Sort team members by name and include RAG colors, completed work, capacity, and item IDs.
```

```text
Use ADO Delivery Management with ado_plus to create a daily risk, dependency, and aging report for project YOUR_PROJECT_NAME_HERE and team YOUR_TEAM_NAME_HERE. Sort highest risks first.
```

What to check:

- Reports start with KPI/RAG or dashboard-style visuals when the client supports them.
- Team tables are sorted by team member name unless the prompt asks for ranking.
- Risk tables show Red/Amber/Green/Info labels and highest risks first.
- Bar charts are horizontal.
- Missing data is shown as a warning, not hidden.

## Example Visual Prompts

```text
Use ado-delivery-management with ado_plus to create a PMO dashboard for project YOUR_PROJECT_NAME_HERE. Include KPI cards, RAG status, scope/state charts, risk heatmap, dependency map, aging chart, missing-owner view, and action register.
```

```text
Use ado-delivery-management with ado_plus to create a sprint health dashboard for team YOUR_TEAM_NAME_HERE. Include completed-vs-remaining chart, blocker/bug chart, carryover risk matrix, owner action board, capacity signal, and data gaps.
```

```text
Use ado-delivery-management with ado_plus to create a Delivery Plan confidence report for YOUR_DELIVERY_PLAN_NAME_HERE. Include epic/feature progress, missing target dates, overdue risks, missing owners, dependencies, and recommended next actions.
```

```text
Use ado-delivery-management with ado_plus to create an engineering readiness view for project YOUR_PROJECT_NAME_HERE. Include repos, latest pipeline runs, test plans, dashboards, risks, and gaps.
```
