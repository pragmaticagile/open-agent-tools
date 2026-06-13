# Report Patterns

Use these patterns when the user asks for a formal or repeatable Azure DevOps delivery report.

## Report Style

Default to dashboard-style reports:

- Lead with multiple visual summaries, not only one scope table.
- Use KPI/RAG cards, progress bars, bar charts, heatmaps, dependency maps, aging charts, capacity tables, and action boards.
- Keep text short: one main signal plus one-line notes under visuals.
- Put detailed work item lists behind "top items" unless the user asks for full detail.
- If rich chart/image artifacts are supported, use them for executive, PMO, Delivery Plan, sprint, and capacity reports. Otherwise use portable Markdown chart tables.
- Sort every table and chart intentionally: team/member views by member name, risk views by highest risk first, target-date views by overdue/earliest date, aging views by oldest first, and action registers by priority then due date.
- Use stable headers across repeatable reports so users can compare daily, sprint, and PMO outputs over time.

## Daily Delivery Brief

Sections:

1. Visual snapshot: KPI/RAG strip, completed-vs-active-vs-blocked chart, open-bug chart, and team action board.
2. Today's signal in one sentence.
3. Completed, active, blocked, bug, and at-risk work as compact chart tables.
4. Team member actions.
5. Risks if no action is taken.

Keep it short enough to paste into chat, email, or a standup note.

## Yesterday Team Work Report

Use this when the user asks what the team completed yesterday, capacity vs completed work, or day-by-day team productivity.

Purpose: compare each team member's yesterday capacity with completed work effort from work items closed yesterday, and make zero-completion or day-off cases visible without blame.

Required data when available:

- Team members from the project/team.
- Current or requested sprint/iteration.
- Team capacity for the sprint, including daily capacity and days off.
- Work items closed yesterday, grouped by assigned-to or closed-by when available.
- Completed work effort from closed items. Prefer `Completed Work`, `Effort`, `Story Points`, or project-specific estimate fields in that order, and label the unit.
- Closed item IDs and titles.

Sections:

1. Visual snapshot: KPI/RAG strip with total capacity yesterday, completed effort yesterday, active team members, day-off members, zero-completion members, and data confidence.
2. Team member table ordered by team member name.
3. Completed item notes: list item IDs, titles, type, state, and completed effort per member.
4. Zero-completion and day-off notes: include members with no completed work and members marked off yesterday.
5. Data gaps: missing capacity, missing completed work field, missing closed date, missing owner, or ambiguous closed-by vs assigned-to.
6. Action notes: follow up only where action is useful, such as missing effort, work closed under the wrong owner, or blocked/no-output pattern.

Recommended table:

```markdown
| Team Member | Yesterday Capacity | Completed Effort | Completed Items | Day Off? | Signal |
| --- | ---: | ---: | --- | --- | --- |
| Name A | 6h | 5h | 101, 102 | No | Green |
| Name B | 0h | 0h | None | Yes | Info |
| Name C | 6h | 0h | None | No | Amber |
```

Rules:

- Always include every team member found in capacity or team membership, even if they completed no work.
- If a person has zero capacity because of a day off, show `Day Off` and do not treat it as a delivery risk.
- If capacity is missing, use team membership or assignee list and label capacity confidence as low.
- If completed effort is missing on a closed item, count the item but show effort as `Missing`.
- Do not imply people were unproductive without checking day off, assignment, blocked work, and whether completed work is tracked.
- Put completed item IDs in the table or a short note under each member.
- Use a horizontal bar chart for completed work or utilization by team member; keep the detailed table sorted by team member name.

## Sprint Health Report

Sections:

1. Visual snapshot: RAG scorecard, completed-vs-remaining bar, scope/status chart, bug/blocker chart, capacity visibility, and carryover risk matrix.
2. Sprint goal and confidence in one sentence when available.
3. Blocked work, bug risk, scope change, capacity gap, and carryover risk.
4. Owner-focused action list.
5. Data gaps: missing owner, estimate, remaining work, acceptance criteria, or target date.

## Backlog Health Report

Sections:

1. Visual snapshot: readiness KPI/RAG strip, missing-data heatmap, priority/status distribution, stale-age chart, and cleanup action board.
2. Backlog readiness summary in one sentence.
3. Items missing owner, estimate, priority, acceptance clarity, iteration, parent/feature/epic, or business value.
4. Stale items and old bugs.
5. Upcoming sprint/release readiness.
6. Cleanup recommendations.
7. Product decisions needed.

## Delivery Plan Confidence Report

Sections:

1. Visual snapshot: Delivery Plan confidence KPI/RAG strip, epic/feature progress chart, target-date risk table, dependency map, and decision register.
2. Delivery Plan confidence in one sentence.
3. Epics/features/releases in focus.
4. Progress, blockers, dependency risks, missing owners, missing target dates, overdue target dates, and decisions needed.
5. Fallback note when the Delivery Plans API is unavailable or timeline data is partial.

## PMO Status Report

Sections:

1. Visual snapshot: KPI/RAG strip, scope/status distribution, risk heatmap, dependency map/register, aging/owner chart, and action register.
2. Delivery signal in one sentence.
3. Open risks, dependency register, aging, missing owners, and action register as compact tables.
4. PMO decisions needed.
5. Data gaps.

## Risk And Dependency Register

Visuals:

- Risk heatmap by likelihood and impact.
- Dependency map when links, parent/child hierarchy, Delivery Plan sequencing, or inferred dependency paths exist.
- Register table for owner/action tracking.
- Sort risks by Red, Amber, Green, then impact/likelihood/date. Sort dependencies by blocked/blocking first, then needed-by date.

Columns:

- Risk or dependency
- ADO work item ID or source
- Impact
- Owner
- Due date, target date, or needed-by date
- Current status
- Recommended next action

## Daily Risk, Dependency, And Aging Report

Use this when the user asks for risks, dependencies, aging items, blockers, or day-to-day management concerns.

Sections:

1. Visual snapshot: risk count by Red/Amber/Green, dependency count, blockers, long-aging items, and missing-owner/estimate count.
2. Risk heatmap: top delivery, quality, capacity, dependency, and date risks.
3. Dependency register: linked work, parent/child dependencies, predecessor/successor links, Delivery Plan sequencing, external tags, and cross-team handoffs.
4. Long-aging items: items not updated or not moved for the selected threshold.
5. Owner action board: who should do what next.
6. Data gaps and confidence.

Default aging thresholds:

- 7+ days without update: Watch.
- 14+ days without update: High attention.
- 21+ days without update: Escalate or re-plan.

Adjust thresholds if the team works in shorter or longer cycles.

Recommended long-aging table:

```markdown
| Age | Work Item | Type | State | Owner | Last Changed | Risk | Next Action |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 16d | 101 - Title | User Story | Active | Name | YYYY-MM-DD | Amber | Confirm blocker or split |
```

## Common Day-To-Day Reports

Recommend these reports when the user asks what else would be useful:

- Daily delivery brief: what changed, what is blocked, what needs action today.
- Yesterday team work report: capacity vs completed effort by person, including zero-completion and day-off notes.
- Sprint health report: confidence, progress, open bugs, blockers, scope, capacity, and carryover risk.
- Open bug and quality report: bugs by severity, priority, owner, age, sprint, and next action.
- Long-aging work report: stale active/review/test/blocked items and owner actions.
- Risk and dependency report: dependency map/register, risk heatmap, and decisions needed.
- Capacity and owner load report: capacity, assigned work, remaining work, completed work, and overload warnings.
- Backlog hygiene report: missing owner, estimate, priority, acceptance criteria, parent, target date, and stale items.
- Delivery Plan confidence report: epic/feature status, target date risk, missing owner/date warnings, and at-risk items.
- Pipeline/test readiness report: latest pipeline runs, failed builds, test plans/cases, dashboard visibility, and release risk.
- Team member focus report: top 3 personal actions, blockers, overdue updates, and improvement pattern.
- PMO action register: key risks, owners, due dates, decisions needed, and next update.

## Team Member Focus Report

Sections:

1. Visual snapshot: personal KPI/RAG strip, assigned-work status chart, urgency matrix, and top-3 action board.
2. Top 3 actions.
3. Assigned work by urgency.
4. Blocked or waiting work.
5. Work to update in Azure DevOps.
6. Improvement pattern from recent trend.
