# Contributing

Thanks for helping improve `open-agent-tools`.

## Adding An MCP Server

1. Create a new folder under `mcp-servers/`.
2. Include a clear `README.md`.
3. Include a `.env.example` with placeholders only.
4. Keep secrets out of code, tests, docs, and examples.
5. Add build and test commands.
6. Run the publishing checklist before opening a pull request.

## Adding A Codex Skill

1. Create a new folder under `skills/`.
2. Add `SKILL.md`.
3. Keep instructions focused and reusable.
4. Put scripts in `scripts/` and reusable context in `references/` only when needed.
5. Avoid private user, company, customer, or project data.

## Placeholder Rules

Use generic placeholders in docs and examples:

- `YOUR_ORGANIZATION_NAME_HERE`
- `YOUR_PROJECT_NAME_HERE`
- `YOUR_REPOSITORY_NAME_HERE`
- `YOUR_TEAM_NAME_HERE`
- `YOUR_DELIVERY_PLAN_NAME_HERE`
- `YOUR_PIPELINE_ID_HERE`
- `YOUR_PAT_HERE`
- `YOUR_EMAIL_HERE`
- `YOUR_API_TOKEN_HERE`
- `https://YOUR_JIRA_SITE_NAME.atlassian.net`
- `/FULL/PATH/TO/...`

## Before Committing

Run a local scan for private data:

```sh
rg -n --hidden "PAT|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|BEGIN RSA|BEGIN OPENSSH" .
rg -n --hidden "YOUR_PAT_HERE|YOUR_ORGANIZATION_NAME_HERE|YOUR_PROJECT_NAME_HERE" .
```

The second command should find placeholders only.
