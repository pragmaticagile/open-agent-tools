# jira-plus-mcp Evaluation Notes

Use these checks before publishing or changing tool behavior.

## Build Check

Run:

```bash
npm install
npm run build
```

Expected result: TypeScript compiles and `dist/index.js` exists.

## Read-Only Smoke Test

Set placeholder-free local environment values:

```bash
JIRA_BASE_URL=https://YOUR_JIRA_SITE_NAME.atlassian.net
JIRA_EMAIL=YOUR_EMAIL_HERE
JIRA_API_TOKEN=YOUR_API_TOKEN_HERE
JIRA_ENABLE_WRITE_TOOLS=false
```

Connect from an MCP client and try:

- "Use Jira to run get_connection_status."
- "Use Jira to get myself."
- "List my Jira projects."
- "Get project capabilities for YOUR_PROJECT_KEY_HERE."
- "List boards for YOUR_PROJECT_KEY_HERE."
- "Find the current sprint for board YOUR_BOARD_ID_HERE."
- "Create a sprint summary report for sprint YOUR_SPRINT_ID_HERE."
- "List Jira Plans. If access is denied, explain the permission requirement."
- "Safely GET /rest/api/3/field."

Expected result: write tools are not listed, read tools return concise summaries, and large responses are truncated with guidance.
Plans tools either return data or a friendly Jira-admin-permission message without affecting other tools. `jira_api_get` allows only read-only Jira REST paths under `/rest/api/3/` or `/rest/agile/1.0/`.

## Write-Mode Safety Test

Only use a disposable Jira project.

```bash
JIRA_ENABLE_WRITE_TOOLS=true
```

Try:

- Create a test issue with a unique summary.
- Add a comment to that issue.
- Add and remove a test label.
- List transitions before transitioning.
- Dry-run `create_project_plan` with `dry_run=true` and confirm no issues are created.

Expected result: write tools appear only after write mode is enabled. Tools require explicit issue keys, account IDs, transition IDs, field objects, or sprint IDs.
Batch plan creation defaults to dry-run and reports duplicate/reuse behavior before writing.

## Error Checks

Verify friendly errors for:

- Missing `JIRA_BASE_URL`
- Missing `JIRA_EMAIL`
- Missing `JIRA_API_TOKEN` and `JIRA_API_TOKEN_FILE`
- Bad API token
- Unknown project key
- Unknown board ID
- Unknown sprint ID
- Unknown issue key
- Plans access denied for a non-admin Jira account
- Unsafe `jira_api_get` path, such as a full URL or non-Jira REST path

## Public-Safety Checklist

- No real company names, domains, emails, issue keys, account IDs, board IDs, sprint IDs, or tokens in docs.
- `.env` files are ignored.
- README examples use only placeholders.
- Write mode is off by default.
- Plans/Roadmaps access is permission-aware and read-only.
- Safe generic API access is GET-only and path-restricted.
- No delete tools are registered.
