# MCP Server Catalog

This catalog lists public MCP servers in this repository and points users to the right setup guide.

## Jira Plus MCP

[Open Jira Plus MCP guide](../mcp-servers/jira-plus-mcp/README.md)

Use this when you want an AI client to work with Jira Cloud projects, issues, boards, sprints, delivery reporting, and optional write workflows.

Highlights:

- Minimum required config: Jira site URL, Atlassian email, and API token.
- Read-only by default.
- Optional write tools behind `JIRA_ENABLE_WRITE_TOOLS=true`.
- Supports Codex, Claude Desktop, VS Code, Cursor, and other stdio-compatible MCP clients.
- Includes guided setup helpers for common clients.
- Handles Jira Plans/Roadmaps permission blocks with friendly guidance.

## Azure DevOps Plus MCP

[Open Azure DevOps Plus MCP guide](../mcp-servers/ado-plus-mcp/README.md)

Use this when you want an AI client to read Azure DevOps delivery data and create practical status/reporting outputs.

Highlights:

- Read-only public MCP server.
- Covers projects, teams, boards, sprints, bugs, repos, pipelines, test plans, dashboards, and delivery reports.
- Uses placeholder-only public examples.

## Choosing A Server

- Use Jira Plus MCP for Jira Cloud work.
- Use Azure DevOps Plus MCP for Azure DevOps work.
- Keep each service in its own MCP server, but publish them from this shared repository so users have one place to discover and compare tools.
