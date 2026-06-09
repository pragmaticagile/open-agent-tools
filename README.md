# open-agent-tools

Public MCP servers and Codex skills for practical agent workflows.

This repository is organized as a monorepo so each tool can stay independently documented, tested, and publishable while sharing one public home.

## Repository Layout

```text
open-agent-tools/
  mcp-servers/
    ado-plus-mcp/
      README.md
      package.json
      src/
  skills/
    README.md
  docs/
    publishing-checklist.md
  templates/
    mcp-server/
      README.md
    skill/
      README.md
```

## MCP Servers

MCP servers live in `mcp-servers/`.

Current servers:

- `mcp-servers/ado-plus-mcp` - A read-only Azure DevOps MCP server for projects, teams, boards, sprints, bugs, repos, pipelines, test plans, dashboards, and delivery reports.

Each MCP server should have its own:

- `README.md`
- `LICENSE`
- `package.json` or equivalent package file
- `.env.example`
- source folder
- build/test instructions
- privacy-safe examples using placeholders only

## Codex Skills

Codex skills live in `skills/`.

Each skill should have its own folder with:

- `SKILL.md`
- optional `scripts/`
- optional `assets/`
- optional `references/`
- a short README if public users need setup help

## Public Safety Rules

Before adding or publishing anything:

- Do not commit `.env` files.
- Do not commit PATs, API keys, tokens, cookies, certificates, or credentials.
- Do not commit local MCP client config files.
- Do not commit private organization, project, team, repo, sprint, work item, or customer data.
- Use placeholders such as `YOUR_ORGANIZATION_NAME_HERE`, `YOUR_PROJECT_NAME_HERE`, and `YOUR_PAT_HERE`.
- Run the publishing checklist in `docs/publishing-checklist.md`.

## Working With A Package

Example for the Azure DevOps MCP server:

```sh
cd mcp-servers/ado-plus-mcp
npm install
npm run build
npm test
```

## Publishing

This repository can be public on GitHub. Individual MCP servers can also be published later to npm from their own folders.

Before publishing a package:

```sh
npm run build
npm pack --dry-run
```

Review the package contents carefully before publishing.
