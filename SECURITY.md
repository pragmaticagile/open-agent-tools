# Security

This repository is intended for public tools. Please do not include private credentials or organization-specific data.

## Never Commit

- Azure DevOps PATs
- API keys
- OAuth tokens
- cookies
- private certificates
- `.env` files
- local MCP client config files
- private organization, project, team, sprint, repo, or customer data

## Reporting A Security Issue

If this repository is public and you find a security issue, please open a private security advisory on GitHub if available. If not, open an issue that describes the behavior without including secrets.

## Recommended User Setup

- Use read-only scopes when possible.
- Store tokens in local files outside the repository.
- Use short expiration dates.
- Rotate tokens regularly.
- Do not paste tokens into chat.
