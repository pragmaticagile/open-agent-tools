import { JiraClient, valueArray } from "../jira/client.js";
import { endpoints } from "../jira/endpoints.js";
import { JiraIssue, JiraPage, JiraSprint, NormalizedIssue } from "../jira/types.js";

const DONE_CATEGORIES = new Set(["done"]);
const CLOSED_STATUSES = new Set(["done", "closed", "resolved", "cancelled"]);

export const DEFAULT_FIELDS = [
  "summary",
  "issuetype",
  "status",
  "assignee",
  "reporter",
  "priority",
  "labels",
  "created",
  "updated",
  "duedate",
  "components",
  "fixVersions",
  "parent",
  "issuelinks",
  "subtasks",
  "customfield_10016",
  "customfield_10020"
].join(",");

export async function searchIssues(client: JiraClient, jql: string, limit: number): Promise<JiraIssue[]> {
  const data = await client.request<JiraPage<JiraIssue>>(endpoints.issueSearchJql, {
    method: "POST",
    body: {
      jql,
      maxResults: limit,
      fields: DEFAULT_FIELDS.split(",")
    }
  });
  return data.issues || [];
}

export async function getSprintIssues(client: JiraClient, sprintId: number, limit: number, jql?: string): Promise<JiraIssue[]> {
  const data = await client.request<JiraPage<JiraIssue>>(endpoints.sprintIssues(sprintId), {
    query: {
      maxResults: limit,
      fields: DEFAULT_FIELDS,
      jql
    }
  });
  return data.issues || [];
}

export function normalizeIssue(issue: JiraIssue): NormalizedIssue {
  const fields = issue.fields || {};
  const sprintNames = extractSprintNames(fields.customfield_10020);
  const estimate = numberValue(fields.timeestimate);
  const storyPoints = numberValue(fields.customfield_10016);
  const blockers = extractBlockers(fields.issuelinks);

  return {
    key: issue.key,
    title: fields.summary || "Untitled",
    issueType: fields.issuetype?.name || "Unknown",
    status: fields.status?.name || "Unknown",
    statusCategory: fields.status?.statusCategory?.name || "Unknown",
    owner: fields.assignee?.displayName || "Unassigned",
    ownerAccountId: fields.assignee?.accountId,
    priority: fields.priority?.name || "Unspecified",
    labels: fields.labels || [],
    sprintNames,
    estimate,
    storyPoints,
    created: fields.created,
    updated: fields.updated,
    dueDate: fields.duedate || undefined,
    blockers,
    components: (fields.components || []).map((item) => item.name || item.id || "Unknown"),
    fixVersions: (fields.fixVersions || []).map((item) => item.name || item.id || "Unknown")
  };
}

export function issueTable(issues: NormalizedIssue[]): string {
  if (!issues.length) {
    return "No issues found.";
  }

  const lines = ["| Key | Type | Title | Status | Owner | Priority | Estimate | Labels |", "| --- | --- | --- | --- | --- | --- | ---: | --- |"];
  for (const issue of issues) {
    lines.push(`| ${issue.key} | ${issue.issueType} | ${escapeCell(issue.title)} | ${issue.status} | ${issue.owner} | ${issue.priority} | ${issue.storyPoints ?? issue.estimate ?? ""} | ${issue.labels.join(", ") || ""} |`);
  }
  return lines.join("\n");
}

export function summarizeIssues(issues: NormalizedIssue[], sprint?: JiraSprint) {
  const total = issues.length;
  const completed = issues.filter((issue) => DONE_CATEGORIES.has(issue.statusCategory.toLowerCase()) || CLOSED_STATUSES.has(issue.status.toLowerCase())).length;
  const openBugs = issues.filter((issue) => issue.issueType.toLowerCase() === "bug" && !CLOSED_STATUSES.has(issue.status.toLowerCase()));
  const missingOwners = issues.filter((issue) => issue.owner === "Unassigned");
  const missingEstimates = issues.filter((issue) => issue.storyPoints === undefined && issue.estimate === undefined);
  const blockers = issues.filter((issue) => issue.blockers.length > 0);
  const overdue = issues.filter((issue) => issue.dueDate && new Date(issue.dueDate) < new Date() && !CLOSED_STATUSES.has(issue.status.toLowerCase()));
  const assigneeSummary = countBy(issues.map((issue) => issue.owner));
  const statusSummary = countBy(issues.map((issue) => issue.status));
  const scopeSummary = countBy(issues.map((issue) => issue.issueType));
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const riskScore = openBugs.length * 2 + blockers.length * 3 + overdue.length * 2 + missingOwners.length + missingEstimates.length;
  const health = riskScore >= 8 || completionRate < 35 ? "red" : riskScore >= 3 || completionRate < 65 ? "yellow" : "green";

  return {
    sprint: sprint ? pickSprint(sprint) : undefined,
    health,
    total,
    completed,
    completionRate,
    openBugs,
    missingOwners,
    missingEstimates,
    blockers,
    overdue,
    assigneeSummary,
    statusSummary,
    scopeSummary,
    deliveryRisks: deliveryRisks(openBugs, blockers, overdue, missingOwners, missingEstimates),
    recommendedActions: recommendedActions(openBugs, blockers, overdue, missingOwners, missingEstimates)
  };
}

export function summaryMarkdown(title: string, issues: NormalizedIssue[], sprint?: JiraSprint): string {
  const summary = summarizeIssues(issues, sprint);
  const lines = [
    `# ${title}`,
    "",
    sprint ? `Sprint: ${sprint.name || sprint.id} (${sprint.state || "unknown"})` : undefined,
    sprint?.startDate || sprint?.endDate ? `Dates: ${sprint.startDate || "unknown"} to ${sprint.endDate || "unknown"}` : undefined,
    "",
    `Health: ${summary.health.toUpperCase()}`,
    `Scope: ${summary.total} issue(s), ${summary.completed} completed (${summary.completionRate}%)`,
    `Open bugs: ${summary.openBugs.length}`,
    `Blocked issues: ${summary.blockers.length}`,
    `Overdue issues: ${summary.overdue.length}`,
    `Missing owners: ${summary.missingOwners.length}`,
    `Missing estimates: ${summary.missingEstimates.length}`,
    "",
    "## Issues",
    issueTable(issues),
    "",
    "## Delivery Risks",
    bulletList(summary.deliveryRisks),
    "",
    "## Recommended Next Actions",
    bulletList(summary.recommendedActions),
    "",
    "## Status Summary",
    bulletCounts(summary.statusSummary),
    "",
    "## Assignee Summary",
    bulletCounts(summary.assigneeSummary)
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
}

export function pickSprint(sprint: JiraSprint) {
  return {
    id: sprint.id,
    name: sprint.name,
    state: sprint.state,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    completeDate: sprint.completeDate,
    goal: sprint.goal
  };
}

export function extractValues<T>(data: unknown): T[] {
  return valueArray<T>(data);
}

function deliveryRisks(openBugs: NormalizedIssue[], blockers: NormalizedIssue[], overdue: NormalizedIssue[], missingOwners: NormalizedIssue[], missingEstimates: NormalizedIssue[]): string[] {
  const risks: string[] = [];
  if (openBugs.length) risks.push(`${openBugs.length} open bug(s) may affect quality or release confidence.`);
  if (blockers.length) risks.push(`${blockers.length} issue(s) have blocker links that need active follow-up.`);
  if (overdue.length) risks.push(`${overdue.length} issue(s) are past due and still open.`);
  if (missingOwners.length) risks.push(`${missingOwners.length} issue(s) are unassigned.`);
  if (missingEstimates.length) risks.push(`${missingEstimates.length} issue(s) are missing story points or estimates.`);
  return risks.length ? risks : ["No major delivery risks found in the returned issue set."];
}

function recommendedActions(openBugs: NormalizedIssue[], blockers: NormalizedIssue[], overdue: NormalizedIssue[], missingOwners: NormalizedIssue[], missingEstimates: NormalizedIssue[]): string[] {
  const actions: string[] = [];
  if (blockers.length) actions.push("Review blocker links and confirm each blocker has an owner and next step.");
  if (openBugs.length) actions.push("Triage open bugs by severity, owner, and target fix date.");
  if (overdue.length) actions.push("Reconfirm due dates for overdue work or move it out of the committed scope.");
  if (missingOwners.length) actions.push("Assign every unowned issue before the next standup.");
  if (missingEstimates.length) actions.push("Add estimates to unestimated work so scope and capacity are visible.");
  return actions.length ? actions : ["Keep monitoring scope changes, open defects, and blocked work."];
}

function extractSprintNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (typeof item === "object" && item && "name" in item) {
      return String((item as { name?: unknown }).name || "");
    }
    return "";
  }).filter(Boolean);
}

function extractBlockers(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((link) => {
    if (typeof link !== "object" || !link) {
      return [];
    }
    const typed = link as { type?: { name?: string; inward?: string; outward?: string }; inwardIssue?: { key?: string }; outwardIssue?: { key?: string } };
    const text = `${typed.type?.name || ""} ${typed.type?.inward || ""} ${typed.type?.outward || ""}`.toLowerCase();
    if (!text.includes("block")) {
      return [];
    }
    return [typed.inwardIssue?.key, typed.outwardIssue?.key].filter((key): key is string => Boolean(key));
  });
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function bulletCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([name, count]) => `- ${name}: ${count}`).join("\n") : "- None";
}

function bulletList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
