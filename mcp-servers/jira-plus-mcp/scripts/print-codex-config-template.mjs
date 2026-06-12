#!/usr/bin/env node
import path from "node:path";

const serverPath = path.resolve("dist", "index.js");

console.log(`# Add this to ~/.codex/config.toml.
# Keep optional settings commented unless you want shortcuts.

[mcp_servers.jira_plus]
command = "node"
args = ["${serverPath}"]

[mcp_servers.jira_plus.env]
JIRA_BASE_URL = "https://YOUR_JIRA_SITE_NAME.atlassian.net"
JIRA_EMAIL = "YOUR_EMAIL_HERE"
JIRA_API_TOKEN = "YOUR_API_TOKEN_HERE"

# Optional convenience settings:
# JIRA_DEFAULT_PROJECT = "YOUR_PROJECT_KEY_HERE"
# JIRA_DEFAULT_BOARD = "YOUR_BOARD_ID_HERE"
# JIRA_DEFAULT_SPRINT = "YOUR_SPRINT_ID_HERE"
# JIRA_TIMEZONE = "UTC"
# JIRA_ENABLE_WRITE_TOOLS = "false"
`);
