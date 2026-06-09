import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AzureDevOpsClient, PREVIEW_API_VERSION, valueArray } from "../azure/client.js";
import { getCurrentSprint, getTeamCapacity, getWorkItem, getWorkItemsByIds, listDeliveryPlans, listSprintWorkItems, resolveDeliveryPlanId, runWiql } from "../azure/workItems.js";
import { createDeliveryPlanReport, createSprintSummaryReport, extractTimelineCards, sprintHealth, summarizeCapacity } from "../reporting/reports.js";
import { normalizeWorkItem, resolveDeliveryPlan, resolvePipeline, resolveProject, resolveRepository, resolveTeam, toolError, toolText, workItemTable } from "../format.js";
import { limit, offset, organization, project, responseFormat, team } from "./schemas.js";

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

export function registerTools(server: McpServer, client: AzureDevOpsClient): void {
  server.registerTool("list_projects", {
    title: "List Azure DevOps Projects",
    description: "List Azure DevOps projects in the configured organization. Use this first when the user does not know the exact project name.",
    inputSchema: { organization, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>("/_apis/projects", {
      organization: params.organization,
      query: { $top: params.limit }
    });
    const projects = valueArray<Record<string, unknown>>(data).map((item) => ({
      id: item.id,
      name: item.name,
      state: item.state,
      visibility: item.visibility,
      description: item.description
    }));
    return params.response_format === "json"
      ? toolText({ count: projects.length, projects }, "json")
      : toolText(["# Azure DevOps Projects", "", ...projects.map((p) => `- ${p.name} (${p.id}) - ${p.state || "unknown"}`)].join("\n"));
  }));

  server.registerTool("list_project_teams", {
    title: "List Project Teams",
    description: "List teams in an Azure DevOps project. Helpful before sprint, capacity, and dashboard tools that need a team name.",
    inputSchema: { organization, project, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>(`/_apis/projects/${encodeURIComponent(projectName)}/teams`, {
      organization: params.organization,
      query: { $top: params.limit }
    });
    const teams = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json"
      ? toolText({ project: projectName, count: teams.length, teams }, "json")
      : toolText(["# Project Teams", "", `Project: ${projectName}`, "", ...teams.map((t) => `- ${t.name} (${t.id})`)].join("\n"));
  }));

  server.registerTool("search_work_items", {
    title: "Search Work Items",
    description: "Search work items with a safe WIQL query built from text, state, type, owner, and iteration filters. Returns concise fields useful for planning and reporting.",
    inputSchema: {
      organization,
      project,
      text: z.string().min(1).optional().describe("Text to search in work item titles."),
      work_item_type: z.string().min(1).optional().describe("Optional type such as Bug, User Story, Feature, Epic, Task."),
      state: z.string().min(1).optional().describe("Optional state filter such as Active, New, Resolved, Closed."),
      assigned_to: z.string().min(1).optional().describe("Optional owner display name or email."),
      iteration_path: z.string().min(1).optional().describe("Optional exact iteration path."),
      limit,
      response_format: responseFormat
    },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const clauses = [`[System.TeamProject] = '${escapeWiql(projectName)}'`];
    if (params.text) clauses.push(`[System.Title] CONTAINS '${escapeWiql(params.text)}'`);
    if (params.work_item_type) clauses.push(`[System.WorkItemType] = '${escapeWiql(params.work_item_type)}'`);
    if (params.state) clauses.push(`[System.State] = '${escapeWiql(params.state)}'`);
    if (params.assigned_to) clauses.push(`[System.AssignedTo] CONTAINS '${escapeWiql(params.assigned_to)}'`);
    if (params.iteration_path) clauses.push(`[System.IterationPath] = '${escapeWiql(params.iteration_path)}'`);
    const ids = await runWiql(client, {
      organization: params.organization,
      project: projectName,
      limit: params.limit,
      query: `SELECT [System.Id] FROM WorkItems WHERE ${clauses.join(" AND ")} ORDER BY [System.ChangedDate] DESC`
    });
    const items = await getWorkItemsByIds(client, { organization: params.organization, ids });
    return params.response_format === "json" ? toolText({ count: items.length, items }, "json") : toolText(workItemTable(items));
  }));

  server.registerTool("get_work_item", {
    title: "Get Work Item",
    description: "Get one Azure DevOps work item by ID, including common fields and relations.",
    inputSchema: { organization, id: z.number().int().positive().describe("Azure DevOps work item ID."), response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const item = await getWorkItem(client, { organization: params.organization, id: params.id });
    const normalized = normalizeWorkItem(item);
    return params.response_format === "json" ? toolText({ item, normalized }, "json") : toolText(workItemMarkdown(normalized));
  }));

  server.registerTool("list_current_sprint", {
    title: "List Current Sprint",
    description: "Find the current sprint/iteration for a project and team.",
    inputSchema: { organization, project, team, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const sprint = await getCurrentSprint(client, params);
    return params.response_format === "json" ? toolText(sprint, "json") : toolText(`# Current Sprint\n\nProject: ${sprint.project}\nTeam: ${sprint.team}\nSprint: ${sprint.iterationName}\nIteration path: ${sprint.iterationPath || "Unknown"}\nDates: ${sprint.startDate || "Unknown"} to ${sprint.finishDate || "Unknown"}`);
  }));

  server.registerTool("list_sprint_work_items", {
    title: "List Sprint Work Items",
    description: "List work items in the current sprint for a project and team.",
    inputSchema: { organization, project, team, iteration_id: z.string().optional(), limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const result = await listSprintWorkItems(client, { ...params, iterationId: params.iteration_id });
    return params.response_format === "json" ? toolText(result, "json") : toolText(`# Sprint Work Items\n\nProject: ${result.sprint.project}\nTeam: ${result.sprint.team}\nSprint: ${result.sprint.iterationName}\n\n${workItemTable(result.items)}`);
  }));

  server.registerTool("list_sprint_bugs", {
    title: "List Sprint Bugs",
    description: "List bugs in the current sprint for a project and team.",
    inputSchema: { organization, project, team, iteration_id: z.string().optional(), include_closed: z.boolean().default(false), limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const result = await listSprintWorkItems(client, { ...params, iterationId: params.iteration_id });
    const bugs = result.items.filter((item) => item.type.toLowerCase() === "bug" && (params.include_closed || !["closed", "done", "resolved", "removed"].includes(item.state.toLowerCase())));
    return params.response_format === "json" ? toolText({ sprint: result.sprint, count: bugs.length, bugs }, "json") : toolText(`# Sprint Bugs\n\nProject: ${result.sprint.project}\nTeam: ${result.sprint.team}\nSprint: ${result.sprint.iterationName}\n\n${workItemTable(bugs)}`);
  }));

  server.registerTool("list_open_bugs_in_sprint", {
    title: "List Open Bugs In Sprint",
    description: "Business-friendly open bug list for the current sprint, including owner, state, severity, priority, and risk hints.",
    inputSchema: { organization, project, team, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const result = await listSprintWorkItems(client, params);
    const bugs = result.items.filter((item) => item.type.toLowerCase() === "bug" && !["closed", "done", "resolved", "removed"].includes(item.state.toLowerCase()));
    const markdown = [`# Open Bugs In Current Sprint`, "", `Project: ${result.sprint.project}`, `Team: ${result.sprint.team}`, `Sprint: ${result.sprint.iterationName}`, "", workItemTable(bugs), "", "## Quality Concerns", bugs.length ? `- ${bugs.length} open bug(s) need ownership and expected fix dates.` : "- No open bugs found."].join("\n");
    return params.response_format === "json" ? toolText({ sprint: result.sprint, bugs }, "json") : toolText(markdown);
  }));

  server.registerTool("get_team_capacity", {
    title: "Get Team Capacity",
    description: "Get raw team capacity for the current sprint.",
    inputSchema: { organization, project, team, iteration_id: z.string().optional(), response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const result = await getTeamCapacity(client, { ...params, iterationId: params.iteration_id });
    return params.response_format === "json" ? toolText(result, "json") : toolText(`# Team Capacity\n\nProject: ${result.sprint.project}\nTeam: ${result.sprint.team}\nSprint: ${result.sprint.iterationName}\n\n${summarizeCapacity(result.capacity)}`);
  }));

  server.registerTool("get_team_capacity_summary", {
    title: "Get Team Capacity Summary",
    description: "Business-friendly capacity summary for a team's current sprint, including total daily capacity and missing capacity warning.",
    inputSchema: { organization, project, team, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const result = await getTeamCapacity(client, params);
    return params.response_format === "json" ? toolText(result, "json") : toolText(`# Capacity Summary\n\n${summarizeCapacity(result.capacity)}`);
  }));

  server.registerTool("get_sprint_health", {
    title: "Get Sprint Health",
    description: "Calculate green/yellow/red sprint health from current sprint scope, completion, bugs, estimates, owners, and capacity signals.",
    inputSchema: { organization, project, team, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const [{ sprint, items }, capacity] = await Promise.all([
      listSprintWorkItems(client, params),
      getTeamCapacity(client, params).catch(() => undefined)
    ]);
    const health = sprintHealth(items, capacity?.capacity);
    return params.response_format === "json" ? toolText({ sprint, health }, "json") : toolText(`# Sprint Health\n\nStatus: ${health.status.toUpperCase()}\nProject: ${sprint.project}\nTeam: ${sprint.team}\nSprint: ${sprint.iterationName}\n\nReasons:\n${health.reasons.map((r) => `- ${r}`).join("\n")}\n\nWarnings:\n${health.warnings.length ? health.warnings.map((w) => `- ${w}`).join("\n") : "- None"}\n\nMetrics:\n${Object.entries(health.metrics).map(([key, value]) => `- ${key}: ${value}`).join("\n")}`);
  }));

  server.registerTool("create_sprint_summary_report", {
    title: "Create Sprint Summary Report",
    description: "Create a concise business sprint report with health, completion, capacity, bugs, risks, missing fields, and recommended next actions.",
    inputSchema: { organization, project, team, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const report = await createSprintSummaryReport(client, params);
    return params.response_format === "json" ? toolText({ report }, "json") : toolText(report);
  }));

  server.registerTool("compare_sprint_capacity_to_completed_work", {
    title: "Compare Sprint Capacity To Completed Work",
    description: "Compare sprint capacity signals to completed and remaining work from sprint work items.",
    inputSchema: { organization, project, team, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const [{ sprint, items }, capacity] = await Promise.all([listSprintWorkItems(client, params), getTeamCapacity(client, params)]);
    const completedWork = items.reduce((sum, item) => sum + (item.completedWork || 0), 0);
    const remainingWork = items.reduce((sum, item) => sum + (item.remainingWork || 0), 0);
    const summary = { sprint, totalDailyCapacity: capacity.capacity.totalCapacityPerDay, completedWork, remainingWork, note: "Azure DevOps capacity is daily capacity. Compare against sprint length and team days off before treating it as full sprint capacity." };
    return params.response_format === "json" ? toolText(summary, "json") : toolText(`# Capacity vs Completed Work\n\nSprint: ${sprint.iterationName}\nTotal daily capacity: ${summary.totalDailyCapacity}\nCompleted work: ${completedWork}\nRemaining work: ${remainingWork}\n\n${summary.note}`);
  }));

  registerDeliveryTools(server, client);
  registerRepoPipelineTestDashboardTools(server, client);
}

function registerDeliveryTools(server: McpServer, client: AzureDevOpsClient): void {
  server.registerTool("list_delivery_plans", {
    title: "List Delivery Plans",
    description: "List Delivery Plans in a project.",
    inputSchema: { organization, project, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const plans = await listDeliveryPlans(client, { ...params, project: projectName });
    return params.response_format === "json" ? toolText({ project: projectName, plans }, "json") : toolText(["# Delivery Plans", "", `Project: ${projectName}`, "", ...plans.map((p) => `- ${p.name} (${p.id})`)].join("\n"));
  }));

  server.registerTool("get_delivery_plan_timeline", {
    title: "Get Delivery Plan Timeline",
    description: "Get the timeline payload for a delivery plan by name or ID.",
    inputSchema: { organization, project, delivery_plan: z.string().optional(), response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const planName = resolveDeliveryPlan(params.delivery_plan);
    const planId = await resolveDeliveryPlanId(client, { ...params, project: projectName, deliveryPlan: planName });
    const timeline = await client.request<Record<string, unknown>>(`/_apis/work/plans/${encodeURIComponent(planId)}/timeline`, {
      organization: params.organization,
      project: projectName,
      apiVersion: PREVIEW_API_VERSION
    });
    return params.response_format === "json" ? toolText(timeline, "json") : toolText(`# Delivery Plan Timeline\n\nProject: ${projectName}\nDelivery plan: ${planName}\nPlan ID: ${planId}\nTimeline cards found: ${extractTimelineCards(timeline).length}`);
  }));

  server.registerTool("list_delivery_plan_epics", {
    title: "List Delivery Plan Epics",
    description: "List epics or major timeline cards visible in a Delivery Plan.",
    inputSchema: { organization, project, delivery_plan: z.string().optional(), limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const planName = resolveDeliveryPlan(params.delivery_plan);
    const planId = await resolveDeliveryPlanId(client, { ...params, project: projectName, deliveryPlan: planName });
    const timeline = await client.request<Record<string, unknown>>(`/_apis/work/plans/${encodeURIComponent(planId)}/timeline`, {
      organization: params.organization,
      project: projectName,
      apiVersion: PREVIEW_API_VERSION
    });
    const cards = extractTimelineCards(timeline);
    const epics = cards.filter((card) => String(card.type || card.workItemType || "").toLowerCase().includes("epic")).slice(0, params.limit);
    return params.response_format === "json" ? toolText({ project: projectName, deliveryPlan: planName, epics }, "json") : toolText(`# Delivery Plan Epics\n\nProject: ${projectName}\nDelivery plan: ${planName}\n\n${epics.length ? epics.map((e) => `- ${e.id}: ${e.title} - ${e.state || "Unknown"} - Owner: ${e.owner || "Unassigned"} - Target: ${e.targetDate || "Missing"}`).join("\n") : "No epics found in available timeline data."}`);
  }));

  server.registerTool("get_delivery_plan_summary", {
    title: "Get Delivery Plan Summary",
    description: "Summarize a delivery plan by visible timeline items, states, owners, target dates, and risk count.",
    inputSchema: { organization, project, delivery_plan: z.string().optional(), limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const report = await createDeliveryPlanReport(client, params);
    return params.response_format === "json" ? toolText({ report }, "json") : toolText(report);
  }));

  server.registerTool("create_delivery_plan_report", {
    title: "Create Delivery Plan Report",
    description: "Create a business-friendly delivery plan report with epics, owners, dates, risks, missing fields, and recommended next actions.",
    inputSchema: { organization, project, delivery_plan: z.string().optional(), limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => toolText(await createDeliveryPlanReport(client, params), params.response_format)));

  server.registerTool("identify_delivery_risks", {
    title: "Identify Delivery Risks",
    description: "Identify missing owners, missing target dates, overdue target dates, and at-risk visible items in a delivery plan.",
    inputSchema: { organization, project, delivery_plan: z.string().optional(), limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const report = await createDeliveryPlanReport(client, params);
    const riskSection = report.split("## Delivery Risks")[1]?.split("## Recommended Next Actions")[0]?.trim() || "No risk section found.";
    return toolText(`# Delivery Risks\n\n${riskSection}`, params.response_format);
  }));
}

function registerRepoPipelineTestDashboardTools(server: McpServer, client: AzureDevOpsClient): void {
  server.registerTool("list_repositories", {
    title: "List Repositories",
    description: "List Git repositories in an Azure DevOps project.",
    inputSchema: { organization, project, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>("/_apis/git/repositories", { organization: params.organization, project: projectName });
    const repos = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, repositories: repos }, "json") : toolText(["# Repositories", "", ...repos.map((r) => `- ${r.name} (${r.id})`)].join("\n"));
  }));

  server.registerTool("get_repository_file", {
    title: "Get Repository File",
    description: "Read a text file from an Azure DevOps Git repository. Keep paths specific to avoid large responses.",
    inputSchema: {
      organization,
      project,
      repository: z.string().optional().describe("Repository name or ID. Optional only when AZURE_DEVOPS_DEFAULT_REPOSITORY is set."),
      path: z.string().min(1).describe("File path such as README.md or /src/index.ts."),
      branch: z.string().optional().describe("Optional branch name."),
      response_format: responseFormat
    },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const repo = resolveRepository(params.repository);
    const data = await client.request<Record<string, unknown>>(`/_apis/git/repositories/${encodeURIComponent(repo)}/items`, {
      organization: params.organization,
      project: projectName,
      query: { path: params.path, includeContent: true, versionDescriptor_version: params.branch, versionDescriptor_versionType: params.branch ? "branch" : undefined }
    });
    return params.response_format === "json" ? toolText(data, "json") : toolText(String(data.content || "No file content returned. The file may be binary, too large, or inaccessible."));
  }));

  server.registerTool("list_pipelines", {
    title: "List Pipelines",
    description: "List Azure DevOps pipelines in a project.",
    inputSchema: { organization, project, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>("/_apis/pipelines", { organization: params.organization, project: projectName, query: { $top: params.limit } });
    const pipelines = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, pipelines }, "json") : toolText(["# Pipelines", "", ...pipelines.map((p) => `- ${p.name} (${p.id})`)].join("\n"));
  }));

  server.registerTool("list_pipeline_runs", {
    title: "List Pipeline Runs",
    description: "List recent runs for a pipeline. Provide pipeline_id or set AZURE_DEVOPS_DEFAULT_PIPELINE.",
    inputSchema: { organization, project, pipeline_id: z.union([z.string(), z.number()]).optional(), limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const pipelineId = resolvePipeline(params.pipeline_id);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>(`/_apis/pipelines/${encodeURIComponent(pipelineId)}/runs`, { organization: params.organization, project: projectName, query: { $top: params.limit } });
    const runs = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, pipelineId, runs }, "json") : toolText(["# Pipeline Runs", "", ...runs.map((r) => `- Run ${r.id}: ${r.state || "unknown"} / ${r.result || "no result"} - ${r.createdDate || ""}`)].join("\n"));
  }));

  server.registerTool("list_test_plans", {
    title: "List Test Plans",
    description: "List Test Plans in a project.",
    inputSchema: { organization, project, limit, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>("/_apis/testplan/plans", { organization: params.organization, project: projectName, apiVersion: PREVIEW_API_VERSION, query: { $top: params.limit } });
    const plans = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, testPlans: plans }, "json") : toolText(["# Test Plans", "", ...plans.map((p) => `- ${p.name} (${p.id})`)].join("\n"));
  }));

  server.registerTool("list_test_suites", {
    title: "List Test Suites",
    description: "List suites inside a Test Plan.",
    inputSchema: { organization, project, test_plan_id: z.number().int().positive(), response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>(`/_apis/testplan/Plans/${params.test_plan_id}/suites`, { organization: params.organization, project: projectName, apiVersion: PREVIEW_API_VERSION });
    const suites = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, testPlanId: params.test_plan_id, suites }, "json") : toolText(["# Test Suites", "", ...suites.map((s) => `- ${s.name} (${s.id})`)].join("\n"));
  }));

  server.registerTool("list_test_cases", {
    title: "List Test Cases",
    description: "List test cases or test points in a test suite.",
    inputSchema: { organization, project, test_plan_id: z.number().int().positive(), test_suite_id: z.number().int().positive(), response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>(`/_apis/test/Plans/${params.test_plan_id}/Suites/${params.test_suite_id}/points`, { organization: params.organization, project: projectName });
    const cases = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, testPlanId: params.test_plan_id, testSuiteId: params.test_suite_id, testCases: cases }, "json") : toolText(["# Test Cases", "", ...cases.map((c) => `- ${String(c.testCase || c.id)} - ${c.outcome || "unknown"}`)].join("\n"));
  }));

  server.registerTool("list_dashboards", {
    title: "List Dashboards",
    description: "List dashboards for a project and team.",
    inputSchema: { organization, project, team, response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const teamName = resolveTeam(params.team);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>(`/${encodeURIComponent(teamName)}/_apis/dashboard/dashboards`, { organization: params.organization, project: projectName, apiVersion: PREVIEW_API_VERSION });
    const dashboards = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, team: teamName, dashboards }, "json") : toolText(["# Dashboards", "", ...dashboards.map((d) => `- ${d.name} (${d.id})`)].join("\n"));
  }));

  server.registerTool("get_dashboard_widgets", {
    title: "Get Dashboard Widgets",
    description: "List widgets on an Azure DevOps dashboard.",
    inputSchema: { organization, project, team, dashboard_id: z.string().min(1), response_format: responseFormat },
    annotations
  }, async (params) => safe(async () => {
    const projectName = resolveProject(params.project);
    const teamName = resolveTeam(params.team);
    const data = await client.request<{ value?: Array<Record<string, unknown>> }>(`/${encodeURIComponent(teamName)}/_apis/dashboard/dashboards/${encodeURIComponent(params.dashboard_id)}/widgets`, { organization: params.organization, project: projectName, apiVersion: PREVIEW_API_VERSION });
    const widgets = valueArray<Record<string, unknown>>(data);
    return params.response_format === "json" ? toolText({ project: projectName, team: teamName, dashboardId: params.dashboard_id, widgets }, "json") : toolText(["# Dashboard Widgets", "", ...widgets.map((w) => `- ${w.name || w.id} - ${w.contributionId || "widget"}`)].join("\n"));
  }));
}

async function safe(fn: () => Promise<ReturnType<typeof toolText>>): Promise<ReturnType<typeof toolText> | ReturnType<typeof toolError>> {
  try {
    return await fn();
  } catch (error) {
    return toolError(error);
  }
}

function escapeWiql(value: string): string {
  return value.replaceAll("'", "''");
}

function workItemMarkdown(item: ReturnType<typeof normalizeWorkItem>): string {
  return [
    `# Work Item ${item.id}`,
    "",
    `Title: ${item.title}`,
    `Type: ${item.type}`,
    `State: ${item.state}`,
    `Owner: ${item.owner}`,
    `Iteration: ${item.iteration || "Unknown"}`,
    `Area: ${item.area || "Unknown"}`,
    item.startDate ? `Start date: ${item.startDate}` : "",
    item.targetDate ? `Target date: ${item.targetDate}` : "",
    item.remainingWork !== undefined ? `Remaining work: ${item.remainingWork}` : "",
    item.completedWork !== undefined ? `Completed work: ${item.completedWork}` : ""
  ].filter(Boolean).join("\n");
}
