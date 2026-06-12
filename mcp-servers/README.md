# MCP Servers

This folder contains public Model Context Protocol servers. Each server is independently usable, documented, testable, and publishable.

## Available Servers

| Server | Service | Default Mode | Guide |
| --- | --- | --- | --- |
| `jira-plus-mcp` | Jira Cloud | Read-only, optional write mode | [Open guide](jira-plus-mcp/README.md) |
| `ado-plus-mcp` | Azure DevOps | Read-only | [Open guide](ado-plus-mcp/README.md) |

## Standard Server Structure

```text
server-name/
  README.md
  TESTING.md
  EVALUATION.md
  LICENSE
  .env.example
  package.json
  package-lock.json
  src/
  scripts/
```

Not every server needs every file, but public-ready servers should include enough setup, testing, and safety guidance for a first-time user.

## Minimum Public Requirements

- Clear install instructions.
- Required and optional configuration documented separately.
- Placeholder-only examples.
- Read-only default when the service supports writes.
- Friendly permission and authentication errors.
- Local build/test instructions.
- `npm pack --dry-run` or equivalent package review before release.

## Adding The Next MCP

Start from [templates/mcp-server](../templates/mcp-server/README.md), then add the new server to this catalog and the root README.
