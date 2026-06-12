# Publishing Checklist

Use this checklist before pushing a new MCP server or Codex skill to a public repository.

## Privacy

- No `.env` files.
- No PAT files.
- No API keys, API tokens, PATs, cookies, certificates, or credentials.
- No local MCP client config.
- No private organization names.
- No private project names.
- No private repository names.
- No private team names.
- No private sprint names.
- No private work item IDs.
- No copied real test output.

## Placeholders

Public examples should use placeholders such as:

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

## Build And Package

For Node MCP packages:

```sh
npm install
npm run build
npm test
npm pack --dry-run
```

Confirm the package tarball includes only expected public files.

## GitHub

- Add a clear root README.
- Add a license.
- Add `SECURITY.md`.
- Add package-specific README files.
- Confirm `.gitignore` excludes local secrets and dependency folders.
- Confirm generated media, local launch drafts, and large temporary artifacts are not included by accident.
