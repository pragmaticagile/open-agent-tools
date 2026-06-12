import fs from "node:fs";

export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  tokenSource: "env" | "file";
  defaultProject?: string;
  defaultBoard?: string;
  defaultSprint?: string;
  timezone: string;
}

export function readJiraConfig(): JiraConfig {
  const baseUrl = normalizeBaseUrl(process.env.JIRA_BASE_URL);
  const email = readRequiredEnv("JIRA_EMAIL");
  const tokenInfo = readToken();

  return {
    baseUrl,
    email,
    token: tokenInfo.token,
    tokenSource: tokenInfo.source,
    defaultProject: cleanOptional(process.env.JIRA_DEFAULT_PROJECT),
    defaultBoard: cleanOptional(process.env.JIRA_DEFAULT_BOARD),
    defaultSprint: cleanOptional(process.env.JIRA_DEFAULT_SPRINT),
    timezone: cleanOptional(process.env.JIRA_TIMEZONE) || "UTC"
  };
}

export function authHeader(email: string, token: string): string {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

export function readJiraConfigStatus(): {
  baseUrlPresent: boolean;
  emailPresent: boolean;
  tokenPresent: boolean;
  tokenSource?: "env" | "file";
  defaultProject?: string;
  defaultBoard?: string;
  defaultSprint?: string;
  timezone: string;
} {
  const tokenEnv = cleanOptional(process.env.JIRA_API_TOKEN);
  const tokenFile = cleanOptional(process.env.JIRA_API_TOKEN_FILE);
  return {
    baseUrlPresent: Boolean(cleanOptional(process.env.JIRA_BASE_URL)),
    emailPresent: Boolean(cleanOptional(process.env.JIRA_EMAIL)),
    tokenPresent: Boolean(tokenEnv || tokenFile),
    tokenSource: tokenEnv ? "env" : tokenFile ? "file" : undefined,
    defaultProject: cleanOptional(process.env.JIRA_DEFAULT_PROJECT),
    defaultBoard: cleanOptional(process.env.JIRA_DEFAULT_BOARD),
    defaultSprint: cleanOptional(process.env.JIRA_DEFAULT_SPRINT),
    timezone: cleanOptional(process.env.JIRA_TIMEZONE) || "UTC"
  };
}

function readRequiredEnv(name: string): string {
  const value = cleanOptional(process.env[name]);
  if (!value) {
    throw new Error(`Missing ${name}. Set it in your MCP client environment or in a local .env file.`);
  }
  return value;
}

function readToken(): { token: string; source: "env" | "file" } {
  const direct = cleanOptional(process.env.JIRA_API_TOKEN);
  if (direct) {
    return { token: direct, source: "env" };
  }

  const tokenFile = cleanOptional(process.env.JIRA_API_TOKEN_FILE);
  if (tokenFile) {
    try {
      const value = fs.readFileSync(tokenFile, "utf8").trim();
      if (value) {
        return { token: value, source: "file" };
      }
    } catch (error) {
      throw new Error(`Could not read JIRA_API_TOKEN_FILE. Check that the file exists and is readable. ${String(error)}`);
    }
  }

  throw new Error("Missing Jira API token. Set JIRA_API_TOKEN or JIRA_API_TOKEN_FILE.");
}

function normalizeBaseUrl(raw: string | undefined): string {
  const value = cleanOptional(raw);
  if (!value) {
    throw new Error("Missing JIRA_BASE_URL. Example: https://YOUR_JIRA_SITE_NAME.atlassian.net");
  }
  const withProtocol = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function cleanOptional(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}
