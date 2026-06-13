# Metrics And JQL

Use these ideas to choose useful Jira queries. Adapt field names to the project.

## Common JQL Patterns

Replace placeholders before use.

```jql
project = YOUR_PROJECT_KEY ORDER BY updated DESC
```

```jql
project = YOUR_PROJECT_KEY AND sprint in openSprints() ORDER BY priority DESC, updated DESC
```

```jql
project = YOUR_PROJECT_KEY AND statusCategory != Done ORDER BY priority DESC, updated ASC
```

```jql
project = YOUR_PROJECT_KEY AND assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC, updated ASC
```

```jql
project = YOUR_PROJECT_KEY AND statusCategory != Done AND assignee is EMPTY ORDER BY priority DESC
```

```jql
project = YOUR_PROJECT_KEY AND statusCategory != Done AND updated <= -7d ORDER BY updated ASC
```

```jql
project = YOUR_PROJECT_KEY AND issuetype = Bug AND statusCategory != Done ORDER BY priority DESC, created ASC
```

```jql
project = YOUR_PROJECT_KEY AND issueLinkType is not EMPTY AND statusCategory != Done ORDER BY updated DESC
```

## Signals To Calculate

- Completion: done vs not done in current sprint or reporting window.
- Flow: not started, in progress, review, done.
- Aging: items not updated for 7+ days or in same status too long.
- Ownership: unassigned or missing reporter/owner.
- Quality: open bugs, reopened work, rejected/returned work if status history exists.
- Scope: new items added during sprint, removed items, carryover from previous sprint.
- Dependency: linked issues, blockers, related epics/features, external labels.
- Capacity proxy: open work count or estimates by assignee.

## Trend Questions

Ask:

- Is carryover increasing?
- Are bugs rising near sprint end?
- Is work stuck in review or waiting?
- Are the same people overloaded?
- Are stories too large to finish inside the sprint?
- Are blockers aging without owner action?
- Are roadmap items missing linked delivery work?

## Interpretation Rules

- Do not overclaim if estimates, sprint history, or status history are unavailable.
- Label confidence as high, medium, or low based on data completeness.
- Prefer “risk” language over blame.
- Convert metrics into actions: who should do what next.
