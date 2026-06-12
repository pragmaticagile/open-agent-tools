# jira-plus-mcp

`jira-plus-mcp` is a public, layman-friendly MCP server for Jira Cloud. It lets MCP clients such as Codex, Claude Desktop, Claude Code, VS Code, Cursor, and other stdio-compatible clients read Jira projects, boards, sprints, issues, comments, transitions, Plans/Roadmaps, versions, components, users, and delivery reports.

The server is read-only by default. Optional write tools can be enabled when you deliberately want your AI client to create or update Jira data.

## What This MCP Does

- Finds Jira projects, boards, and sprints.
- Searches issues with JQL.
- Reads issue details, comments, and workflow transitions.
- Lists epics, versions, components, and users.
- Reads Jira Plans/Roadmaps when the connected Jira account has permission.
- Provides a safe read-only Jira REST `GET` tool for advanced Jira data not wrapped yet.
- Builds sprint and project delivery summaries.
- Highlights open bugs, blockers, overdue work, missing owners, missing estimates, and delivery risks.
- Checks first-run connection health with a friendly next action.
- Discovers project issue types, hierarchy, and create requirements.
- Creates structured project plans with dry-run and duplicate protection when write mode is enabled.
- Optionally creates or updates Jira data when write mode is enabled.

## Supported Jira Areas

- Jira Cloud REST API v3 for projects, issues, comments, transitions, users, versions, and components.
- Jira Cloud REST API v3 Plans/Roadmaps endpoints. Atlassian marks these endpoints experimental and may require global Jira administrator permission.
- Jira Agile REST API for boards, sprints, sprint issues, and moving issues to sprints.
- JQL search for flexible issue reporting.

## Permission-Aware Access

This MCP respects the user's existing Jira configuration. It does not change project settings, workflows, schemes, issue type setup, fields, boards, or Plans.

Some Jira areas are permission-gated by Atlassian. If your account can read project issues but cannot read Plans/Roadmaps, the MCP returns a friendly message and suggests using project, board, sprint, and issue tools instead. It should not crash or disable the rest of the connector.

## Read-Only Mode

Read-only mode is the default and safest way to use this package.

```bash
JIRA_ENABLE_WRITE_TOOLS=false
```

In read-only mode, the MCP can inspect Jira but cannot create, update, assign, transition, comment, or otherwise modify Jira data.

## Optional Write Mode

Write tools are registered only when this environment variable is exactly `true`:

```bash
JIRA_ENABLE_WRITE_TOOLS=true
```

Warning: write mode can create issues, update issue fields, assign issues, add comments, transition issues, change labels, link issues, move issues to sprints, and create or update versions, components, and sprints. Use it only with a Jira account and project where those actions are intended.

Write tools require explicit structured inputs such as issue keys, account IDs, transition IDs, fields objects, sprint IDs, and project keys. They do not guess destructive changes from loose language.

## Dangerous Tools

This package does not currently register delete tools. `JIRA_ENABLE_DANGEROUS_TOOLS` is reserved for future versions and is shown only as a safety convention.

## Prerequisites

- Node.js 20 or newer.
- A Jira Cloud site, for example `https://YOUR_JIRA_SITE_NAME.atlassian.net`.
- A Jira user email address.
- A Jira API token.

## Create a Jira API Token

1. Open your Jira site in a browser.
2. Click your profile avatar.
3. Open **Account settings** or **Manage account**.
4. Open **Security**.
5. Open **API tokens**.
6. Choose **Create API token**.
7. Give it a clear label, such as `jira-plus-mcp`.
8. Copy the token once and store it securely. Atlassian will not show the same token again.
9. Use the email address from the same Atlassian account as `JIRA_EMAIL`.

Use only the permissions your Jira account already has. If a tool says access is denied, your user may need Jira project, board, issue, sprint, or administrator permissions.

## Environment Variables

Required:

```bash
JIRA_BASE_URL=https://YOUR_JIRA_SITE_NAME.atlassian.net
JIRA_EMAIL=YOUR_EMAIL_HERE
JIRA_API_TOKEN=YOUR_API_TOKEN_HERE
```

You can use a token file instead of `JIRA_API_TOKEN`:

```bash
JIRA_API_TOKEN_FILE=/path/to/jira-token.txt
```

Optional convenience settings:

```bash
# JIRA_DEFAULT_PROJECT=YOUR_PROJECT_KEY_HERE
# JIRA_DEFAULT_BOARD=YOUR_BOARD_ID_HERE
# JIRA_DEFAULT_SPRINT=YOUR_SPRINT_ID_HERE
# JIRA_TIMEZONE=UTC
# JIRA_ENABLE_WRITE_TOOLS=false
```

`JIRA_ENABLE_WRITE_TOOLS` can be omitted when you want read-only mode. Write tools are disabled unless this value is exactly `true`.

Do not duplicate configuration unnecessarily. If Codex, Claude Desktop, VS Code, Cursor, or another MCP client already passes these environment variables to the server, you do not need a `.env` file. `.env` is only for local terminal testing.

## Token File Examples

Mac/Linux:

```bash
mkdir -p ~/.config/jira-plus-mcp
printf "%s" "YOUR_API_TOKEN_HERE" > ~/.config/jira-plus-mcp/token
chmod 600 ~/.config/jira-plus-mcp/token
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.config\jira-plus-mcp"
Set-Content -NoNewline -Path "$env:USERPROFILE\.config\jira-plus-mcp\token" -Value "YOUR_API_TOKEN_HERE"
```

## Installation

Local development:

```bash
npm install
npm run build
```

Fast Claude Desktop setup:

```bash
npm run setup:claude
```

The setup command asks for your Jira site, email, and API token, creates a Claude config backup, adds `jira_plus`, validates required settings, and tells you how to test it.

Other guided setup commands:

```bash
npm run setup:vscode
npm run setup:cursor
```

If you do not have Jira details handy, choose "no" when asked. The setup command writes placeholders, and you can fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` later.

To write placeholders without prompts:

```bash
npm run setup:claude -- --placeholders
npm run setup:vscode -- --placeholders
npm run setup:cursor -- --placeholders
```

Advanced non-interactive setup:

```bash
npm run setup:claude -- --base-url https://YOUR_JIRA_SITE_NAME.atlassian.net --email YOUR_EMAIL_HERE --token YOUR_API_TOKEN_HERE --disable-write-tools
```

Development server:

```bash
npm run dev
```

If you already configured Codex and want a local `.env` only for terminal testing:

```bash
npm run sync-env:codex
```

Start the compiled server:

```bash
npm start
```

If published to npm later:

```bash
npm install -g jira-plus-mcp
jira-plus-mcp
```

## MCP Client Configuration

Minimum config is only the Jira site URL, Atlassian email, and token/token-file. Project, board, sprint, and write mode settings are optional.

To avoid JSON placement mistakes in Claude Desktop, use the guided setup:

```bash
npm run setup:claude
```

Or let the package add a placeholder block for you:

```bash
npm run configure:claude
npm run validate:claude
```

This creates a backup and inserts `jira_plus` inside the existing `mcpServers` object. Replace the placeholder values, then restart Claude Desktop.

For Codex, print a copy-ready TOML template:

```bash
npm run config:codex
```

For VS Code workspace config:

```bash
npm run setup:vscode
npm run validate:vscode
```

For Cursor user config:

```bash
npm run setup:cursor
npm run validate:cursor
```

### Codex TOML

```toml
[mcp_servers.jira_plus]
command = "node"
args = ["/path/to/jira-plus-mcp/dist/index.js"]

[mcp_servers.jira_plus.env]
JIRA_BASE_URL = "https://YOUR_JIRA_SITE_NAME.atlassian.net"
JIRA_EMAIL = "YOUR_EMAIL_HERE"
JIRA_API_TOKEN = "YOUR_API_TOKEN_HERE"
```

Optional convenience settings:

```toml
# JIRA_DEFAULT_PROJECT = "YOUR_PROJECT_KEY_HERE"
# JIRA_DEFAULT_BOARD = "YOUR_BOARD_ID_HERE"
# JIRA_DEFAULT_SPRINT = "YOUR_SPRINT_ID_HERE"
# JIRA_ENABLE_WRITE_TOOLS = "false"
```

Codex or another coding agent can help edit this config file when you ask it to. A generic MCP server cannot safely auto-edit every host application's config on its own; the host has to launch the MCP with the right environment.

### Claude Desktop JSON

```json
{
  "mcpServers": {
    "jira_plus": {
      "command": "node",
      "args": ["/path/to/jira-plus-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://YOUR_JIRA_SITE_NAME.atlassian.net",
        "JIRA_EMAIL": "YOUR_EMAIL_HERE",
        "JIRA_API_TOKEN": "YOUR_API_TOKEN_HERE",
        "JIRA_ENABLE_WRITE_TOOLS": "false"
      }
    }
  }
}
```

### Claude Code / Generic Stdio

```json
{
  "jira_plus": {
    "command": "node",
    "args": ["/path/to/jira-plus-mcp/dist/index.js"],
    "env": {
      "JIRA_BASE_URL": "https://YOUR_JIRA_SITE_NAME.atlassian.net",
      "JIRA_EMAIL": "YOUR_EMAIL_HERE",
      "JIRA_API_TOKEN_FILE": "/path/to/token-file",
      "JIRA_ENABLE_WRITE_TOOLS": "false"
    }
  }
}
```

### VS Code / Cursor-Style MCP JSON

```json
{
  "servers": {
    "jira_plus": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/jira-plus-mcp/dist/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://YOUR_JIRA_SITE_NAME.atlassian.net",
        "JIRA_EMAIL": "YOUR_EMAIL_HERE",
        "JIRA_API_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

The setup helpers write these shapes automatically:

- VS Code workspace: `.vscode/mcp.json` with `servers.jira_plus`
- Cursor user config: `~/.cursor/mcp.json` with `mcpServers.jira_plus`

### npm Global Install Usage

```json
{
  "mcpServers": {
    "jira_plus": {
      "command": "jira-plus-mcp",
      "env": {
        "JIRA_BASE_URL": "https://YOUR_JIRA_SITE_NAME.atlassian.net",
        "JIRA_EMAIL": "YOUR_EMAIL_HERE",
        "JIRA_API_TOKEN": "YOUR_API_TOKEN_HERE",
        "JIRA_ENABLE_WRITE_TOOLS": "false"
      }
    }
  }
}
```

After changing MCP configuration or environment variables, restart your MCP client completely.

## Simple First-Run Path

1. Add the minimum Jira env values once in your MCP client config.
2. Restart the MCP client.
3. Ask: "Use Jira to run get_connection_status."
4. Ask: "Use Jira to list my projects."
5. Ask: "Use Jira to run get_project_capabilities for project YOUR_PROJECT_KEY_HERE."
6. In write mode, dry-run a plan first with `create_project_plan` and `dry_run=true`.
7. Create only after reviewing the dry run by setting `dry_run=false`.

## Read-Only Tools

- `get_myself`
- `get_connection_status`
- `list_projects`
- `get_project`
- `get_project_capabilities`
- `list_plans`
- `get_plan`
- `find_plans_for_project`
- `get_plan_summary`
- `list_boards`
- `get_board`
- `list_sprints`
- `get_current_sprint`
- `list_sprint_issues`
- `search_issues`
- `get_issue`
- `get_issue_comments`
- `list_issue_transitions`
- `list_epics`
- `list_versions`
- `list_components`
- `list_users`
- `jira_api_get`
- `get_project_summary`
- `get_board_summary`
- `get_sprint_summary`
- `get_sprint_health`
- `list_open_bugs_in_sprint`
- `identify_delivery_risks`
- `create_sprint_summary_report`
- `create_project_delivery_report`

## Optional Write Tools

Registered only with `JIRA_ENABLE_WRITE_TOOLS=true`:

- `create_issue`
- `update_issue_fields`
- `assign_issue`
- `add_issue_comment`
- `transition_issue`
- `add_labels_to_issue`
- `remove_labels_from_issue`
- `link_issues`
- `move_issues_to_sprint`
- `create_version`
- `update_version`
- `create_component`
- `update_component`
- `create_sprint`
- `update_sprint`
- `create_project_plan`

## Example Prompts

Read-only:

- "Use Jira to list projects."
- "Use Jira to run get_connection_status."
- "Use Jira to get project capabilities for YOUR_PROJECT_KEY_HERE."
- "Use Jira to find Plans for project YOUR_PROJECT_KEY_HERE."
- "Use Jira to list Plans. If Jira denies access, explain what permission is needed."
- "Use Jira to safely GET /rest/api/3/field."
- "Show boards for project YOUR_PROJECT_KEY_HERE."
- "Find the current sprint for board YOUR_BOARD_ID_HERE."
- "List open bugs in sprint YOUR_SPRINT_ID_HERE."
- "Create a sprint summary report for sprint YOUR_SPRINT_ID_HERE."
- "Search Jira for issues updated this week in YOUR_PROJECT_KEY_HERE."
- "Identify delivery risks for this JQL: project = YOUR_PROJECT_KEY_HERE AND statusCategory != Done."

Write mode:

- "Create a Task in YOUR_PROJECT_KEY_HERE titled 'Review onboarding checklist'."
- "Add a comment to YOUR_ISSUE_KEY_HERE saying the deployment note has been reviewed."
- "Assign YOUR_ISSUE_KEY_HERE to account ID YOUR_ACCOUNT_ID_HERE."
- "List transitions for YOUR_ISSUE_KEY_HERE, then transition it using transition ID 31."
- "Move YOUR_ISSUE_KEY_HERE to sprint YOUR_SPRINT_ID_HERE."
- "Dry-run a Jira project plan in YOUR_PROJECT_KEY_HERE with one Epic, two Stories, and subtasks. Do not create anything yet."

## Troubleshooting

- Missing base URL: set `JIRA_BASE_URL`.
- Missing email: set `JIRA_EMAIL`.
- Missing token: set `JIRA_API_TOKEN` or `JIRA_API_TOKEN_FILE`.
- Invalid credentials: create a new Jira API token and confirm the email address.
- Insufficient permissions: check Jira project, issue, sprint, board, or admin permissions.
- Project not found: confirm the project key and user access.
- Board not found: list boards first and use the numeric board ID.
- Sprint not found: list sprints first and use the numeric sprint ID.
- Issue not found: confirm the issue key and user access.
- Retired API error: upgrade or rebuild `jira-plus-mcp`; Jira may have removed an older endpoint.
- Write tool missing: set `JIRA_ENABLE_WRITE_TOOLS=true` and restart the MCP client.
- Large output: lower the limit or use narrower JQL.

## Security

- Do not commit `.env` files.
- Prefer `JIRA_API_TOKEN_FILE` when possible.
- Restrict token file permissions.
- Use a Jira account with the least access needed.
- Keep write mode off unless you need it.
- Review prompts carefully before allowing write actions.
- This package does not hardcode secrets or private Jira identifiers.

## Developer Notes

Project structure:

```text
src/index.ts
src/jira/auth.ts
src/jira/capabilities.ts
src/jira/client.ts
src/jira/endpoints.ts
src/jira/types.ts
src/tools/read-tools.ts
src/tools/write-tools.ts
src/tools/reporting-tools.ts
src/reporting/summary.ts
```

Build:

```bash
npm run build
```

Development:

```bash
npm run dev
```

The server uses standard stdio MCP transport and does not depend on Codex-specific APIs.

## Publishing Later

Before publishing:

1. Confirm `npm run build` passes.
2. Confirm `README.md`, `TESTING.md`, `EVALUATION.md`, `LICENSE`, `.env.example`, `scripts`, and `dist` are included.
3. Confirm examples use placeholders only.
4. Confirm write mode is off by default.
5. Run:

```bash
npm publish --dry-run
npm publish
```
