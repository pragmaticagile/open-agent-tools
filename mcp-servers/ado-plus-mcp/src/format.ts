import { truncateOutput } from "./azure/client.js";
import type { NormalizedWorkItem, ResponseFormat } from "./azure/types.js";

export function toolText(data: unknown, responseFormat: ResponseFormat = "markdown"): { content: Array<{ type: "text"; text: string }> } {
  const text = responseFormat === "json" ? JSON.stringify(data, null, 2) : String(data);
  return { content: [{ type: "text", text: truncateOutput(text) }] };
}

export function toolError(error: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Error: ${message}\n\nNext steps: check the organization, project/team names, PAT expiration, and PAT read scopes for the Azure DevOps area you are using.`
      }
    ]
  };
}

export function ownerName(value: unknown): string {
  if (!value) return "Unassigned";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "displayName" in value) {
    return String((value as { displayName?: unknown }).displayName || "Unassigned");
  }
  return "Unassigned";
}

export function fieldString(fields: Record<string, unknown>, key: string, fallback = ""): string {
  const value = fields[key];
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

export function fieldNumber(fields: Record<string, unknown>, key: string): number | undefined {
  const value = fields[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

export function normalizeWorkItem(item: { id: number; url?: string; fields?: Record<string, unknown> }): NormalizedWorkItem {
  const fields = item.fields || {};
  return {
    id: item.id,
    title: fieldString(fields, "System.Title", "(No title)"),
    type: fieldString(fields, "System.WorkItemType", "Work Item"),
    state: fieldString(fields, "System.State", "Unknown"),
    owner: ownerName(fields["System.AssignedTo"]),
    iteration: fieldString(fields, "System.IterationPath"),
    area: fieldString(fields, "System.AreaPath"),
    startDate: fieldString(fields, "Microsoft.VSTS.Scheduling.StartDate") || undefined,
    targetDate:
      fieldString(fields, "Microsoft.VSTS.Scheduling.TargetDate") ||
      fieldString(fields, "Microsoft.VSTS.Scheduling.DueDate") ||
      undefined,
    closedDate: fieldString(fields, "Microsoft.VSTS.Common.ClosedDate") || undefined,
    changedDate: fieldString(fields, "System.ChangedDate") || undefined,
    remainingWork: fieldNumber(fields, "Microsoft.VSTS.Scheduling.RemainingWork"),
    completedWork: fieldNumber(fields, "Microsoft.VSTS.Scheduling.CompletedWork"),
    originalEstimate: fieldNumber(fields, "Microsoft.VSTS.Scheduling.OriginalEstimate"),
    severity: fieldString(fields, "Microsoft.VSTS.Common.Severity") || undefined,
    priority: fieldNumber(fields, "Microsoft.VSTS.Common.Priority") ?? (fieldString(fields, "Microsoft.VSTS.Common.Priority") || undefined),
    url: item.url
  };
}

export function workItemTable(items: NormalizedWorkItem[]): string {
  if (!items.length) return "No work items found.";
  const lines = ["| ID | Type | Title | State | Owner | Iteration |", "|---:|---|---|---|---|---|"];
  for (const item of items) {
    lines.push(`| ${item.id} | ${escapePipe(item.type)} | ${escapePipe(item.title)} | ${escapePipe(item.state)} | ${escapePipe(item.owner)} | ${escapePipe(item.iteration)} |`);
  }
  return lines.join("\n");
}

export function escapePipe(value: unknown): string {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

export function resolveProject(input?: string): string {
  const project = input || process.env.AZURE_DEVOPS_DEFAULT_PROJECT;
  if (!project || !project.trim()) {
    throw new Error("Project is required for this tool. Provide project in the tool input or set AZURE_DEVOPS_DEFAULT_PROJECT.");
  }
  return project.trim();
}

export function resolveTeam(input?: string): string {
  const team = input || process.env.AZURE_DEVOPS_DEFAULT_TEAM;
  if (!team || !team.trim()) {
    throw new Error("Team is required for this tool. Provide team in the tool input or set AZURE_DEVOPS_DEFAULT_TEAM.");
  }
  return team.trim();
}

export function resolveRepository(input?: string): string {
  const repo = input || process.env.AZURE_DEVOPS_DEFAULT_REPOSITORY;
  if (!repo || !repo.trim()) {
    throw new Error("Repository is required for this tool. Provide repository in the tool input or set AZURE_DEVOPS_DEFAULT_REPOSITORY.");
  }
  return repo.trim();
}

export function resolveDeliveryPlan(input?: string): string {
  const plan = input || process.env.AZURE_DEVOPS_DEFAULT_DELIVERY_PLAN;
  if (!plan || !plan.trim()) {
    throw new Error("Delivery plan name or ID is required. Provide delivery_plan in the tool input or set AZURE_DEVOPS_DEFAULT_DELIVERY_PLAN.");
  }
  return plan.trim();
}

export function resolvePipeline(input?: string | number): string {
  const pipeline = input || process.env.AZURE_DEVOPS_DEFAULT_PIPELINE;
  if (!pipeline || String(pipeline).trim() === "") {
    throw new Error("Pipeline ID is required. Provide pipeline_id in the tool input or set AZURE_DEVOPS_DEFAULT_PIPELINE.");
  }
  return String(pipeline).trim();
}
