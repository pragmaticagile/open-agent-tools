# Codex Skills

This folder is for public Codex skills.

## Available Skills

| Skill | What It Helps With |
| --- | --- |
| [`jira-delivery-management`](jira-delivery-management/SKILL.md) | Jira goals, roadmap, backlog, sprint/daily reports, risks, dependencies, team focus, and delivery improvement. Works with any Jira MCP and works best with `jira-plus-mcp`. See the [universal setup guide](../docs/skills/jira-delivery-management.md). |
| [`ado-delivery-management`](ado-delivery-management/SKILL.md) | Azure DevOps goals, Delivery Plans, backlog, sprint/daily reports, bugs, capacity, risks, dependencies, repos, pipelines, tests, dashboards, team focus, and delivery improvement. Works with any ADO MCP and works best with `ado-plus-mcp`. See the [universal setup guide](../docs/skills/ado-delivery-management.md). |

## Recommended Structure

```text
skill-name/
  SKILL.md
  agents/
  scripts/
  references/
  assets/
```

Only add `scripts/`, `references/`, or `assets/` when the skill needs them.

Keep every skill reusable and free of private organization-specific data.
