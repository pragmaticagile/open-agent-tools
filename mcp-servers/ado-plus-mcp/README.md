# ado-plus-mcp

`ado-plus-mcp` is a read-only Azure DevOps MCP server. It lets MCP clients such as Codex, Claude Desktop, Claude Code, VS Code, Cursor, and other stdio-compatible clients safely read Azure DevOps information and create concise reports.

The server is designed for normal users, not only developers. You provide your Azure DevOps organization name and a Personal Access Token (PAT). Project, team, repository, pipeline, sprint, dashboard, and delivery-plan names can be supplied later in prompts or tool inputs.

## What This MCP Does

`ado-plus-mcp` supports these Azure DevOps areas:

- Projects and teams
- Work Items and Boards
- Bugs
- Sprints and Iterations
- Team Capacity
- Delivery Plans
- Repos
- Pipelines and Builds
- Test Plans, Test Suites, and Test Cases
- Dashboards and Widgets

With an MCP client, you can ask questions like:

- "List my Azure DevOps projects."
- "Show open bugs in the current sprint for this team."
- "Create a sprint summary report."
- "Show epics in this delivery plan."
- "List repositories, pipelines, test plans, or dashboards."

## Sprint Reports

Sprint reporting tools can find the current sprint for a project and team, list sprint work items, list open bugs, summarize team capacity, and create a business-friendly sprint summary.

Reports include item IDs, titles, work item types, states, owners, iterations, completed and remaining work when available, missing-field warnings, quality concerns, delivery risks, and recommended next actions.

## Delivery Plan Reports

Delivery Plan tools can list plans in a project, resolve a plan by name, read the plan timeline, list visible epics or major items, and create a delivery plan report.

Reports flag missing target dates, missing owners, overdue target dates, and at-risk items when those fields are available from Azure DevOps.

## Prerequisites

- Node.js 20 or newer
- npm
- An Azure DevOps account
- Your Azure DevOps organization name
- An Azure DevOps Personal Access Token (PAT)

## Create An Azure DevOps PAT

1. Open Azure DevOps in your browser.
2. Click your user profile or settings menu.
3. Open **Personal Access Tokens**.
4. Choose **New Token**.
5. Select your organization.
6. Set an expiration date.
7. Choose the read scopes you need.
8. Create the token.
9. Copy the token immediately.

Azure DevOps will not show the PAT again after you leave the page.

## PAT Scopes

You can start with read-only scopes. Add scopes only for the features you plan to use.

| Feature | Suggested PAT scope |
|---|---|
| Work Items, Boards, Bugs, Sprints | Work Items: Read |
| Projects and Teams | Project and Team: Read |
| Repos and repository files | Code: Read |
| Pipelines and Builds | Build: Read |
| Release pipelines, if you later add release support | Release: Read |
| Test Plans, Test Suites, Test Cases | Test Management: Read |
| Dashboards and widgets | Project and Team: Read, plus access to the project/team dashboards |
| Analytics-backed dashboard widgets, if your organization restricts them | Analytics-related read access may be required by your Azure DevOps setup |

## Store Your PAT In A File

Do not paste your PAT into chat. Store it in a local file that is not shared or committed.

Mac/Linux:

```sh
mkdir -p ~/.codex
echo "YOUR_PAT_HERE" > ~/.codex/ado-plus-pat.txt
chmod 600 ~/.codex/ado-plus-pat.txt
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex"
Set-Content "$env:USERPROFILE\.codex\ado-plus-pat.txt" "YOUR_PAT_HERE"
```

## Installation

Local development:

```sh
git clone YOUR_REPOSITORY_URL_HERE
cd ado-plus-mcp
npm install
npm run build
```

Run in development mode:

```sh
npm run dev
```

Run the compiled server:

```sh
npm start
```

If this package is later published to npm:

```sh
npm install -g ado-plus-mcp
ado-plus-mcp
```

## Required Setup Inputs

Only these are required:

- `AZURE_DEVOPS_ORG`, or the organization as the first CLI argument, or an `organization` tool input
- `AZURE_DEVOPS_PAT` or `AZURE_DEVOPS_PAT_FILE`

Optional convenience settings:

- `AZURE_DEVOPS_DEFAULT_PROJECT`
- `AZURE_DEVOPS_DEFAULT_TEAM`
- `AZURE_DEVOPS_DEFAULT_REPOSITORY`
- `AZURE_DEVOPS_DEFAULT_DELIVERY_PLAN`
- `AZURE_DEVOPS_DEFAULT_PIPELINE`
- `ADO_PLUS_TIMEZONE`

## MCP Client Configuration

After changing MCP configuration, restart your MCP client.

### Codex TOML

```toml
[mcp_servers.ado_plus]
command = "node"
args = ["/FULL/PATH/TO/ado-plus-mcp/dist/index.js"]
startup_timeout_sec = 60

[mcp_servers.ado_plus.env]
AZURE_DEVOPS_ORG = "YOUR_ORGANIZATION_NAME_HERE"
AZURE_DEVOPS_PAT_FILE = "/FULL/PATH/TO/.codex/ado-plus-pat.txt"
```

### Claude Desktop JSON

```json
{
  "mcpServers": {
    "ado_plus": {
      "command": "node",
      "args": ["/FULL/PATH/TO/ado-plus-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG": "YOUR_ORGANIZATION_NAME_HERE",
        "AZURE_DEVOPS_PAT_FILE": "/FULL/PATH/TO/.codex/ado-plus-pat.txt"
      }
    }
  }
}
```

### Claude Code / Generic Stdio MCP

```json
{
  "name": "ado_plus",
  "command": "node",
  "args": ["/FULL/PATH/TO/ado-plus-mcp/dist/index.js"],
  "env": {
    "AZURE_DEVOPS_ORG": "YOUR_ORGANIZATION_NAME_HERE",
    "AZURE_DEVOPS_PAT_FILE": "/FULL/PATH/TO/.codex/ado-plus-pat.txt"
  }
}
```

Some clients also support running a globally installed package:

```json
{
  "name": "ado_plus",
  "command": "ado-plus-mcp",
  "args": [],
  "env": {
    "AZURE_DEVOPS_ORG": "YOUR_ORGANIZATION_NAME_HERE",
    "AZURE_DEVOPS_PAT_FILE": "/FULL/PATH/TO/.codex/ado-plus-pat.txt"
  }
}
```

### VS Code / Cursor Style MCP JSON

```json
{
  "mcpServers": {
    "ado_plus": {
      "command": "node",
      "args": ["/FULL/PATH/TO/ado-plus-mcp/dist/index.js"],
      "env": {
        "AZURE_DEVOPS_ORG": "YOUR_ORGANIZATION_NAME_HERE",
        "AZURE_DEVOPS_PAT_FILE": "/FULL/PATH/TO/.codex/ado-plus-pat.txt"
      }
    }
  }
}
```

### npm Global Install Example

```json
{
  "mcpServers": {
    "ado_plus": {
      "command": "ado-plus-mcp",
      "args": [],
      "env": {
        "AZURE_DEVOPS_ORG": "YOUR_ORGANIZATION_NAME_HERE",
        "AZURE_DEVOPS_PAT_FILE": "/FULL/PATH/TO/.codex/ado-plus-pat.txt"
      }
    }
  }
}
```

## Restart MCP Clients

MCP clients usually read server configuration only when they start. After editing config, fully restart Codex, Claude Desktop, Claude Code, VS Code, Cursor, or any other MCP client you use.

## Example Prompts

- Use ado_plus to list my Azure DevOps projects.
- Use ado_plus to list repositories in project YOUR_PROJECT_NAME_HERE.
- Use ado_plus to get file README.md from repo YOUR_REPOSITORY_NAME_HERE.
- Use ado_plus to list pipelines for project YOUR_PROJECT_NAME_HERE.
- Use ado_plus to show the latest pipeline runs.
- Use ado_plus to list open bugs in the current sprint for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to show team capacity for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to create a sprint summary report for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to show sprint health for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to list delivery plans in project YOUR_PROJECT_NAME_HERE.
- Use ado_plus to show epics in delivery plan YOUR_DELIVERY_PLAN_NAME_HERE.
- Use ado_plus to create a delivery plan report for YOUR_DELIVERY_PLAN_NAME_HERE.
- Use ado_plus to list test plans and test cases.
- Use ado_plus to list dashboards and dashboard widgets.

## Tools

Project and team tools:

- `list_projects`
- `list_project_teams`

Work item and sprint tools:

- `search_work_items`
- `get_work_item`
- `list_current_sprint`
- `list_sprint_work_items`
- `list_sprint_bugs`
- `list_open_bugs_in_sprint`
- `get_team_capacity`
- `get_team_capacity_summary`
- `get_sprint_health`
- `create_sprint_summary_report`
- `compare_sprint_capacity_to_completed_work`

Delivery Plan tools:

- `list_delivery_plans`
- `get_delivery_plan_timeline`
- `list_delivery_plan_epics`
- `get_delivery_plan_summary`
- `create_delivery_plan_report`
- `identify_delivery_risks`

Repos, pipelines, tests, and dashboard tools:

- `list_repositories`
- `get_repository_file`
- `list_pipelines`
- `list_pipeline_runs`
- `list_test_plans`
- `list_test_suites`
- `list_test_cases`
- `list_dashboards`
- `get_dashboard_widgets`

## Troubleshooting

PAT missing:

- Set `AZURE_DEVOPS_PAT` or `AZURE_DEVOPS_PAT_FILE`.
- Make sure the PAT file contains only the PAT text.

Wrong organization:

- Check `AZURE_DEVOPS_ORG`.
- Use only the organization name, not a full private URL.

Insufficient PAT scopes:

- 401 or 403 errors usually mean the PAT is wrong, expired, missing scopes, or your Azure DevOps user lacks access.
- Add only the read scopes needed for the feature.

Project not found:

- Use `list_projects` to confirm the exact project name.

Team not found:

- Use `list_project_teams` to confirm the exact team name.

Delivery plan not found:

- Use `list_delivery_plans` to confirm the exact plan name.

Current sprint not found:

- Check that the team has a current iteration configured in Azure DevOps.
- Check the sprint dates.

No capacity data available:

- Capacity may not be configured for that team and sprint.
- Your PAT or user may not have access to the team settings.

Tool not visible in MCP client:

- Run `npm run build`.
- Check that the config points to `dist/index.js`.
- Restart the MCP client.

npm install or build errors:

- Confirm Node.js 20 or newer.
- Run `npm install`.
- Run `npm run build` again.

Large responses or truncation:

- Lower the `limit`.
- Add filters such as project, team, state, type, owner, iteration, pipeline, or repository path.

## Security

- Never commit a PAT.
- Use read-only scopes when possible.
- Rotate PATs regularly.
- Use expiration dates.
- Use `chmod 600` for PAT files on Mac/Linux.
- Do not paste PATs into chat.
- Do not include organization-specific data, project names, work item IDs, sprint names, or user data in public examples.

## Developer Notes

Project structure:

```text
ado-plus-mcp/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts
    azure/
      auth.ts
      client.ts
      types.ts
      workItems.ts
    reporting/
      reports.ts
    tools/
      register.ts
      schemas.ts
    format.ts
```

Add a new tool:

1. Add or reuse a helper in `src/azure/`.
2. Add any report logic in `src/reporting/`.
3. Register the tool in `src/tools/register.ts`.
4. Use Zod schemas for inputs.
5. Keep the tool read-only unless the package intentionally adds write features later.
6. Return concise markdown by default and JSON when `response_format` is `json`.
7. Run `npm run build`.

Run development mode:

```sh
npm run dev
```

Run build:

```sh
npm run build
```

Run tests:

```sh
npm test
```

At the moment, `npm test` runs the TypeScript build. Add MCP client integration tests before publishing production releases.

Publish later to npm:

```sh
npm login
npm run build
npm publish --access public
```

Before publishing, inspect package contents:

```sh
npm pack --dry-run
```

Confirm the package contains no PATs, private organization names, private project names, private paths, or user-specific data.
