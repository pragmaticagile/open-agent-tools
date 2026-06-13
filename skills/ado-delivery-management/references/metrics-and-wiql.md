# Metrics And WIQL

Use these ideas to choose useful Azure DevOps queries and metrics. Adapt field names to the project process.

## Common WIQL Patterns

Replace placeholders before use.

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = 'YOUR_PROJECT_NAME_HERE'
ORDER BY [System.ChangedDate] DESC
```

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = 'YOUR_PROJECT_NAME_HERE'
  AND [System.IterationPath] = 'YOUR_PROJECT_NAME_HERE\\YOUR_SPRINT_NAME_HERE'
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.ChangedDate] DESC
```

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = 'YOUR_PROJECT_NAME_HERE'
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] NOT IN ('Closed', 'Done', 'Resolved', 'Removed')
ORDER BY [Microsoft.VSTS.Common.Severity] ASC, [Microsoft.VSTS.Common.Priority] ASC
```

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = 'YOUR_PROJECT_NAME_HERE'
  AND [System.AssignedTo] = ''
  AND [System.State] NOT IN ('Closed', 'Done', 'Resolved', 'Removed')
ORDER BY [System.ChangedDate] DESC
```

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = 'YOUR_PROJECT_NAME_HERE'
  AND [System.ChangedDate] <= @Today - 7
  AND [System.State] NOT IN ('Closed', 'Done', 'Resolved', 'Removed')
ORDER BY [System.ChangedDate] ASC
```

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = 'YOUR_PROJECT_NAME_HERE'
  AND [System.IterationPath] = 'YOUR_PROJECT_NAME_HERE\\YOUR_SPRINT_NAME_HERE'
  AND [System.State] IN ('Closed', 'Done', 'Resolved')
  AND [Microsoft.VSTS.Common.ClosedDate] >= @Today - 1
  AND [Microsoft.VSTS.Common.ClosedDate] < @Today
ORDER BY [System.AssignedTo], [Microsoft.VSTS.Common.ClosedDate] DESC
```

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = 'YOUR_PROJECT_NAME_HERE'
  AND [System.IterationPath] = 'YOUR_PROJECT_NAME_HERE\\YOUR_SPRINT_NAME_HERE'
  AND [System.State] NOT IN ('Closed', 'Done', 'Resolved', 'Removed')
  AND [System.ChangedDate] <= @Today - 14
ORDER BY [System.ChangedDate] ASC
```

## Signals To Calculate

- Completion: done vs not done in current sprint or reporting window.
- Flow: new, active, resolved, closed, removed, in review/test when custom states exist.
- Aging: items not updated for 7+ days or in the same state too long.
- Ownership: unassigned or missing clear owner.
- Quality: open bugs, severity/priority mix, reopened work when history exists, bugs near sprint end.
- Scope: new items added during sprint, removed items, carryover, oversized stories.
- Dependency: linked work items, parent/child hierarchy, predecessor/successor links, external tags.
- Capacity: team capacity, days off, completed work, remaining work, owner load, story points/effort where available.
- Yesterday work: team member capacity yesterday, days off yesterday, closed work item count, completed effort on closed items, and item IDs closed yesterday.
- Delivery Plan: missing owners, missing target dates, overdue target dates, at-risk epics/features, blocked timeline items.
- Engineering readiness: failing pipeline runs, stale repos, missing test cases, no dashboard/widget visibility.

## Trend Questions

Ask:

- Is carryover increasing?
- Are open bugs rising near sprint end?
- Is work stuck in review, test, or blocked states?
- Are the same people overloaded?
- Are work items too large to finish inside the sprint?
- Are blockers aging without owner action?
- Are Delivery Plan epics/features missing target dates or owners?
- Are repos, pipelines, tests, and dashboards visible enough for release decisions?

## Yesterday Team Work Calculation

Use this approach for a team work report for yesterday:

1. Determine yesterday in the user's timezone. If unknown, use the configured MCP/client timezone and state the assumption.
2. Get team capacity for the active/requested sprint.
3. Identify team members from capacity first, then team membership or sprint assignees as fallback.
4. Detect members off yesterday from days-off data where available.
5. Query work items closed yesterday in the sprint/project.
6. Group closed items by assigned-to. If closed-by is available and differs, show a note instead of silently switching ownership.
7. Sum completed effort from `Completed Work`, `Effort`, `Story Points`, or a known project estimate field. Label the unit.
8. Include members with zero completed work.
9. Include completed item IDs and titles as notes.
10. Label confidence low if capacity, closed date, or completed effort fields are missing.

## Interpretation Rules

- Do not overclaim if estimates, capacity, sprint history, or state history are unavailable.
- Label confidence as high, medium, or low based on data completeness.
- Prefer risk language over blame.
- Convert metrics into actions: who should do what next.
- Distinguish fact, inference, and recommendation.
