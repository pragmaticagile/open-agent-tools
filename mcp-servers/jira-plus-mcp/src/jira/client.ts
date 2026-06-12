import { authHeader, readJiraConfig } from "./auth.js";

export const CHARACTER_LIMIT = 24000;

export interface JiraRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  api?: "platform" | "agile";
}

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export class JiraClient {
  async request<T>(route: string, options: JiraRequestOptions = {}): Promise<T> {
    const config = readJiraConfig();
    const cleanRoute = route.startsWith("/") ? route : `/${route}`;
    const url = new URL(`${config.baseUrl}${cleanRoute}`);

    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: authHeader(config.email, config.token),
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "jira-plus-mcp"
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const text = await response.text();
    const data = text ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      throw friendlyJiraError(response.status, data ?? text, url);
    }

    return data as T;
  }

  defaultProject(project?: string): string {
    return resolveWithDefault(project, readJiraConfig().defaultProject, "project key", "JIRA_DEFAULT_PROJECT");
  }

  defaultBoard(boardId?: number): number {
    const value = boardId ?? numberFromEnv(readJiraConfig().defaultBoard);
    if (!value) {
      throw new Error("Board ID is required. Provide board_id or set JIRA_DEFAULT_BOARD.");
    }
    return value;
  }

  defaultSprint(sprintId?: number): number {
    const value = sprintId ?? numberFromEnv(readJiraConfig().defaultSprint);
    if (!value) {
      throw new Error("Sprint ID is required. Provide sprint_id or set JIRA_DEFAULT_SPRINT.");
    }
    return value;
  }

  async safeReadPath<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const cleanPath = normalizeSafeReadPath(path);
    return this.request<T>(cleanPath, { method: "GET", query });
  }
}

export function toolText(value: unknown, responseFormat: "markdown" | "json" = "markdown") {
  const text = responseFormat === "json" ? JSON.stringify(value, null, 2) : String(value);
  return {
    content: [
      {
        type: "text" as const,
        text: truncateOutput(text)
      }
    ]
  };
}

export async function safeTool(work: () => Promise<ReturnType<typeof toolText>>): Promise<ReturnType<typeof toolText>> {
  try {
    return await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return toolText(`Error: ${message}`);
  }
}

export function valueArray<T>(data: unknown): T[] {
  if (typeof data === "object" && data && Array.isArray((data as { values?: unknown }).values)) {
    return (data as { values: T[] }).values;
  }
  if (typeof data === "object" && data && Array.isArray((data as { value?: unknown }).value)) {
    return (data as { value: T[] }).value;
  }
  if (Array.isArray(data)) {
    return data as T[];
  }
  return [];
}

export function truncateOutput(text: string, limit = CHARACTER_LIMIT): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n\n[Response truncated. Use a lower limit, narrower JQL, or a more specific board/project/sprint to see more.]`;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function friendlyJiraError(status: number, payload: unknown, url: URL): JiraApiError {
  const rawMessage = extractMessage(payload);
  const isPlansEndpoint = url.pathname.startsWith("/rest/api/3/plans/");

  if (status === 401) {
    return new JiraApiError("Jira rejected the email/API token. Check JIRA_EMAIL and JIRA_API_TOKEN or JIRA_API_TOKEN_FILE.", status, rawMessage);
  }
  if (status === 403) {
    if (isPlansEndpoint) {
      return new JiraApiError("Jira denied access to Plans/Roadmaps. Atlassian's Plans API is admin-gated; ask a Jira administrator for the required global permission, or use project, board, sprint, and issue tools instead.", status, rawMessage);
    }
    return new JiraApiError("Jira denied access. Your account or API token may not have permission for this project, board, issue, or write action.", status, rawMessage);
  }
  if (status === 404) {
    return new JiraApiError(`Jira could not find the requested project, board, sprint, issue, or endpoint. Check spelling and access. Endpoint: ${url.pathname}`, status, rawMessage);
  }
  if (status === 410) {
    return new JiraApiError("This jira-plus-mcp build is calling a retired Jira API. Upgrade or rebuild the connector so it uses Atlassian's current REST API.", status, rawMessage);
  }
  if (status === 429) {
    return new JiraApiError("Jira rate limited the request. Try again later or narrow the query.", status, rawMessage);
  }

  return new JiraApiError(`Jira API failure (${status}). ${rawMessage}`, status, rawMessage);
}

function extractMessage(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (typeof payload === "object" && payload) {
    const object = payload as { errorMessages?: unknown; errors?: unknown; message?: unknown };
    if (Array.isArray(object.errorMessages) && object.errorMessages.length) {
      return object.errorMessages.map(String).join("; ");
    }
    if (object.message) {
      return String(object.message);
    }
    if (object.errors) {
      return JSON.stringify(object.errors);
    }
  }
  return "Jira returned an error.";
}

function resolveWithDefault(value: string | undefined, fallback: string | undefined, label: string, envName: string): string {
  const resolved = value?.trim() || fallback?.trim();
  if (!resolved) {
    throw new Error(`A ${label} is required. Provide it in the tool input or set ${envName}.`);
  }
  return resolved;
}

function numberFromEnv(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSafeReadPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error("Safe Jira read paths must start with /rest/api/3/ or /rest/agile/1.0/.");
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("..") || trimmed.includes("#") || trimmed.includes("?")) {
    throw new Error("Provide only a Jira REST path, not a full URL, fragment, parent traversal, or inline query string. Put query values in the query object.");
  }
  const allowedPrefixes = ["/rest/api/3/", "/rest/agile/1.0/"];
  if (!allowedPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    throw new Error("This safe read tool only allows Jira Cloud REST paths under /rest/api/3/ or /rest/agile/1.0/.");
  }
  return trimmed;
}
