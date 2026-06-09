import { authHeader, readPat, resolveOrganization } from "./auth.js";

export const DEFAULT_API_VERSION = "7.1";
export const PREVIEW_API_VERSION = "7.1-preview.1";
export const CHARACTER_LIMIT = 24000;

export interface AzureRequestOptions {
  organization?: string;
  project?: string;
  method?: "GET" | "POST";
  apiVersion?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  base?: "dev" | "vsrm";
}

export class AzureDevOpsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AzureDevOpsError";
  }
}

export class AzureDevOpsClient {
  async request<T>(route: string, options: AzureRequestOptions = {}): Promise<T> {
    const organization = resolveOrganization(options.organization);
    const { pat } = readPat();
    const baseHost = options.base === "vsrm" ? "vsrm.dev.azure.com" : "dev.azure.com";
    const baseUrl = `https://${baseHost}/${encodeURIComponent(organization)}`;
    const projectPrefix = options.project ? `/${encodeURIComponent(options.project)}` : "";
    const cleanRoute = route.startsWith("/") ? route : `/${route}`;
    const url = new URL(`${baseUrl}${projectPrefix}${cleanRoute}`);

    url.searchParams.set("api-version", options.apiVersion || DEFAULT_API_VERSION);
    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Authorization: authHeader(pat),
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "ado-plus-mcp"
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const text = await response.text();
    const data = text ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      throw friendlyAzureError(response.status, data ?? text, url);
    }

    return data as T;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function friendlyAzureError(status: number, payload: unknown, url: URL): AzureDevOpsError {
  const rawMessage =
    typeof payload === "object" && payload && "message" in payload
      ? String((payload as { message?: unknown }).message)
      : typeof payload === "string"
        ? payload
        : "Azure DevOps returned an error.";

  if (status === 401) {
    return new AzureDevOpsError(
      "Azure DevOps rejected the PAT. Check that AZURE_DEVOPS_PAT or AZURE_DEVOPS_PAT_FILE is correct, not expired, and belongs to the selected organization.",
      status,
      rawMessage
    );
  }

  if (status === 403) {
    return new AzureDevOpsError(
      "Azure DevOps denied access. The PAT probably needs an additional read scope for this feature, or your user does not have permission to the project/team/resource.",
      status,
      rawMessage
    );
  }

  if (status === 404) {
    return new AzureDevOpsError(
      `Azure DevOps could not find the requested organization, project, team, or resource. Check spelling and access. Endpoint: ${url.pathname}`,
      status,
      rawMessage
    );
  }

  return new AzureDevOpsError(`Azure DevOps API failure (${status}). ${rawMessage}`, status, rawMessage);
}

export function truncateOutput(text: string, limit = CHARACTER_LIMIT): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n\n[Response truncated. Add filters, lower the limit, or request a narrower report to see more.]`;
}

export function encodeTeamSegment(team?: string): string {
  if (!team || !team.trim()) {
    throw new Error("Team is required for this tool. Provide team in the tool input or set AZURE_DEVOPS_DEFAULT_TEAM.");
  }
  return encodeURIComponent(team.trim());
}

export function valueArray<T = unknown>(data: unknown): T[] {
  if (typeof data === "object" && data && Array.isArray((data as { value?: unknown }).value)) {
    return (data as { value: T[] }).value;
  }
  return [];
}
