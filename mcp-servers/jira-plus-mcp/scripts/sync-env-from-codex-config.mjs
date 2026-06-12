#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG_PATH = process.env.CODEX_CONFIG_PATH || path.join(os.homedir(), ".codex", "config.toml");
const ENV_PATH = process.env.JIRA_PLUS_ENV_PATH || path.resolve(".env");

const CODEX_KEYS = [
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "JIRA_API_TOKEN_FILE",
  "JIRA_DEFAULT_PROJECT",
  "JIRA_DEFAULT_BOARD",
  "JIRA_DEFAULT_SPRINT",
  "JIRA_TIMEZONE",
  "JIRA_ENABLE_WRITE_TOOLS",
  "JIRA_ENABLE_DANGEROUS_TOOLS"
];

const OPTIONAL_PLACEHOLDERS = [
  "# Optional convenience settings. Uncomment and update only if you want local defaults.",
  "# JIRA_DEFAULT_PROJECT=YOUR_PROJECT_KEY_HERE",
  "# JIRA_DEFAULT_BOARD=YOUR_BOARD_ID_HERE",
  "# JIRA_DEFAULT_SPRINT=YOUR_SPRINT_ID_HERE",
  "# JIRA_TIMEZONE=UTC",
  "# JIRA_ENABLE_WRITE_TOOLS=false"
];

const config = readFile(CONFIG_PATH, "Codex config");
const jiraEnv = parseTomlSection(config, "mcp_servers.jira_plus.env");

if (!Object.keys(jiraEnv).length) {
  throw new Error(`No [mcp_servers.jira_plus.env] section found in ${CONFIG_PATH}`);
}

const lines = [
  "# Generated from ~/.codex/config.toml [mcp_servers.jira_plus.env].",
  "# Re-run `npm run sync-env:codex` after changing Codex MCP settings.",
  ...CODEX_KEYS
    .filter((key) => jiraEnv[key])
    .map((key) => `${key}=${escapeEnv(jiraEnv[key])}`),
  "",
  ...OPTIONAL_PLACEHOLDERS
];

fs.writeFileSync(ENV_PATH, `${lines.join("\n")}\n`, { mode: 0o600 });

const summary = CODEX_KEYS
  .filter((key) => lines.some((line) => line.startsWith(`${key}=`)))
  .map((key) => `${key}: ${isSecretKey(key) ? "set" : "written"}`);

console.log(`Wrote ${ENV_PATH}`);
console.log(summary.join("\n"));

function readFile(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${label} at ${filePath}: ${error.message}`);
  }
}

function parseTomlSection(text, sectionName) {
  const sectionHeader = `[${sectionName}]`;
  const values = {};
  let active = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      active = line === sectionHeader;
      continue;
    }

    if (!active) continue;

    const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    values[match[1]] = parseTomlString(match[2]);
  }

  return values;
}

function parseTomlString(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function escapeEnv(value) {
  if (/^[A-Za-z0-9_./:@%+-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function isSecretKey(key) {
  return /TOKEN|EMAIL|SECRET|PASSWORD|KEY/.test(key);
}
