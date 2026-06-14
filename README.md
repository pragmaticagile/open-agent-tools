# Pragmatic Agile Open Agent Tools

Public MCP servers, agent skills, templates, and guides for practical delivery work.

This repository is a public home for tools that help AI clients such as Codex, Claude, VS Code, Cursor, and other MCP-compatible apps work with engineering and delivery systems. Each package is documented and testable on its own, while the repo keeps one consistent structure for future MCPs and skills.

Built by [Sunil Gulia](https://linkedin.com/in/sunilgulia) —
Enterprise Agile Coach, Digital Transformation Leader, and
Professional Scrum Trainer — from patterns observed across 30+
agile teams and 7 Agile Release Trains at scale.

## Start Here

- [MCP server catalog](mcp-servers/README.md)
- [Jira Plus MCP](mcp-servers/jira-plus-mcp/README.md)
- [Azure DevOps Plus MCP](mcp-servers/ado-plus-mcp/README.md)
- [Skills catalog](skills/README.md)
- [ADO Delivery Management skill](docs/skills/ado-delivery-management.md)
- [Publishing checklist](docs/publishing-checklist.md)
- [Security guidance](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)

## Featured MCP Servers

| Tool | What It Helps With | Status |
| --- | --- | --- |
| [jira-plus-mcp](mcp-servers/jira-plus-mcp/README.md) | Jira Cloud projects, issues, boards, sprints, reports, Plans/Roadmaps read access, and optional write workflows | Ready |
| [ado-plus-mcp](mcp-servers/ado-plus-mcp/README.md) | Azure DevOps projects, teams, boards, sprints, bugs, repos, pipelines, test plans, dashboards, and delivery reports | Ready |

## Repository Layout

```text
/
  README.md
  CONTRIBUTING.md
  SECURITY.md
  docs/
    index.md
    mcp-servers.md
    publishing-checklist.md
  mcp-servers/
    README.md
    ado-plus-mcp/
    jira-plus-mcp/
  skills/
    README.md
  templates/
    mcp-server/
    skill/
```

## User Promise

These tools are designed to be:

- Simple to install for non-specialist users.
- Read-first and safe by default.
- Explicit about write mode and permissions.
- Friendly when a connected service blocks access.
- Free of hardcoded personal, company, project, token, or local machine values.

## Why This Is Different

Most agent connectors stop at "let the assistant read a tool." This repo is focused on what teams need after connection: safer setup, delivery-ready reports, role-aware summaries, and clear next actions.

The goal is to help teams answer everyday questions faster:

- What changed yesterday?
- What is at risk today?
- Who needs help or a decision?
- Which work is aging, blocked, unowned, or missing estimates?
- Are sprint, roadmap, pipeline, test, and dashboard signals visible enough to trust?

The MCP servers provide the read-only connection. The skills turn that data into practical delivery management workflows.

## Public Safety Rules

Before adding or publishing anything:

- Do not commit `.env` files.
- Do not commit PATs, API keys, tokens, cookies, certificates, or credentials.
- Do not commit local MCP client config files.
- Do not commit private organization, project, team, repo, sprint, work item, or customer data.
- Use placeholders such as `YOUR_ORGANIZATION_NAME_HERE`, `YOUR_PROJECT_NAME_HERE`, `YOUR_EMAIL_HERE`, and `YOUR_API_TOKEN_HERE`.
- Run the publishing checklist in [docs/publishing-checklist.md](docs/publishing-checklist.md).

## Working With A Package

Each MCP server is managed from its own folder.

```sh
cd mcp-servers/jira-plus-mcp
npm install
npm run build
npm test
npm pack --dry-run
```

Review package contents carefully before publishing to GitHub or npm.
