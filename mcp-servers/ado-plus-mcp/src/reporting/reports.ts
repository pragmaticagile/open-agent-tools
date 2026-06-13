import { AzureDevOpsClient, PREVIEW_API_VERSION, valueArray } from "../azure/client.js";
import type { CapacitySummary, NormalizedWorkItem } from "../azure/types.js";
import { escapePipe, resolveDeliveryPlan, resolveProject, resolveTeam, workItemTable } from "../format.js";
import { getCurrentSprint, getTeamCapacity, getWorkItemsByIds, listDeliveryPlans, listSprintWorkItems, resolveDeliveryPlanId, runWiql } from "../azure/workItems.js";

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

export async function listWorkItemsClosedOnDate(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; date?: string; iteration_path?: string; work_item_type?: string; limit?: number }
): Promise<{ project: string; date: string; count: number; items: NormalizedWorkItem[]; warnings: string[] }> {
  const project = resolveProject(params.project);
  const date = normalizeReportDate(params.date);
  const nextDate = addDays(date, 1);
  const clauses = [
    `[System.TeamProject] = '${escapeWiql(project)}'`,
    `[Microsoft.VSTS.Common.ClosedDate] >= '${date}T00:00:00Z'`,
    `[Microsoft.VSTS.Common.ClosedDate] < '${nextDate}T00:00:00Z'`
  ];
  if (params.iteration_path) clauses.push(`[System.IterationPath] = '${escapeWiql(params.iteration_path)}'`);
  if (params.work_item_type) clauses.push(`[System.WorkItemType] = '${escapeWiql(params.work_item_type)}'`);
  const ids = await runWiql(client, {
    organization: params.organization,
    project,
    limit: params.limit || 100,
    query: `SELECT [System.Id] FROM WorkItems WHERE ${clauses.join(" AND ")} ORDER BY [System.AssignedTo], [System.Id]`
  });
  const items = await getWorkItemsByIds(client, { organization: params.organization, ids });
  const warnings = items.some((item) => item.completedWork === undefined)
    ? ["Some closed items are missing Completed Work, so completed effort totals may be understated."]
    : [];
  return { project, date, count: items.length, items, warnings };
}

export async function createYesterdayTeamWorkReport(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; team?: string; date?: string; limit?: number }
): Promise<string> {
  const project = resolveProject(params.project);
  const team = resolveTeam(params.team);
  const date = normalizeReportDate(params.date);
  const [{ sprint, capacity }, closedResult] = await Promise.all([
    getTeamCapacity(client, { organization: params.organization, project, team }),
    getCurrentSprint(client, { organization: params.organization, project, team })
      .then((sprint) => listWorkItemsClosedOnDate(client, {
        organization: params.organization,
        project,
        date,
        iteration_path: sprint.iterationPath,
        limit: params.limit || 200
      }).then((result) => ({ sprint, result })))
  ]);
  const closedItems = closedResult.result.items;
  const rows = buildTeamWorkRows(date, capacity, closedItems);
  const totalCapacity = sum(rows.map((row) => row.capacityForDate));
  const totalCompletedWork = sum(rows.map((row) => row.completedWork));
  const zeroCompletion = rows.filter((row) => row.completedItemIds.length === 0 && !row.wasOff).length;
  const offMembers = rows.filter((row) => row.wasOff).length;
  const missingEffort = closedItems.filter((item) => item.completedWork === undefined).length;
  const warnings = [
    ...closedResult.result.warnings,
    missingEffort ? `${missingEffort} closed item(s) do not have Completed Work.` : "",
    capacity.teamMembers.length ? "" : "No team capacity data is available for this sprint/team."
  ].filter(Boolean);

  return [
    "# Yesterday Team Work Report",
    "",
    `Project: ${project}`,
    `Team: ${team}`,
    `Sprint: ${sprint.iterationName}`,
    `Report date: ${date}`,
    "",
    "## Summary",
    `- Team members reviewed: ${rows.length}`,
    `- Members off: ${offMembers}`,
    `- Members with no completed work and not marked off: ${zeroCompletion}`,
    `- Closed items: ${closedItems.length}`,
    `- Team capacity for the date: ${round(totalCapacity)}`,
    `- Completed work on closed items: ${round(totalCompletedWork)}`,
    "",
    "## Team Member Detail",
    teamWorkTable(rows),
    "",
    "## Completed Items",
    closedItems.length ? workItemTable(closedItems.slice(0, 50)) : "No work items were closed on the report date in the current sprint.",
    "",
    "## Warnings",
    warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- None",
    "",
    "## Recommended Next Actions",
    [
      zeroCompletion ? "Check whether members with no completed work were focused on in-progress work, support, reviews, or meetings." : "",
      missingEffort ? "Update Completed Work on closed items where effort tracking is expected." : "",
      "Use the completed item IDs for daily standup follow-up and delivery evidence."
    ].filter(Boolean).map((action) => `- ${action}`).join("\n")
  ].join("\n");
}

export async function listLongAgingWorkItems(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; iteration_path?: string; age_days?: number; limit?: number }
): Promise<{ project: string; ageDays: number; cutoffDate: string; count: number; items: NormalizedWorkItem[] }> {
  const project = resolveProject(params.project);
  const ageDays = params.age_days && params.age_days > 0 ? params.age_days : 14;
  const cutoffDate = addDays(todayDate(), -ageDays);
  const doneStates = ["Closed", "Done", "Completed", "Resolved", "Removed"];
  const clauses = [
    `[System.TeamProject] = '${escapeWiql(project)}'`,
    `[System.State] NOT IN (${doneStates.map((state) => `'${state}'`).join(", ")})`,
    `[System.ChangedDate] <= '${cutoffDate}T23:59:59Z'`
  ];
  if (params.iteration_path) clauses.push(`[System.IterationPath] = '${escapeWiql(params.iteration_path)}'`);
  const ids = await runWiql(client, {
    organization: params.organization,
    project,
    limit: params.limit || 100,
    query: `SELECT [System.Id] FROM WorkItems WHERE ${clauses.join(" AND ")} ORDER BY [System.ChangedDate] ASC`
  });
  const items = await getWorkItemsByIds(client, { organization: params.organization, ids });
  return { project, ageDays, cutoffDate, count: items.length, items };
}

export async function createDailyRiskDependencyReport(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; team?: string; age_days?: number; limit?: number }
): Promise<string> {
  const project = resolveProject(params.project);
  const team = params.team ? resolveTeam(params.team) : undefined;
  const ageDays = params.age_days && params.age_days > 0 ? params.age_days : 14;
  const limit = params.limit || 100;
  const sprintResult = team
    ? await listSprintWorkItems(client, { organization: params.organization, project, team, limit }).catch(() => undefined)
    : undefined;
  const aging = await listLongAgingWorkItems(client, {
    organization: params.organization,
    project,
    iteration_path: sprintResult?.sprint.iterationPath,
    age_days: ageDays,
    limit
  });
  const reviewedItems = sprintResult?.items || aging.items;
  const openBugs = reviewedItems.filter((item) => item.type.toLowerCase() === "bug" && !DONE_STATES.has(item.state.toLowerCase()));
  const unassigned = reviewedItems.filter((item) => item.owner === "Unassigned" && !DONE_STATES.has(item.state.toLowerCase()));
  const missingEstimate = reviewedItems.filter((item) => !DONE_STATES.has(item.state.toLowerCase()) && item.remainingWork === undefined && item.originalEstimate === undefined);
  const overdueTargets = reviewedItems.filter((item) => item.targetDate && new Date(item.targetDate) < new Date() && !DONE_STATES.has(item.state.toLowerCase()));
  const risks = [
    openBugs.length ? `${openBugs.length} open bug(s) may affect quality or release confidence.` : "",
    aging.items.length ? `${aging.items.length} item(s) have not changed for at least ${ageDays} day(s).` : "",
    unassigned.length ? `${unassigned.length} active item(s) are unassigned.` : "",
    missingEstimate.length ? `${missingEstimate.length} active item(s) are missing effort estimates.` : "",
    overdueTargets.length ? `${overdueTargets.length} active item(s) have overdue target dates.` : ""
  ].filter(Boolean);

  return [
    "# Daily Risk, Dependency, And Aging Report",
    "",
    `Project: ${project}`,
    team ? `Team: ${team}` : "",
    sprintResult ? `Sprint: ${sprintResult.sprint.iterationName}` : "Sprint: Not scoped to a team/current sprint",
    `Long-aging threshold: ${ageDays} days`,
    "",
    "## Risk Summary",
    risks.length ? risks.map((risk) => `- ${risk}`).join("\n") : "- No major daily risks detected from available fields.",
    "",
    "## Open Bugs",
    openBugs.length ? workItemTable(openBugs.slice(0, 25)) : "No open bugs found in the reviewed scope.",
    "",
    "## Long-Aging Items",
    aging.items.length ? workItemTable(aging.items.slice(0, 25)) : `No active items found without changes for ${ageDays} day(s).`,
    "",
    "## Ownership And Estimate Gaps",
    [
      unassigned.length ? `Unassigned active items: ${unassigned.map((item) => item.id).join(", ")}` : "Unassigned active items: none found.",
      missingEstimate.length ? `Missing estimate items: ${missingEstimate.map((item) => item.id).join(", ")}` : "Missing estimate items: none found.",
      overdueTargets.length ? `Overdue target-date items: ${overdueTargets.map((item) => item.id).join(", ")}` : "Overdue target-date items: none found."
    ].join("\n"),
    "",
    "## Dependency Notes",
    "This read-only report flags likely delivery risks from work item fields. For dependency-specific review, inspect linked work items with get_work_item when your team tracks predecessor, successor, parent, or related links.",
    "",
    "## Recommended Next Actions",
    recommendedDailyRiskActions({ openBugs: openBugs.length, aging: aging.items.length, unassigned: unassigned.length, missingEstimate: missingEstimate.length, overdueTargets: overdueTargets.length })
      .map((action) => `- ${action}`).join("\n")
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

function recommendedDailyRiskActions(counts: { openBugs: number; aging: number; unassigned: number; missingEstimate: number; overdueTargets: number }): string[] {
  const actions: string[] = [];
  if (counts.openBugs) actions.push("Confirm owner, severity, and expected fix path for open bugs.");
  if (counts.aging) actions.push("Review long-aging items and decide whether to unblock, split, close, or reassign them.");
  if (counts.unassigned) actions.push("Assign owners to active unassigned items before the next delivery checkpoint.");
  if (counts.missingEstimate) actions.push("Update missing estimates where your team uses effort tracking.");
  if (counts.overdueTargets) actions.push("Refresh target dates or agree recovery actions for overdue items.");
  return actions.length ? actions : ["Continue normal daily tracking and keep owners, estimates, and target dates current."];
}

function buildTeamWorkRows(date: string, capacity: CapacitySummary, closedItems: NormalizedWorkItem[]): Array<{
  memberName: string;
  capacityForDate: number;
  wasOff: boolean;
  completedWork: number;
  completedItemIds: number[];
}> {
  const byOwner = new Map<string, NormalizedWorkItem[]>();
  for (const item of closedItems) {
    const owner = item.owner || "Unassigned";
    byOwner.set(owner, [...(byOwner.get(owner) || []), item]);
  }
  const names = new Set<string>(capacity.teamMembers.map((member) => member.name));
  for (const owner of byOwner.keys()) names.add(owner);
  return [...names].sort((a, b) => a.localeCompare(b)).map((memberName) => {
    const member = capacity.teamMembers.find((candidate) => candidate.name === memberName);
    const items = byOwner.get(memberName) || [];
    const wasOff = member ? isOffOnDate(date, member.daysOffDetails || []) : false;
    return {
      memberName,
      capacityForDate: wasOff ? 0 : member?.totalCapacityPerDay || 0,
      wasOff,
      completedWork: round(sum(items.map((item) => item.completedWork))),
      completedItemIds: items.map((item) => item.id)
    };
  });
}

function teamWorkTable(rows: ReturnType<typeof buildTeamWorkRows>): string {
  if (!rows.length) return "No team members or completed items found.";
  const lines = ["| Team member | Capacity | Completed work | Off? | Completed item IDs |", "|---|---:|---:|---|---|"];
  for (const row of rows) {
    lines.push(
      `| ${escapePipe(row.memberName)} | ${round(row.capacityForDate)} | ${round(row.completedWork)} | ${row.wasOff ? "Yes" : "No"} | ${row.completedItemIds.length ? row.completedItemIds.join(", ") : "-"} |`
    );
  }
  return lines.join("\n");
}

function isOffOnDate(date: string, daysOff: Array<{ start?: string; end?: string }>): boolean {
  const target = new Date(`${date}T12:00:00Z`).getTime();
  return daysOff.some((dayOff) => {
    if (!dayOff.start && !dayOff.end) return false;
    const start = new Date(`${toDateOnly(dayOff.start || dayOff.end)}T00:00:00Z`).getTime();
    const end = new Date(`${toDateOnly(dayOff.end || dayOff.start)}T23:59:59Z`).getTime();
    return target >= start && target <= end;
  });
}

function normalizeReportDate(date?: string): string {
  if (!date) return addDays(todayDate(), -1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format, for example 2026-01-31.");
  }
  return date;
}

function todayDate(): string {
  const timeZone = process.env.ADO_PLUS_TIMEZONE || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fall back to UTC when the optional timezone setting is invalid.
  }
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function toDateOnly(value?: string): string {
  return value ? value.slice(0, 10) : todayDate();
}

function escapeWiql(value: string): string {
  return value.replaceAll("'", "''");
}

function sum(values: Array<number | undefined>): number {
  return values.reduce<number>((total, value) => total + (value || 0), 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
