import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JiraClient, safeTool, toolText } from "../jira/client.js";
import { JiraBoard, JiraPage, JiraSprint } from "../jira/types.js";
import { getSprintIssues, issueTable, normalizeIssue, searchIssues, summarizeIssues, summaryMarkdown } from "../reporting/summary.js";
import { boardId, jql, limit, projectKey, responseFormat, sprintId } from "./schemas.js";

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

export function registerReportingTools(server: McpServer, client: JiraClient): void {
  server.registerTool("get_project_summary", {
    title: "Get Jira Project Summary",
    description: "Create a concise delivery summary for a Jira project using recently updated issues.",
    inputSchema: { project_key: projectKey, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const project = client.defaultProject(params.project_key);
    const issues = (await searchIssues(client, `project = ${project} ORDER BY updated DESC`, params.limit)).map(normalizeIssue);
    const summary = summarizeIssues(issues);
    return params.response_format === "json" ? toolText({ project, summary, issues }, "json") : toolText(summaryMarkdown(`Project Delivery Summary: ${project}`, issues));
  }));

  server.registerTool("get_board_summary", {
    title: "Get Jira Board Summary",
    description: "Summarize a Jira board by finding its active sprint when available and reporting scope, health, bugs, owners, and risks.",
    inputSchema: { board_id: boardId, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const board = await client.request<JiraBoard>(`/rest/agile/1.0/board/${client.defaultBoard(params.board_id)}`);
    const sprint = await getActiveSprint(client, board.id);
    if (!sprint) {
      return toolText(`# Board Summary\n\nBoard: ${board.name || board.id}\n\nNo active sprint found. Use list_sprints to choose a sprint explicitly.`);
    }
    const issues = (await getSprintIssues(client, sprint.id, params.limit)).map(normalizeIssue);
    const summary = summarizeIssues(issues, sprint);
    return params.response_format === "json" ? toolText({ board, sprint, summary, issues }, "json") : toolText(summaryMarkdown(`Board Summary: ${board.name || board.id}`, issues, sprint));
  }));

  server.registerTool("get_sprint_summary", {
    title: "Get Jira Sprint Summary",
    description: "Summarize one sprint with scope, completion, assignees, open bugs, missing owners, missing estimates, and risks.",
    inputSchema: { sprint_id: sprintId, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const sprint = await client.request<JiraSprint>(`/rest/agile/1.0/sprint/${client.defaultSprint(params.sprint_id)}`);
    const issues = (await getSprintIssues(client, sprint.id, params.limit)).map(normalizeIssue);
    const summary = summarizeIssues(issues, sprint);
    return params.response_format === "json" ? toolText({ sprint, summary, issues }, "json") : toolText(summaryMarkdown("Sprint Summary", issues, sprint));
  }));

  server.registerTool("get_sprint_health", {
    title: "Get Jira Sprint Health",
    description: "Return green/yellow/red sprint health based on completion, open bugs, blockers, overdue issues, missing owners, and missing estimates.",
    inputSchema: { sprint_id: sprintId, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const sprint = await client.request<JiraSprint>(`/rest/agile/1.0/sprint/${client.defaultSprint(params.sprint_id)}`);
    const issues = (await getSprintIssues(client, sprint.id, params.limit)).map(normalizeIssue);
    const summary = summarizeIssues(issues, sprint);
    return params.response_format === "json"
      ? toolText({ sprint, health: summary.health, summary }, "json")
      : toolText(`# Sprint Health\n\nSprint: ${sprint.name || sprint.id}\nHealth: ${summary.health.toUpperCase()}\nCompletion: ${summary.completed}/${summary.total} (${summary.completionRate}%)\nOpen bugs: ${summary.openBugs.length}\nBlocked: ${summary.blockers.length}\nOverdue: ${summary.overdue.length}\nMissing owners: ${summary.missingOwners.length}\nMissing estimates: ${summary.missingEstimates.length}\n\n## Risks\n${summary.deliveryRisks.map((risk) => `- ${risk}`).join("\n")}`);
  }));

  server.registerTool("list_open_bugs_in_sprint", {
    title: "List Open Bugs In Jira Sprint",
    description: "List open bugs in a sprint with owners, statuses, priorities, labels, and risk hints.",
    inputSchema: { sprint_id: sprintId, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const sprint = await client.request<JiraSprint>(`/rest/agile/1.0/sprint/${client.defaultSprint(params.sprint_id)}`);
    const bugs = (await getSprintIssues(client, sprint.id, params.limit, "issuetype = Bug AND statusCategory != Done")).map(normalizeIssue);
    return params.response_format === "json" ? toolText({ sprint, count: bugs.length, bugs }, "json") : toolText(`# Open Bugs In Sprint\n\nSprint: ${sprint.name || sprint.id}\n\n${issueTable(bugs)}`);
  }));

  server.registerTool("identify_delivery_risks", {
    title: "Identify Jira Delivery Risks",
    description: "Inspect a JQL result set and highlight blockers, open bugs, overdue issues, missing owners, and missing estimates.",
    inputSchema: { jql, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const issues = (await searchIssues(client, params.jql, params.limit)).map(normalizeIssue);
    const summary = summarizeIssues(issues);
    return params.response_format === "json"
      ? toolText({ jql: params.jql, summary, issues }, "json")
      : toolText(`# Delivery Risks\n\nJQL: ${params.jql}\n\nHealth: ${summary.health.toUpperCase()}\n\n## Risks\n${summary.deliveryRisks.map((risk) => `- ${risk}`).join("\n")}\n\n## Recommended Next Actions\n${summary.recommendedActions.map((action) => `- ${action}`).join("\n")}\n\n## Risk Issues\n${issueTable([...summary.openBugs, ...summary.blockers, ...summary.overdue, ...summary.missingOwners, ...summary.missingEstimates].filter(uniqueIssue))}`);
  }));

  server.registerTool("create_sprint_summary_report", {
    title: "Create Jira Sprint Summary Report",
    description: "Create a business-friendly sprint summary report with health, scope, completion, bugs, blockers, missing fields, risks, and next actions.",
    inputSchema: { sprint_id: sprintId, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const sprint = await client.request<JiraSprint>(`/rest/agile/1.0/sprint/${client.defaultSprint(params.sprint_id)}`);
    const issues = (await getSprintIssues(client, sprint.id, params.limit)).map(normalizeIssue);
    const summary = summarizeIssues(issues, sprint);
    const markdown = summaryMarkdown("Sprint Summary Report", issues, sprint);
    return params.response_format === "json" ? toolText({ sprint, summary, issues }, "json") : toolText(markdown);
  }));

  server.registerTool("create_project_delivery_report", {
    title: "Create Jira Project Delivery Report",
    description: "Create a project delivery report from JQL or a project key, including delivery risks and recommended next actions.",
    inputSchema: {
      project_key: projectKey,
      jql: z.string().min(1).max(4000).optional().describe("Optional custom JQL. If omitted, the tool uses the project key."),
      limit,
      response_format: responseFormat
    },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const query = params.jql || `project = ${client.defaultProject(params.project_key)} ORDER BY updated DESC`;
    const issues = (await searchIssues(client, query, params.limit)).map(normalizeIssue);
    const summary = summarizeIssues(issues);
    return params.response_format === "json" ? toolText({ jql: query, summary, issues }, "json") : toolText(summaryMarkdown("Project Delivery Report", issues));
  }));
}

async function getActiveSprint(client: JiraClient, boardIdValue: number): Promise<JiraSprint | undefined> {
  const data = await client.request<JiraPage<JiraSprint>>(`/rest/agile/1.0/board/${boardIdValue}/sprint`, { query: { state: "active", maxResults: 10 } });
  return data.values?.[0];
}

function uniqueIssue(issue: { key: string }, index: number, issues: Array<{ key: string }>): boolean {
  return issues.findIndex((candidate) => candidate.key === issue.key) === index;
}
