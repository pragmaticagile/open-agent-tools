import { AzureDevOpsClient, PREVIEW_API_VERSION, valueArray } from "../azure/client.js";
import type { CapacitySummary, NormalizedWorkItem } from "../azure/types.js";
import { escapePipe, resolveDeliveryPlan, resolveProject, resolveTeam, workItemTable } from "../format.js";
import { getTeamCapacity, listDeliveryPlans, listSprintWorkItems, resolveDeliveryPlanId } from "../azure/workItems.js";

const DONE_STATES = new Set(["done", "closed", "completed", "resolved", "removed"]);

export function summarizeCapacity(capacity: CapacitySummary): string {
  const lines = [
    `Team members with capacity: ${capacity.teamMembers.length}`,
    `Total daily capacity: ${round(capacity.totalCapacityPerDay)}`,
    `Days off entries: ${capacity.daysOffCount}`
  ];
  if (capacity.warnings.length) lines.push(`Warnings: ${capacity.warnings.join("; ")}`);
  return lines.join("\n");
}

export function sprintHealth(items: NormalizedWorkItem[], capacity?: CapacitySummary): {
  status: "green" | "yellow" | "red";
  reasons: string[];
  warnings: string[];
  metrics: Record<string, number>;
} {
  const total = items.length;
  const completed = items.filter((item) => DONE_STATES.has(item.state.toLowerCase())).length;
  const openBugs = items.filter((item) => item.type.toLowerCase() === "bug" && !DONE_STATES.has(item.state.toLowerCase())).length;
  const remainingWork = sum(items.map((item) => item.remainingWork));
  const completedWork = sum(items.map((item) => item.completedWork));
  const missingOwner = items.filter((item) => item.owner === "Unassigned").length;
  const missingEstimate = items.filter((item) => item.remainingWork === undefined && item.originalEstimate === undefined).length;
  const warnings: string[] = [];
  if (missingOwner) warnings.push(`${missingOwner} item(s) missing owner.`);
  if (missingEstimate) warnings.push(`${missingEstimate} item(s) missing estimate.`);
  if (capacity && !capacity.teamMembers.length) warnings.push("No capacity data available.");

  const completionRate = total ? completed / total : 0;
  const reasons: string[] = [];
  let status: "green" | "yellow" | "red" = "green";

  if (openBugs >= 5 || (remainingWork > 0 && completedWork === 0 && total > 5)) {
    status = "red";
    reasons.push("High open bug count or low evidence of completed work.");
  } else if (openBugs > 0 || completionRate < 0.5 || warnings.length) {
    status = "yellow";
    reasons.push("Some quality, completion, or data-quality concerns need attention.");
  } else {
    reasons.push("Completion and quality signals look healthy from available data.");
  }

  return {
    status,
    reasons,
    warnings,
    metrics: {
      total,
      completed,
      openBugs,
      remainingWork: round(remainingWork),
      completedWork: round(completedWork),
      missingOwner,
      missingEstimate
    }
  };
}

export async function createSprintSummaryReport(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; team?: string; limit?: number }
): Promise<string> {
  const project = resolveProject(params.project);
  const team = resolveTeam(params.team);
  const [{ sprint, items }, capacityResult] = await Promise.all([
    listSprintWorkItems(client, { ...params, project, team, limit: params.limit || 200 }),
    getTeamCapacity(client, { ...params, project, team }).catch(() => undefined)
  ]);
  const health = sprintHealth(items, capacityResult?.capacity);
  const bugs = items.filter((item) => item.type.toLowerCase() === "bug" && !DONE_STATES.has(item.state.toLowerCase()));
  const risks = buildSprintRisks(items, bugs, health.warnings);

  return [
    `# Sprint Summary Report`,
    "",
    `Project: ${project}`,
    `Team: ${team}`,
    `Sprint: ${sprint.iterationName}`,
    sprint.startDate || sprint.finishDate ? `Dates: ${sprint.startDate || "Unknown"} to ${sprint.finishDate || "Unknown"}` : "",
    "",
    `## Health`,
    `Status: ${health.status.toUpperCase()}`,
    `Reason: ${health.reasons.join(" ")}`,
    "",
    `## Scope And Completion`,
    `- Total items: ${health.metrics.total}`,
    `- Completed items: ${health.metrics.completed}`,
    `- Open bugs: ${health.metrics.openBugs}`,
    `- Remaining work: ${health.metrics.remainingWork}`,
    `- Completed work: ${health.metrics.completedWork}`,
    "",
    `## Capacity`,
    capacityResult ? summarizeCapacity(capacityResult.capacity) : "Capacity could not be loaded. Check team permissions and sprint capacity setup.",
    "",
    `## Quality Concerns`,
    bugs.length ? workItemTable(bugs.slice(0, 25)) : "No open bugs found in the sprint.",
    "",
    `## Delivery Risks`,
    risks.length ? risks.map((risk) => `- ${risk}`).join("\n") : "No major delivery risks detected from available fields.",
    "",
    `## Recommended Next Actions`,
    recommendedSprintActions(health, risks).map((action) => `- ${action}`).join("\n"),
    "",
    `## Work Items`,
    workItemTable(items.slice(0, 50))
  ].filter(Boolean).join("\n");
}

export async function createDeliveryPlanReport(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; delivery_plan?: string; limit?: number }
): Promise<string> {
  const project = resolveProject(params.project);
  const deliveryPlan = resolveDeliveryPlan(params.delivery_plan);
  const planId = await resolveDeliveryPlanId(client, { ...params, project, deliveryPlan });
  const [timeline, plans] = await Promise.all([
    client.request<Record<string, unknown>>(`/_apis/work/plans/${encodeURIComponent(planId)}/timeline`, {
      organization: params.organization,
      project,
      apiVersion: PREVIEW_API_VERSION
    }).catch((error) => ({ timelineError: error instanceof Error ? error.message : String(error) })),
    listDeliveryPlans(client, { ...params, project })
  ]);
  const plan = plans.find((candidate) => String(candidate.id) === planId || String(candidate.name) === deliveryPlan);
  const cards = extractTimelineCards(timeline).slice(0, params.limit || 100);
  const epics = cards.filter((card) => String(card.type).toLowerCase().includes("epic") || String(card.workItemType).toLowerCase().includes("epic"));
  const risks = identifyDeliveryRisksFromCards(epics.length ? epics : cards);

  return [
    `# Delivery Plan Report`,
    "",
    `Project: ${project}`,
    `Delivery plan: ${escapePipe(String(plan?.name || deliveryPlan))}`,
    `Plan ID: ${planId}`,
    "",
    `## Summary`,
    `- Timeline items reviewed: ${cards.length}`,
    `- Epics visible: ${epics.length}`,
    `- Active risks: ${risks.length}`,
    "timelineError" in timeline ? `- Timeline note: ${String(timeline.timelineError)}` : "",
    "",
    `## Epics And Major Items`,
    cards.length ? timelineTable(epics.length ? epics : cards.slice(0, 50)) : "No timeline cards were returned. Check Delivery Plans permissions and whether the plan contains visible work items.",
    "",
    `## Delivery Risks`,
    risks.length ? risks.map((risk) => `- ${risk}`).join("\n") : "No overdue or missing-field risks detected from available timeline data.",
    "",
    `## Recommended Next Actions`,
    recommendedDeliveryActions(risks).map((action) => `- ${action}`).join("\n")
  ].filter(Boolean).join("\n");
}

export function extractTimelineCards(timeline: Record<string, unknown>): Array<Record<string, unknown>> {
  const cards: Array<Record<string, unknown>> = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    const looksLikeCard = ("id" in obj || "workItemId" in obj) && ("title" in obj || "name" in obj || "fields" in obj);
    if (looksLikeCard) cards.push(flattenTimelineCard(obj));
    for (const nested of Object.values(obj)) {
      if (Array.isArray(nested)) visit(nested);
    }
  };
  visit(timeline);
  return dedupeCards(cards);
}

function flattenTimelineCard(card: Record<string, unknown>): Record<string, unknown> {
  const fields = (card.fields || {}) as Record<string, unknown>;
  return {
    id: card.id || card.workItemId || fields["System.Id"],
    title: card.title || card.name || fields["System.Title"] || "(No title)",
    type: card.type || card.workItemType || fields["System.WorkItemType"] || "Work Item",
    workItemType: card.workItemType || fields["System.WorkItemType"] || card.type,
    state: card.state || fields["System.State"] || "Unknown",
    owner: card.assignedTo || fields["System.AssignedTo"] || "Unassigned",
    startDate: card.startDate || fields["Microsoft.VSTS.Scheduling.StartDate"],
    targetDate: card.targetDate || card.finishDate || fields["Microsoft.VSTS.Scheduling.TargetDate"] || fields["Microsoft.VSTS.Scheduling.DueDate"]
  };
}

function dedupeCards(cards: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = String(card.id || card.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function timelineTable(cards: Array<Record<string, unknown>>): string {
  const lines = ["| ID | Type | Title | State | Owner | Start | Target |", "|---:|---|---|---|---|---|---|"];
  for (const card of cards) {
    lines.push(
      `| ${escapePipe(card.id)} | ${escapePipe(card.type)} | ${escapePipe(card.title)} | ${escapePipe(card.state)} | ${escapePipe(card.owner)} | ${escapePipe(card.startDate || "")} | ${escapePipe(card.targetDate || "")} |`
    );
  }
  return lines.join("\n");
}

function identifyDeliveryRisksFromCards(cards: Array<Record<string, unknown>>): string[] {
  const today = new Date();
  const risks: string[] = [];
  for (const card of cards) {
    const label = `${card.id || "No ID"} ${card.title || "(No title)"}`;
    if (!card.owner || String(card.owner) === "Unassigned") risks.push(`${label}: missing owner.`);
    if (!card.targetDate) risks.push(`${label}: missing target date.`);
    if (card.targetDate && new Date(String(card.targetDate)) < today && !DONE_STATES.has(String(card.state || "").toLowerCase())) {
      risks.push(`${label}: target date appears overdue while state is ${card.state || "unknown"}.`);
    }
  }
  return risks.slice(0, 30);
}

function buildSprintRisks(items: NormalizedWorkItem[], bugs: NormalizedWorkItem[], warnings: string[]): string[] {
  const risks = [...warnings];
  if (bugs.length) risks.push(`${bugs.length} open bug(s) in the sprint may affect quality or release confidence.`);
  const unassignedActive = items.filter((item) => item.owner === "Unassigned" && !DONE_STATES.has(item.state.toLowerCase())).length;
  if (unassignedActive) risks.push(`${unassignedActive} active item(s) are unassigned.`);
  const noRemainingWork = items.filter((item) => !DONE_STATES.has(item.state.toLowerCase()) && item.remainingWork === undefined).length;
  if (noRemainingWork) risks.push(`${noRemainingWork} active item(s) are missing remaining-work estimates.`);
  return risks.slice(0, 20);
}

function recommendedSprintActions(health: ReturnType<typeof sprintHealth>, risks: string[]): string[] {
  const actions = ["Review unassigned or unestimated active items.", "Confirm open bug ownership and expected fix dates."];
  if (health.status === "red") actions.unshift("Hold a short delivery-risk review with owners today.");
  if (!risks.length) actions.push("Keep sprint scope stable and continue normal daily tracking.");
  return actions;
}

function recommendedDeliveryActions(risks: string[]): string[] {
  if (!risks.length) return ["Keep target dates and owners current as the plan changes."];
  return ["Add missing owners and target dates.", "Review overdue items with accountable owners.", "Confirm whether at-risk epics need scope, date, or dependency changes."];
}

function sum(values: Array<number | undefined>): number {
  return values.reduce<number>((total, value) => total + (value || 0), 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
