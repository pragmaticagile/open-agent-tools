#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const configPath = process.env.CURSOR_MCP_CONFIG_PATH || path.join(os.homedir(), ".cursor", "mcp.json");
const serverPath = path.resolve("dist", "index.js");
const cliArgs = parseArgs(process.argv.slice(2));

if (!fs.existsSync(serverPath)) fail("dist/index.js was not found. Run `npm install` and `npm run build`, then run `npm run setup:cursor` again.");

const rl = readline.createInterface({ input, output });
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}).finally(() => rl.close());

async function main() {
  console.log("jira-plus-mcp Cursor setup");
  console.log("");
  console.log("This adds jira_plus to Cursor's MCP config.");
  console.log("A backup will be created before changes are written.");
  console.log("");
  const existing = readJsonConfig(configPath);
  const existingJira = existing?.mcpServers?.jira_plus;
  const details = await collectDetails(existingJira?.env || {});
  const config = isPlainObject(existing) ? existing : {};
  config.mcpServers = isPlainObject(config.mcpServers) ? config.mcpServers : {};
  backupFile(configPath);
  config.mcpServers.jira_plus = { command: "node", args: [serverPath], env: details.env };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  validate(config);
  console.log("");
  console.log("Cursor MCP config updated successfully.");
  console.log(`Config: ${configPath}`);
  console.log("Next steps:");
  if (!details.detailsNow) console.log("0. Replace the placeholder Jira URL, email, and token in Cursor MCP config.");
  console.log("1. Restart or reload Cursor.");
  console.log("2. Ask Cursor: Use jira_plus to run get_connection_status.");
}

async function collectDetails(existingEnv) {
  const hasCliDetails = Boolean(cliArgs.baseUrl || cliArgs.email || cliArgs.token || cliArgs.tokenFile);
  const detailsAnswer = cliArgs.placeholders ? "no" : hasCliDetails ? "yes" : await ask("Do you have Jira site, email, and token now? Type yes or no", "no");
  const detailsNow = !cliArgs.placeholders && detailsAnswer.trim().toLowerCase().startsWith("y");
  const baseUrl = detailsNow ? normalizeBaseUrl(cliArgs.baseUrl || await ask("Jira site URL", existingEnv.JIRA_BASE_URL || "https://YOUR_JIRA_SITE_NAME.atlassian.net")) : "https://YOUR_JIRA_SITE_NAME.atlassian.net";
  const email = detailsNow ? cliArgs.email || await ask("Jira email", existingEnv.JIRA_EMAIL || "YOUR_EMAIL_HERE") : "YOUR_EMAIL_HERE";
  const tokenMode = detailsNow ? cliArgs.tokenFile ? "yes" : cliArgs.token ? "no" : await ask("Use token file instead of pasting token? Type yes or no", existingEnv.JIRA_API_TOKEN_FILE ? "yes" : "no") : "no";
  const useTokenFile = detailsNow && tokenMode.trim().toLowerCase().startsWith("y");
  const tokenFile = useTokenFile ? cliArgs.tokenFile || await ask("Jira token file path", existingEnv.JIRA_API_TOKEN_FILE || "/path/to/jira-token.txt") : undefined;
  const token = useTokenFile ? undefined : detailsNow ? cliArgs.token || await askSecret("Jira API token", existingEnv.JIRA_API_TOKEN ? "already configured; press Enter to keep existing token" : "paste token") : "YOUR_API_TOKEN_HERE";
  const writeModeAnswer = cliArgs.placeholders ? "no" : cliArgs.write === undefined ? await ask("Enable write tools now? Type yes or no", existingEnv.JIRA_ENABLE_WRITE_TOOLS === "true" ? "yes" : "no") : cliArgs.write ? "yes" : "no";
  const env = { JIRA_BASE_URL: baseUrl, JIRA_EMAIL: email, JIRA_ENABLE_WRITE_TOOLS: writeModeAnswer.trim().toLowerCase().startsWith("y") ? "true" : "false" };
  if (useTokenFile) env.JIRA_API_TOKEN_FILE = tokenFile;
  else env.JIRA_API_TOKEN = token || existingEnv.JIRA_API_TOKEN || "YOUR_API_TOKEN_HERE";
  return { env, detailsNow };
}

async function ask(label, defaultValue) {
  const answer = await rl.question(`${label} [${defaultValue}]: `);
  return answer.trim() || defaultValue;
}

async function askSecret(label, hint) {
  const answer = await rl.question(`${label} (${hint}): `);
  return answer.trim();
}

function readJsonConfig(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (error) { fail(`Cursor MCP config is not valid JSON: ${filePath}\n${error.message}`); }
}

function validate(config) {
  const jira = config?.mcpServers?.jira_plus;
  if (!jira?.env?.JIRA_BASE_URL || !jira?.env?.JIRA_EMAIL || (!jira?.env?.JIRA_API_TOKEN && !jira?.env?.JIRA_API_TOKEN_FILE)) fail("Setup wrote the config, but required Jira settings are missing.");
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const backupPath = `${filePath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Backup created: ${backupPath}`);
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "https://YOUR_JIRA_SITE_NAME.atlassian.net";
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--base-url") result.baseUrl = args[++index];
    else if (arg === "--email") result.email = args[++index];
    else if (arg === "--token") result.token = args[++index];
    else if (arg === "--token-file") result.tokenFile = args[++index];
    else if (arg === "--enable-write-tools") result.write = true;
    else if (arg === "--disable-write-tools") result.write = false;
    else if (arg === "--placeholders") result.placeholders = true;
  }
  return result;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
