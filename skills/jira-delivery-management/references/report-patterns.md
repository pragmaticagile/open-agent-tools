# Report Patterns

Use these patterns when the user asks for a formal or repeatable Jira report.

## Report Style

Default to dashboard-style reports:

- Lead with multiple visual summaries, not only one scope table.
- Use KPI/RAG cards, progress bars, bar charts, heatmaps, dependency maps, aging charts, and action boards.
- Keep text short: one main signal plus one-line notes under visuals.
- Put detailed issue lists behind "top items" unless the user asks for full detail.
- If rich chart/image artifacts are supported, use them for executive, PMO, roadmap, sprint, and capacity reports. Otherwise use portable Markdown chart tables.

## Daily Delivery Brief

Sections:

1. Visual snapshot: KPI/RAG strip, completed-vs-active-vs-blocked chart, and team action board.
2. Today’s signal in one sentence.
3. Completed, active, blocked, and at-risk work as compact chart tables.
4. Team member actions.
5. Risks if no action is taken.

Keep it short enough to paste into chat/email.

## Sprint Health Report

Sections:

1. Visual snapshot: RAG scorecard, completed-vs-remaining bar, scope/status chart, bug/blocker chart, and carryover risk matrix.
2. Sprint goal and confidence in one sentence.
3. Blocked work, bug risk, scope change, and carryover risk.
4. Owner-focused action list.
5. Data gaps.

## Backlog Health Report

Sections:

1. Visual snapshot: readiness KPI/RAG strip, missing-data heatmap, priority/status distribution, stale-age chart, and cleanup action board.
2. Backlog readiness summary in one sentence.
3. Items missing owner, estimate, priority, acceptance clarity, or parent/epic.
4. Stale items and old bugs.
5. Upcoming sprint/release readiness.
6. Cleanup recommendations.
7. Product decisions needed.

## Roadmap Confidence Report

Sections:

1. Visual snapshot: roadmap confidence KPI/RAG strip, epic/feature progress chart, dependency map, and decision register.
2. Goal/roadmap confidence in one sentence.
3. Epics/features/releases in focus.
4. Progress, blockers, dependency/date risks, and decisions needed.
5. Fallback note when Plans/Roadmaps API is unavailable.

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
- Dependency map when links or inferred dependency paths exist.
- Register table for owner/action tracking.

Columns:

- Risk or dependency
- Jira key or source
- Impact
- Owner
- Due date or needed-by date
- Current status
- Recommended next action

## Team Member Focus Report

Sections:

1. Visual snapshot: personal KPI/RAG strip, assigned-work status chart, urgency matrix, and top-3 action board.
2. Your top 3 actions.
3. Assigned work by urgency.
4. Blocked or waiting work.
5. Work to update in Jira.
6. Improvement pattern from recent trend.
