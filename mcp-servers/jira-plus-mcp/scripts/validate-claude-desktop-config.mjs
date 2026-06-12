#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const configPath = process.env.CLAUDE_DESKTOP_CONFIG_PATH || path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");

if (!fs.existsSync(configPath)) {
  fail(`Claude Desktop config not found: ${configPath}`);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (error) {
  fail(`Claude Desktop config is not valid JSON: ${error.message}`);
}

const jira = config?.mcpServers?.jira_plus;
if (!jira) {
  fail("Missing mcpServers.jira_plus. Run `npm run configure:claude` or add jira_plus inside the existing mcpServers object.");
}

const issues = [];
if (jira.command !== "node") issues.push("jira_plus.command should be \"node\".");
if (!Array.isArray(jira.args) || !jira.args.some((arg) => String(arg).endsWith("dist/index.js"))) issues.push("jira_plus.args should include the path to dist/index.js.");
if (!jira.env?.JIRA_BASE_URL) issues.push("Missing jira_plus.env.JIRA_BASE_URL.");
if (!jira.env?.JIRA_EMAIL) issues.push("Missing jira_plus.env.JIRA_EMAIL.");
if (!jira.env?.JIRA_API_TOKEN && !jira.env?.JIRA_API_TOKEN_FILE) issues.push("Missing JIRA_API_TOKEN or JIRA_API_TOKEN_FILE.");

if (issues.length) {
  fail(issues.join("\n"));
}

console.log("Claude Desktop config looks ready for jira_plus.");
console.log(`Config: ${configPath}`);
console.log(`Write tools: ${jira.env.JIRA_ENABLE_WRITE_TOOLS === "true" ? "enabled" : "disabled/read-only"}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
