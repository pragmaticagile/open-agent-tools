# ado-plus-mcp Evaluation Notes

Use this checklist before publishing or sharing the MCP.

## Build Check

```sh
npm install
npm run build
npm test
```

Expected result: TypeScript builds successfully and `dist/index.js` exists.

## Stdio Startup Check

MCP servers wait for stdio messages, so do not run them as a normal one-off command unless you use a timeout.

```sh
timeout 5s node dist/index.js
```

Expected result: the process starts and waits for MCP input. A timeout is normal.

## Manual MCP Client Checks

Configure a local MCP client with placeholders replaced by your own organization name and PAT file path. Then try:

- Use ado_plus to list my Azure DevOps projects.
- Use ado_plus to list repositories in project YOUR_PROJECT_NAME_HERE.
- Use ado_plus to list open bugs in the current sprint for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to create a sprint summary report for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to create a yesterday team work report for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to list long-aging work items older than 14 days in project YOUR_PROJECT_NAME_HERE.
- Use ado_plus to create a daily risk dependency report for team YOUR_TEAM_NAME_HERE.
- Use ado_plus to create a delivery plan report for YOUR_DELIVERY_PLAN_NAME_HERE.

## Privacy Check

Before publishing, scan the repository for:

- Real PAT values
- Private organization names
- Private project names
- Private repository names
- Private team names
- Private sprint names
- Real work item IDs from your organization
- User-specific local paths

Recommended commands:

```sh
rg -n "YOUR_PAT_HERE|YOUR_ORGANIZATION_NAME_HERE|YOUR_PROJECT_NAME_HERE" README.md .env.example src
rg -n "AZURE_DEVOPS_PAT=.{10,}" .
npm pack --dry-run
```

The first command should find placeholders only. The second command should not find real PAT values.
