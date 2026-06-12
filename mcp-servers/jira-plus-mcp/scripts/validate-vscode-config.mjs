#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const configPath = process.env.VSCODE_MCP_CONFIG_PATH || path.resolve(".vscode", "mcp.json");
if (!fs.existsSync(configPath)) fail(`VS Code MCP config not found: ${configPath}`);

let config;
try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); }
catch (error) { fail(`VS Code MCP config is not valid JSON: ${error.message}`); }

const jira = config?.servers?.jira_plus;
if (!jira) fail("Missing servers.jira_plus. Run `npm run setup:vscode`.");

const issues = [];
if (jira.command !== "node") issues.push("servers.jira_plus.command should be \"node\".");
if (!Array.isArray(jira.args) || !jira.args.some((arg) => String(arg).endsWith("dist/index.js"))) issues.push("servers.jira_plus.args should include dist/index.js.");
if (!jira.env?.JIRA_BASE_URL) issues.push("Missing JIRA_BASE_URL.");
if (!jira.env?.JIRA_EMAIL) issues.push("Missing JIRA_EMAIL.");
if (!jira.env?.JIRA_API_TOKEN && !jira.env?.JIRA_API_TOKEN_FILE) issues.push("Missing JIRA_API_TOKEN or JIRA_API_TOKEN_FILE.");
if (issues.length) fail(issues.join("\n"));

console.log("VS Code MCP config looks ready for jira_plus.");
console.log(`Config: ${configPath}`);
console.log(`Write tools: ${jira.env.JIRA_ENABLE_WRITE_TOOLS === "true" ? "enabled" : "disabled/read-only"}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
