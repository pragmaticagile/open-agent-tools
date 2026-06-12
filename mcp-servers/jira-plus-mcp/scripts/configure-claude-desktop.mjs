#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const configPath = process.env.CLAUDE_DESKTOP_CONFIG_PATH || path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
const serverPath = path.resolve("dist", "index.js");
const force = process.argv.includes("--force");

const placeholderServer = {
  command: "node",
  args: [serverPath],
  env: {
    JIRA_BASE_URL: "https://YOUR_JIRA_SITE_NAME.atlassian.net",
    JIRA_EMAIL: "YOUR_EMAIL_HERE",
    JIRA_API_TOKEN: "YOUR_API_TOKEN_HERE",
    JIRA_ENABLE_WRITE_TOOLS: "false"
  }
};

fs.mkdirSync(path.dirname(configPath), { recursive: true });

const config = readJsonConfig(configPath);
config.mcpServers = isPlainObject(config.mcpServers) ? config.mcpServers : {};

if (config.mcpServers.jira_plus && !force) {
  console.log("jira_plus already exists in Claude Desktop config. No changes made.");
  console.log("Use `npm run configure:claude -- --force` to replace the existing jira_plus block.");
  process.exit(0);
}

backupFile(configPath);
config.mcpServers.jira_plus = placeholderServer;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });

console.log(`Updated Claude Desktop config: ${configPath}`);
console.log("Next steps:");
console.log("1. Replace YOUR_JIRA_SITE_NAME, YOUR_EMAIL_HERE, and YOUR_API_TOKEN_HERE.");
console.log("2. Keep JIRA_ENABLE_WRITE_TOOLS=false for the first test.");
console.log("3. Fully quit and reopen Claude Desktop.");
console.log("4. Ask Claude: Use jira_plus to run get_connection_status.");

function readJsonConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Claude Desktop config is not valid JSON: ${filePath}\n${error.message}`);
  }
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const backupPath = `${filePath}.bak-${timestamp()}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backup created: ${backupPath}`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
