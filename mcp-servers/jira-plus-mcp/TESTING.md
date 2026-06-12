# Testing jira-plus-mcp Before Publishing

This guide helps you test `jira-plus-mcp` locally before publishing it to GitHub or npm.

Start with read-only mode. Only test write mode in a disposable Jira project where creating and changing test issues is safe.

Plans/Roadmaps tools are read-only. Atlassian marks the Plans API experimental and may require global Jira administrator permission, so a permission-denied result is acceptable as long as the MCP returns a clear message and the normal project, board, sprint, issue, reporting, and write-mode tools still work.

## 1. Open the Package Folder

```bash
cd /path/to/jira-plus-mcp
```

## 2. Install Dependencies

If your normal npm cache works:

```bash
npm install
```

If npm reports cache permission errors, use a temporary cache:

```bash
npm install --cache /private/tmp/jira-plus-mcp-npm-cache
```

## 3. Build the Server

```bash
npm run build
```

Expected result:

- The command finishes without TypeScript errors.
- `dist/index.js` exists.

## 4. Configure Environment Values

If your MCP client already passes `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` or `JIRA_API_TOKEN_FILE`, you do not need a local `.env`.

For local terminal testing, copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and replace the placeholders:

```bash
JIRA_BASE_URL=https://YOUR_JIRA_SITE_NAME.atlassian.net
JIRA_EMAIL=YOUR_EMAIL_HERE
JIRA_API_TOKEN=YOUR_API_TOKEN_HERE
```

Optional convenience settings:

```bash
# JIRA_DEFAULT_PROJECT=YOUR_PROJECT_KEY_HERE
# JIRA_DEFAULT_BOARD=YOUR_BOARD_ID_HERE
# JIRA_DEFAULT_SPRINT=YOUR_SPRINT_ID_HERE
# JIRA_ENABLE_WRITE_TOOLS=false
```

Keep `JIRA_ENABLE_WRITE_TOOLS` omitted or set to `false` for the first round of testing.

## 5. Optional: Use a Token File Instead

Mac/Linux:

```bash
mkdir -p ~/.config/jira-plus-mcp
printf "%s" "YOUR_API_TOKEN_HERE" > ~/.config/jira-plus-mcp/token
chmod 600 ~/.config/jira-plus-mcp/token
```

Then set this in `.env`:

```bash
JIRA_API_TOKEN_FILE=/path/to/jira-plus-mcp/token
```

Remove or comment out `JIRA_API_TOKEN` if you want to confirm token-file loading works.

## 6. Quick Startup Check

Do not run the server as a normal app and wait for output. MCP stdio servers stay open waiting for a client.

Use this short check instead:

```bash
node dist/index.js
```

Expected result:

- The process keeps running quietly.
- Stop it with `Ctrl+C`.

If it immediately exits with an error, check your `.env` values.

## 7. Test with Codex

Add this MCP server to your Codex config:

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

Restart Codex after changing the config.

Try these prompts:

- "Use Jira to run get_connection_status."
- "Use Jira to get myself."
- "Use Jira to list my projects."
- "Use Jira to get project capabilities for YOUR_PROJECT_KEY_HERE."
- "Use Jira to get project YOUR_PROJECT_KEY_HERE."
- "Use Jira to list boards for YOUR_PROJECT_KEY_HERE."
- "Use Jira to get the current sprint for board YOUR_BOARD_ID_HERE."
- "Use Jira to list open bugs in sprint YOUR_SPRINT_ID_HERE."
- "Use Jira to create a sprint summary report for sprint YOUR_SPRINT_ID_HERE."

Expected result:

- Jira data is returned.
- Responses are concise and business-friendly.
- Write tools are not available.

## 8. Test with Claude Desktop

Fastest option: run the guided setup:

```bash
npm run setup:claude
```

It asks for your Jira site, email, and token, then updates Claude Desktop config safely.

Advanced non-interactive option:

```bash
npm run setup:claude -- --base-url https://YOUR_JIRA_SITE_NAME.atlassian.net --email YOUR_EMAIL_HERE --token YOUR_API_TOKEN_HERE --disable-write-tools
```

Alternative safer option: let the package insert the `jira_plus` block in the right JSON location:

```bash
npm run configure:claude
npm run validate:claude
```

Then replace the placeholders in Claude Desktop config and fully restart Claude.

Manual option: add this to Claude Desktop MCP configuration inside the existing `mcpServers` object:

```json
{
  "mcpServers": {
    "jira_plus": {
      "command": "node",
      "args": [
        "/path/to/jira-plus-mcp/dist/index.js"
      ],
      "env": {
        "JIRA_BASE_URL": "https://YOUR_JIRA_SITE_NAME.atlassian.net",
        "JIRA_EMAIL": "YOUR_EMAIL_HERE",
        "JIRA_API_TOKEN": "YOUR_API_TOKEN_HERE"
      }
    }
  }
}
```

Optional convenience settings can be added inside `env`:

```json
{
  "JIRA_DEFAULT_PROJECT": "YOUR_PROJECT_KEY_HERE",
  "JIRA_DEFAULT_BOARD": "YOUR_BOARD_ID_HERE",
  "JIRA_DEFAULT_SPRINT": "YOUR_SPRINT_ID_HERE",
  "JIRA_ENABLE_WRITE_TOOLS": "false"
}
```

Full config with optional convenience settings:

```json
{
  "mcpServers": {
    "jira_plus": {
      "command": "node",
      "args": [
        "/path/to/jira-plus-mcp/dist/index.js"
      ],
      "env": {
        "JIRA_BASE_URL": "https://YOUR_JIRA_SITE_NAME.atlassian.net",
        "JIRA_EMAIL": "YOUR_EMAIL_HERE",
        "JIRA_API_TOKEN": "YOUR_API_TOKEN_HERE",
        "JIRA_DEFAULT_PROJECT": "YOUR_PROJECT_KEY_HERE",
        "JIRA_DEFAULT_BOARD": "YOUR_BOARD_ID_HERE",
        "JIRA_DEFAULT_SPRINT": "YOUR_SPRINT_ID_HERE",
        "JIRA_ENABLE_WRITE_TOOLS": "false"
      }
    }
  }
}
```

Restart Claude Desktop completely.

Try:

- "List Jira projects."
- "Search Jira issues in YOUR_PROJECT_KEY_HERE updated this week."
- "Create a project delivery report for YOUR_PROJECT_KEY_HERE."

## 8A. Test with VS Code

From the `jira-plus-mcp` folder:

```bash
npm run setup:vscode
npm run validate:vscode
```

If you do not have Jira details yet, choose `no` during setup and update placeholders later in:

```text
.vscode/mcp.json
```

You can also write placeholders without prompts:

```bash
npm run setup:vscode -- --placeholders
```

Restart or reload VS Code, then ask:

```text
Use jira_plus to run get_connection_status.
```

## 8B. Test with Cursor

From the `jira-plus-mcp` folder:

```bash
npm run setup:cursor
npm run validate:cursor
```

If you do not have Jira details yet, choose `no` during setup and update placeholders later in:

```text
~/.cursor/mcp.json
```

You can also write placeholders without prompts:

```bash
npm run setup:cursor -- --placeholders
```

Restart or reload Cursor, then ask:

```text
Use jira_plus to run get_connection_status.
```

## 9. Test Error Messages

Temporarily change one setting at a time and restart the MCP client.

Check these cases:

- Blank `JIRA_BASE_URL`
- Blank `JIRA_EMAIL`
- Blank `JIRA_API_TOKEN` and no `JIRA_API_TOKEN_FILE`
- Wrong token
- Wrong project key
- Wrong board ID
- Wrong sprint ID
- Wrong issue key

Expected result:

- The MCP returns a clear, friendly error explaining what to fix.

## 10. Test Advanced Read Access

Ask:

- "Use Jira to list Plans. If Jira denies access, explain what permission is needed."
- "Use Jira to find Plans for project YOUR_PROJECT_KEY_HERE."
- "Use Jira to safely GET /rest/api/3/field."

Expected result:

- Plans tools return plan data or a friendly message that Jira administrator permission may be required.
- Project, board, sprint, issue, and reporting tools still work even if Plans access is denied.
- `jira_api_get` accepts safe Jira REST `GET` paths and rejects full URLs, query strings in the path, parent traversal, and non-Jira REST paths.

## 11. Test Output Truncation

Use a broad JQL query with a high limit:

```text
project = YOUR_PROJECT_KEY_HERE ORDER BY updated DESC
```

Ask:

- "Search Jira with this JQL and limit 100: project = YOUR_PROJECT_KEY_HERE ORDER BY updated DESC."

Expected result:

- The server returns a bounded response.
- If output is too large, it includes a truncation message telling you to lower the limit or narrow the query.

## 12. Confirm Write Tools Are Hidden by Default

With this setting:

```bash
JIRA_ENABLE_WRITE_TOOLS=false
```

Ask your MCP client:

- "What Jira tools are available?"

Expected result:

- Read tools are available.
- Write tools such as `create_issue`, `assign_issue`, and `transition_issue` are not available.

## 13. Optional Write-Mode Test

Only do this in a test Jira project.

Change:

```bash
JIRA_ENABLE_WRITE_TOOLS=true
```

Restart your MCP client.

Test in this order:

1. Create a test issue:

   "Use Jira to create a Task in YOUR_PROJECT_KEY_HERE titled 'jira-plus-mcp local test'."

2. Add a comment:

   "Use Jira to add a comment to YOUR_ISSUE_KEY_HERE saying 'Local MCP write-mode test comment.'"

3. Add a label:

   "Use Jira to add label jira-plus-mcp-test to YOUR_ISSUE_KEY_HERE."

4. Remove the label:

   "Use Jira to remove label jira-plus-mcp-test from YOUR_ISSUE_KEY_HERE."

5. List transitions:

   "Use Jira to list transitions for YOUR_ISSUE_KEY_HERE."

6. Transition only if you are sure the target transition is safe:

   "Use Jira to transition YOUR_ISSUE_KEY_HERE using transition ID YOUR_TRANSITION_ID_HERE."

Expected result:

- Write tools appear only after enabling write mode.
- Updates return before/after style summaries where possible.
- The tool requires explicit issue keys, labels, account IDs, transition IDs, or field objects.

## 14. Optional Project Plan Dry Run

Use `create_project_plan` with `dry_run=true` first.

Example prompt:

```text
Use Jira to dry-run a project plan in YOUR_PROJECT_KEY_HERE with one Epic named "Learning MCP", one Story named "Create first MCP lesson", and one Subtask named "Draft outline".
```

Expected result:

- Nothing is created in Jira.
- The response says what would be created.
- Duplicate issues are reused, skipped, or flagged according to the duplicate strategy.

Only after reviewing the dry run, run the same plan with:

```text
dry_run=false
```

## 15. Package Dry Run

Run:

```bash
npm pack --dry-run
```

If npm cache permissions fail:

```bash
npm pack --dry-run --cache /private/tmp/jira-plus-mcp-npm-cache
```

Expected result:

- The package includes `dist`, `README.md`, `EVALUATION.md`, `LICENSE`, `.env.example`, and `package.json`.
- The package does not include `.env`, tokens, local test files, or `node_modules`.

## 16. Public-Safety Scan

Run:

```bash
rg -n "YOUR_API_TOKEN_HERE|YOUR_EMAIL_HERE|YOUR_PROJECT_KEY_HERE|YOUR_BOARD_ID_HERE|YOUR_SPRINT_ID_HERE|YOUR_ISSUE_KEY_HERE|YOUR_ACCOUNT_ID_HERE" README.md .env.example EVALUATION.md TESTING.md
```

Expected result:

- Placeholder values are present in documentation.

Then scan for accidental real values before publishing:

```bash
rg -n "atlassian.net|JIRA_API_TOKEN=|@|/Users/" README.md EVALUATION.md TESTING.md .env.example src package.json
```

Expected result:

- Only placeholders appear.
- No real Jira domains, emails, tokens, project keys, issue keys, board IDs, sprint IDs, or account IDs appear.

## 17. Final Pre-Publish Checklist

- `npm run build` passes.
- Read-only tools work in at least one MCP client.
- Plans/Roadmaps tools either work or return a friendly Jira-admin-permission message.
- `jira_api_get` is read-only and rejects unsafe paths.
- Write tools are hidden when `JIRA_ENABLE_WRITE_TOOLS=false`.
- Optional write-mode tests were run only in a safe test project.
- `npm pack --dry-run` shows only publish-safe files.
- `.env` is not committed.
- README examples use placeholders only.
- No real company, project, board, sprint, issue, email, token, domain, or account ID is present.
