import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readJiraConfigStatus } from "../jira/auth.js";
import { getProjectCapabilities } from "../jira/capabilities.js";
import { JiraClient, safeTool, toolText, valueArray } from "../jira/client.js";
import { endpoints } from "../jira/endpoints.js";
import { JiraBoard, JiraIssue, JiraPage, JiraPlan, JiraPlanIssueSource, JiraProject, JiraSprint, JiraUser } from "../jira/types.js";
import { DEFAULT_FIELDS, getSprintIssues, issueTable, normalizeIssue, pickSprint, searchIssues } from "../reporting/summary.js";
import { boardId, cursor, issueKey, jql, limit, planId, projectKey, responseFormat, sprintId } from "./schemas.js";

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

export function registerReadTools(server: McpServer, client: JiraClient): void {
  server.registerTool("get_connection_status", {
    title: "Get Jira Connection Status",
    description: "First-run health check for jira-plus-mcp. Verifies required configuration, authentication, optional default project, and whether write tools are enabled.",
    inputSchema: { response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const configStatus = readJiraConfigStatus();
    const checks: Array<{ name: string; ok: boolean; detail: string }> = [
      { name: "JIRA_BASE_URL", ok: configStatus.baseUrlPresent, detail: configStatus.baseUrlPresent ? "Configured" : "Missing. Add your Jira site root, for example https://YOUR_JIRA_SITE_NAME.atlassian.net." },
      { name: "JIRA_EMAIL", ok: configStatus.emailPresent, detail: configStatus.emailPresent ? "Configured" : "Missing. Add the email used to sign in to Atlassian." },
      { name: "JIRA_API_TOKEN", ok: configStatus.tokenPresent, detail: configStatus.tokenPresent ? `Configured through ${configStatus.tokenSource === "file" ? "JIRA_API_TOKEN_FILE" : "JIRA_API_TOKEN"}` : "Missing. Add JIRA_API_TOKEN or JIRA_API_TOKEN_FILE." }
    ];

    let user: JiraUser | undefined;
    let authOk = false;
    let defaultProjectOk: boolean | undefined;
    let defaultProjectDetail = "No default project configured. This is OK; provide project_key in tool calls.";

    if (checks.every((check) => check.ok)) {
      user = await client.request<JiraUser>(endpoints.myself);
      authOk = true;
      if (configStatus.defaultProject) {
        try {
          const project = await client.request<JiraProject>(endpoints.project(configStatus.defaultProject));
          defaultProjectOk = true;
          defaultProjectDetail = `Default project found: ${project.key} - ${project.name || "Unnamed"}`;
        } catch (error) {
          defaultProjectOk = false;
          defaultProjectDetail = error instanceof Error ? error.message : String(error);
        }
      }
    }

    const writeToolsEnabled = process.env.JIRA_ENABLE_WRITE_TOOLS === "true";
    const result = {
      ready: checks.every((check) => check.ok) && authOk && defaultProjectOk !== false,
      checks,
      authentication: authOk ? "Authenticated" : "Not checked because required configuration is missing",
      connectedUser: user ? { displayName: user.displayName, accountId: user.accountId, active: user.active } : undefined,
      defaultProject: { configured: Boolean(configStatus.defaultProject), ok: defaultProjectOk, detail: defaultProjectDetail },
      writeTools: writeToolsEnabled ? "Enabled. Write tools can modify Jira data." : "Disabled. Read-only mode is active.",
      nextAction: nextConnectionAction(checks, authOk, defaultProjectOk, writeToolsEnabled)
    };

    if (params.response_format === "json") {
      return toolText(result, "json");
    }
    return toolText([
      "# Jira Connection Status",
      "",
      `Ready: ${result.ready ? "Yes" : "No"}`,
      "",
      "## Checks",
      ...checks.map((check) => `- ${check.ok ? "OK" : "Missing"} ${check.name}: ${check.detail}`),
      `- Authentication: ${result.authentication}`,
      user ? `- Connected user: ${user.displayName || "Unknown"} (${user.active ? "active" : "inactive"})` : undefined,
      `- Default project: ${defaultProjectDetail}`,
      `- Write tools: ${result.writeTools}`,
      "",
      `Next action: ${result.nextAction}`
    ].filter((line): line is string => line !== undefined).join("\n"));
  }));

  server.registerTool("get_myself", {
    title: "Get Jira User",
    description: "Return the Jira Cloud user connected to JIRA_EMAIL and the configured API token. Use this to verify authentication.",
    inputSchema: { response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const user = await client.request<JiraUser>(endpoints.myself);
    return toolText(params.response_format === "json" ? user : `# Jira User\n\nName: ${user.displayName || "Unknown"}\nAccount ID: ${user.accountId || "Unknown"}\nActive: ${user.active ?? "Unknown"}`, params.response_format);
  }));

  server.registerTool("list_projects", {
    title: "List Jira Projects",
    description: "List Jira projects visible to the configured user. Use this first when the project key is unknown.",
    inputSchema: { limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.request<{ values?: JiraProject[] }>(endpoints.projectSearch, { query: { maxResults: params.limit } });
    const projects = valueArray<JiraProject>(data).map((project) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      type: project.projectTypeKey,
      lead: project.lead?.displayName
    }));
    return params.response_format === "json"
      ? toolText({ count: projects.length, projects }, "json")
      : toolText(["# Jira Projects", "", ...projects.map((project) => `- ${project.key}: ${project.name} (${project.type || "unknown"}) - Lead: ${project.lead || "Unknown"}`)].join("\n"));
  }));

  server.registerTool("get_project", {
    title: "Get Jira Project",
    description: "Get details for one Jira project by key.",
    inputSchema: { project_key: projectKey, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const project = await client.request<JiraProject>(endpoints.project(client.defaultProject(params.project_key)));
    return params.response_format === "json" ? toolText(project, "json") : toolText(`# Jira Project\n\nKey: ${project.key}\nName: ${project.name}\nType: ${project.projectTypeKey || "Unknown"}\nLead: ${project.lead?.displayName || "Unknown"}`);
  }));

  server.registerTool("get_project_capabilities", {
    title: "Get Jira Project Capabilities",
    description: "Discover issue types, hierarchy levels, feature/subtask support, required create fields, and a recommended planning structure for a Jira project.",
    inputSchema: { project_key: projectKey, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const project = client.defaultProject(params.project_key);
    const capabilities = await getProjectCapabilities(client, project);
    if (params.response_format === "json") {
      return toolText(capabilities, "json");
    }
    return toolText([
      "# Jira Project Capabilities",
      "",
      `Project: ${capabilities.project.key || project} - ${capabilities.project.name || "Unknown"}`,
      `Recommended structure: ${capabilities.recommendedStructure}`,
      `Feature issue type: ${capabilities.hasFeature ? "Available" : "Not found"}`,
      `Subtask issue type: ${capabilities.hasSubtask ? "Available" : "Not found"}`,
      "",
      "## Issue Types",
      ...capabilities.issueTypes.map((type) => `- ${type.name}: hierarchy ${type.hierarchyLevel}${type.subtask ? ", subtask" : ""}`),
      "",
      "## Required Create Fields",
      ...Object.entries(capabilities.requiredCreateFields).map(([issueType, fields]) => `- ${issueType}: ${fields.length ? fields.join(", ") : "No extra required fields detected"}`),
      "",
      "## Warnings",
      ...(capabilities.warnings.length ? capabilities.warnings.map((warning) => `- ${warning}`) : ["- None"])
    ].join("\n"));
  }));

  server.registerTool("list_plans", {
    title: "List Jira Plans",
    description: "List Jira Plans/Roadmaps visible to the configured user. Atlassian marks the Plans API experimental and may require Jira administrator permission.",
    inputSchema: {
      include_archived: z.boolean().default(false).describe("Include archived plans when Jira supports the flag."),
      include_trashed: z.boolean().default(false).describe("Include trashed plans when Jira supports the flag."),
      cursor,
      limit,
      response_format: responseFormat
    },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.request<JiraPage<JiraPlan>>(endpoints.plans, {
      query: {
        includeArchived: params.include_archived,
        includeTrashed: params.include_trashed,
        cursor: params.cursor,
        maxResults: params.limit
      }
    });
    const plans = valueArray<JiraPlan>(data).map(planSummary);
    return params.response_format === "json"
      ? toolText({ count: plans.length, total: data.total, isLast: data.isLast, nextPageCursor: data.nextPageCursor, plans }, "json")
      : toolText([
        "# Jira Plans",
        "",
        plans.length ? `Showing ${plans.length}${data.total !== undefined ? ` of ${data.total}` : ""} plans.` : "No Plans were returned for this account.",
        data.nextPageCursor ? `Next cursor: ${data.nextPageCursor}` : undefined,
        "",
        ...plans.map((plan) => `- ${plan.id}: ${plan.name} - ${plan.status || "unknown"} - sources: ${formatPlanSources(plan.issueSources)}`)
      ].filter((line): line is string => line !== undefined).join("\n"));
  }));

  server.registerTool("get_plan", {
    title: "Get Jira Plan",
    description: "Get one Jira Plan/Roadmap by ID. If Jira denies access, the connected account likely needs Jira administrator permission for the experimental Plans API.",
    inputSchema: { plan_id: planId, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const plan = await client.request<JiraPlan>(endpoints.plan(params.plan_id));
    const summary = planSummary(plan);
    return params.response_format === "json"
      ? toolText({ plan }, "json")
      : toolText([
        "# Jira Plan",
        "",
        `ID: ${summary.id}`,
        `Name: ${summary.name}`,
        `Status: ${summary.status || "Unknown"}`,
        `Scenario ID: ${summary.scenarioId || "Unknown"}`,
        `Issue sources: ${formatPlanSources(summary.issueSources)}`
      ].join("\n"));
  }));

  server.registerTool("find_plans_for_project", {
    title: "Find Jira Plans For Project",
    description: "Find Plans/Roadmaps whose issue sources reference a Jira project or one of its boards. This does not change Jira settings.",
    inputSchema: { project_key: projectKey, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const projectKeyValue = client.defaultProject(params.project_key);
    const project = await client.request<JiraProject>(endpoints.project(projectKeyValue));
    const boardsPage = await client.request<JiraPage<JiraBoard>>(endpoints.boardList, { query: { projectKeyOrId: projectKeyValue, maxResults: 100 } });
    const boardIds = new Set(valueArray<JiraBoard>(boardsPage).map((board) => String(board.id)));
    const plansPage = await client.request<JiraPage<JiraPlan>>(endpoints.plans, { query: { maxResults: params.limit } });
    const projectId = project.id ? String(project.id) : undefined;
    const plans = valueArray<JiraPlan>(plansPage)
      .filter((plan) => planMatchesProject(plan, projectId, boardIds))
      .map(planSummary);

    const result = {
      project: { id: project.id, key: project.key, name: project.name },
      boardIds: Array.from(boardIds),
      count: plans.length,
      plans,
      note: "This is a read-only match against Plan issue sources. If Jira blocks the Plans API, your account likely needs Jira administrator permission."
    };
    return params.response_format === "json"
      ? toolText(result, "json")
      : toolText([
        "# Jira Plans For Project",
        "",
        `Project: ${project.key || projectKeyValue} - ${project.name || "Unknown"}`,
        `Boards checked: ${result.boardIds.join(", ") || "None visible"}`,
        "",
        ...(plans.length ? plans.map((plan) => `- ${plan.id}: ${plan.name} - ${plan.status || "unknown"} - sources: ${formatPlanSources(plan.issueSources)}`) : ["No matching Plans were found or visible for this account."])
      ].join("\n"));
  }));

  server.registerTool("get_plan_summary", {
    title: "Get Jira Plan Summary",
    description: "Return a concise summary for one Jira Plan/Roadmap without changing Jira. Uses the experimental Plans API and may require Jira administrator permission.",
    inputSchema: { plan_id: planId, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const plan = await client.request<JiraPlan>(endpoints.plan(params.plan_id));
    const summary = planSummary(plan);
    const result = {
      id: summary.id,
      name: summary.name,
      status: summary.status,
      scenarioId: summary.scenarioId,
      issueSources: summary.issueSources,
      recommendation: "Use project, board, sprint, and issue tools for day-to-day delivery work. Use Plans tools when Jira grants access to the Plans/Roadmaps API."
    };
    return params.response_format === "json"
      ? toolText(result, "json")
      : toolText([
        "# Jira Plan Summary",
        "",
        `Plan: ${summary.name} (${summary.id})`,
        `Status: ${summary.status || "Unknown"}`,
        `Scenario ID: ${summary.scenarioId || "Unknown"}`,
        `Issue sources: ${formatPlanSources(summary.issueSources)}`,
        "",
        result.recommendation
      ].join("\n"));
  }));

  server.registerTool("list_boards", {
    title: "List Jira Boards",
    description: "List Jira Agile boards, optionally filtered by project key.",
    inputSchema: { project_key: projectKey, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.request<JiraPage<JiraBoard>>(endpoints.boardList, { query: { projectKeyOrId: params.project_key, maxResults: params.limit } });
    const boards = valueArray<JiraBoard>(data);
    return params.response_format === "json"
      ? toolText({ count: boards.length, boards }, "json")
      : toolText(["# Jira Boards", "", ...boards.map((board) => `- ${board.id}: ${board.name || "Unnamed"} (${board.type || "unknown"}) - ${board.location?.projectKey || board.location?.displayName || "No project shown"}`)].join("\n"));
  }));

  server.registerTool("get_board", {
    title: "Get Jira Board",
    description: "Get one Jira Agile board by ID.",
    inputSchema: { board_id: boardId, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const board = await client.request<JiraBoard>(endpoints.board(client.defaultBoard(params.board_id)));
    return params.response_format === "json" ? toolText(board, "json") : toolText(`# Jira Board\n\nID: ${board.id}\nName: ${board.name || "Unknown"}\nType: ${board.type || "Unknown"}\nProject: ${board.location?.projectKey || board.location?.projectName || "Unknown"}`);
  }));

  server.registerTool("list_sprints", {
    title: "List Jira Sprints",
    description: "List sprints on a Jira Agile board. Use state to filter active, future, or closed sprints.",
    inputSchema: {
      board_id: boardId,
      state: z.enum(["active", "future", "closed"]).optional().describe("Optional sprint state filter."),
      limit,
      response_format: responseFormat
    },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.request<JiraPage<JiraSprint>>(endpoints.boardSprints(client.defaultBoard(params.board_id)), { query: { state: params.state, maxResults: params.limit } });
    const sprints = valueArray<JiraSprint>(data).map(pickSprint);
    return params.response_format === "json"
      ? toolText({ count: sprints.length, sprints }, "json")
      : toolText(["# Jira Sprints", "", ...sprints.map((sprint) => `- ${sprint.id}: ${sprint.name || "Unnamed"} - ${sprint.state || "unknown"} - ${sprint.startDate || "no start"} to ${sprint.endDate || "no end"}`)].join("\n"));
  }));

  server.registerTool("get_current_sprint", {
    title: "Get Current Jira Sprint",
    description: "Find the active sprint for a board. Returns the first active sprint Jira provides for the board.",
    inputSchema: { board_id: boardId, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.request<JiraPage<JiraSprint>>(endpoints.boardSprints(client.defaultBoard(params.board_id)), { query: { state: "active", maxResults: 10 } });
    const sprint = valueArray<JiraSprint>(data)[0];
    if (!sprint) return toolText("No active sprint found for this board.");
    return params.response_format === "json" ? toolText(pickSprint(sprint), "json") : toolText(`# Current Sprint\n\nID: ${sprint.id}\nName: ${sprint.name || "Unnamed"}\nState: ${sprint.state || "Unknown"}\nDates: ${sprint.startDate || "Unknown"} to ${sprint.endDate || "Unknown"}\nGoal: ${sprint.goal || "Not set"}`);
  }));

  server.registerTool("list_sprint_issues", {
    title: "List Sprint Issues",
    description: "List issues in a sprint with business-friendly issue fields.",
    inputSchema: { sprint_id: sprintId, extra_jql: z.string().max(1000).optional().describe("Optional extra JQL filter applied inside the sprint."), limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const issues = (await getSprintIssues(client, client.defaultSprint(params.sprint_id), params.limit, params.extra_jql)).map(normalizeIssue);
    return params.response_format === "json" ? toolText({ count: issues.length, issues }, "json") : toolText(`# Sprint Issues\n\n${issueTable(issues)}`);
  }));

  server.registerTool("search_issues", {
    title: "Search Jira Issues",
    description: "Run a Jira JQL search and return concise issue fields useful for planning, delivery, and reporting.",
    inputSchema: { jql, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const issues = (await searchIssues(client, params.jql, params.limit)).map(normalizeIssue);
    return params.response_format === "json" ? toolText({ jql: params.jql, count: issues.length, issues }, "json") : toolText(`# Jira Issue Search\n\nJQL: ${params.jql}\n\n${issueTable(issues)}`);
  }));

  server.registerTool("get_issue", {
    title: "Get Jira Issue",
    description: "Get one Jira issue by key, including common fields, labels, versions, components, sprint names, and risk hints.",
    inputSchema: { issue_key: issueKey, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const issue = await client.request<JiraIssue>(endpoints.issue(params.issue_key), { query: { fields: DEFAULT_FIELDS } });
    const normalized = normalizeIssue(issue);
    return params.response_format === "json" ? toolText({ issue, normalized }, "json") : toolText(`# ${normalized.key}: ${normalized.title}\n\nType: ${normalized.issueType}\nStatus: ${normalized.status}\nOwner: ${normalized.owner}\nPriority: ${normalized.priority}\nLabels: ${normalized.labels.join(", ") || "None"}\nSprints: ${normalized.sprintNames.join(", ") || "None"}\nEstimate: ${normalized.storyPoints ?? normalized.estimate ?? "Missing"}\nCreated: ${normalized.created || "Unknown"}\nUpdated: ${normalized.updated || "Unknown"}\nBlockers: ${normalized.blockers.join(", ") || "None"}`);
  }));

  server.registerTool("get_issue_comments", {
    title: "Get Jira Issue Comments",
    description: "List comments on a Jira issue. Comment bodies are returned in Jira document form in JSON mode and summarized in markdown mode.",
    inputSchema: { issue_key: issueKey, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.request<{ comments?: Array<Record<string, unknown>> }>(endpoints.issueComments(params.issue_key), { query: { maxResults: params.limit } });
    const comments = data.comments || [];
    return params.response_format === "json"
      ? toolText({ issue: params.issue_key, count: comments.length, comments }, "json")
      : toolText(["# Issue Comments", "", `Issue: ${params.issue_key}`, "", ...comments.map((comment) => `- ${String((comment.author as { displayName?: unknown } | undefined)?.displayName || "Unknown")} at ${String(comment.created || "unknown")} - comment ID ${String(comment.id || "unknown")}`)].join("\n"));
  }));

  server.registerTool("list_issue_transitions", {
    title: "List Jira Issue Transitions",
    description: "List valid workflow transitions for a Jira issue. Use before transition_issue in write mode.",
    inputSchema: { issue_key: issueKey, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.request<{ transitions?: Array<{ id?: string; name?: string; to?: { name?: string } }> }>(endpoints.issueTransitions(params.issue_key));
    const transitions = data.transitions || [];
    return params.response_format === "json" ? toolText({ issue: params.issue_key, transitions }, "json") : toolText(["# Issue Transitions", "", `Issue: ${params.issue_key}`, "", ...transitions.map((item) => `- ${item.id}: ${item.name} -> ${item.to?.name || "Unknown"}`)].join("\n"));
  }));

  server.registerTool("list_epics", {
    title: "List Jira Epics",
    description: "List epics in a project using JQL.",
    inputSchema: { project_key: projectKey, limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const project = client.defaultProject(params.project_key);
    const issues = (await searchIssues(client, `project = ${project} AND issuetype = Epic ORDER BY updated DESC`, params.limit)).map(normalizeIssue);
    return params.response_format === "json" ? toolText({ project, count: issues.length, epics: issues }, "json") : toolText(`# Jira Epics\n\nProject: ${project}\n\n${issueTable(issues)}`);
  }));

  server.registerTool("list_versions", {
    title: "List Jira Project Versions",
    description: "List versions/releases for a Jira project.",
    inputSchema: { project_key: projectKey, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const project = client.defaultProject(params.project_key);
    const versions = await client.request<Array<Record<string, unknown>>>(endpoints.projectVersions(project));
    return params.response_format === "json" ? toolText({ project, versions }, "json") : toolText(["# Project Versions", "", `Project: ${project}`, "", ...versions.map((version) => `- ${String(version.name || version.id)} - released: ${String(version.released ?? "unknown")} - date: ${String(version.releaseDate || "none")}`)].join("\n"));
  }));

  server.registerTool("list_components", {
    title: "List Jira Project Components",
    description: "List components for a Jira project.",
    inputSchema: { project_key: projectKey, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const project = client.defaultProject(params.project_key);
    const components = await client.request<Array<Record<string, unknown>>>(endpoints.projectComponents(project));
    return params.response_format === "json" ? toolText({ project, components }, "json") : toolText(["# Project Components", "", `Project: ${project}`, "", ...components.map((component) => `- ${String(component.name || component.id)} - Lead: ${String((component.lead as { displayName?: unknown } | undefined)?.displayName || "Unknown")}`)].join("\n"));
  }));

  server.registerTool("list_users", {
    title: "Search Jira Users",
    description: "Search Jira users by name or email text. Useful for finding account IDs before assigning issues.",
    inputSchema: { query: z.string().min(1).max(200).describe("Name or email text to search."), limit, response_format: responseFormat },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const users = await client.request<JiraUser[]>(endpoints.userSearch, { query: { query: params.query, maxResults: params.limit } });
    return params.response_format === "json" ? toolText({ count: users.length, users }, "json") : toolText(["# Jira Users", "", ...users.map((user) => `- ${user.displayName || "Unknown"} (${user.accountId || "no account ID"}) - active: ${user.active ?? "unknown"}`)].join("\n"));
  }));

  server.registerTool("jira_api_get", {
    title: "Safe Jira API GET",
    description: "Read a Jira Cloud REST endpoint that jira-plus-mcp does not yet wrap. Only GET is allowed, only /rest/api/3/ and /rest/agile/1.0/ paths are allowed, and it never creates or updates Jira data.",
    inputSchema: {
      path: z.string().min(1).max(500).describe("Jira REST path only, for example /rest/api/3/field. Do not include the site URL or query string."),
      query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Optional query parameters for the GET request."),
      response_format: responseFormat
    },
    annotations: readAnnotations
  }, async (params) => safeTool(async () => {
    const data = await client.safeReadPath<unknown>(params.path, params.query);
    return params.response_format === "json" ? toolText(data, "json") : toolText(JSON.stringify(data, null, 2));
  }));
}

function nextConnectionAction(checks: Array<{ ok: boolean; name: string }>, authOk: boolean, defaultProjectOk: boolean | undefined, writeToolsEnabled: boolean): string {
  const missing = checks.find((check) => !check.ok);
  if (missing) {
    return `Add ${missing.name} to your MCP client environment, restart the client, then run get_connection_status again.`;
  }
  if (!authOk) {
    return "Regenerate the Jira API token or check that JIRA_EMAIL is the Atlassian login email, then restart the MCP client.";
  }
  if (defaultProjectOk === false) {
    return "Fix or remove JIRA_DEFAULT_PROJECT. You can also provide project_key directly in tool calls.";
  }
  return writeToolsEnabled ? "Run get_project_capabilities, then use create_issue or create_project_plan." : "Run get_project_capabilities. Enable JIRA_ENABLE_WRITE_TOOLS=true only when you want Jira changes.";
}

function planSummary(plan: JiraPlan) {
  return {
    id: String(plan.id ?? "unknown"),
    name: String(plan.name ?? "Unnamed plan"),
    status: plan.status ? String(plan.status) : undefined,
    scenarioId: plan.scenarioId ? String(plan.scenarioId) : undefined,
    issueSources: Array.isArray(plan.issueSources) ? plan.issueSources : []
  };
}

function formatPlanSources(sources: JiraPlanIssueSource[] = []): string {
  if (!sources.length) {
    return "none shown";
  }
  return sources.map((source) => `${source.type || "Unknown"} ${String(source.value ?? "unknown")}`).join(", ");
}

function planMatchesProject(plan: JiraPlan, projectId: string | undefined, boardIds: Set<string>): boolean {
  const sources = Array.isArray(plan.issueSources) ? plan.issueSources : [];
  return sources.some((source) => {
    const value = String(source.value ?? "");
    if (source.type === "Project" && projectId && value === projectId) {
      return true;
    }
    if (source.type === "Board" && boardIds.has(value)) {
      return true;
    }
    return false;
  });
}
