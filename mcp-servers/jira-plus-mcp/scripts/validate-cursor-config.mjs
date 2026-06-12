#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const configPath = process.env.CURSOR_MCP_CONFIG_PATH || path.join(os.homedir(), ".cursor", "mcp.json");
if (!fs.existsSync(configPath)) fail(`Cursor MCP config not found: ${configPath}`);

let config;
try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); }
catch (error) { fail(`Cursor MCP config is not valid JSON: ${error.message}`); }

const jira = config?.mcpServers?.jira_plus;
if (!jira) fail("Missing mcpServers.jira_plus. Run `npm run setup:cursor`.");

const issues = [];
if (jira.command !== "node") issues.push("mcpServers.jira_plus.command should be \"node\".");
if (!Array.isArray(jira.args) || !jira.args.some((arg) => String(arg).endsWith("dist/index.js"))) issues.push("mcpServers.jira_plus.args should include dist/index.js.");
if (!jira.env?.JIRA_BASE_URL) issues.push("Missing JIRA_BASE_URL.");
if (!jira.env?.JIRA_EMAIL) issues.push("Missing JIRA_EMAIL.");
if (!jira.env?.JIRA_API_TOKEN && !jira.env?.JIRA_API_TOKEN_FILE) issues.push("Missing JIRA_API_TOKEN or JIRA_API_TOKEN_FILE.");
if (issues.length) fail(issues.join("\n"));

console.log("Cursor MCP config looks ready for jira_plus.");
console.log(`Config: ${configPath}`);
console.log(`Write tools: ${jira.env.JIRA_ENABLE_WRITE_TOOLS === "true" ? "enabled" : "disabled/read-only"}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
