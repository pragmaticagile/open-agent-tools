import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findIssueType, getProjectCapabilities } from "../jira/capabilities.js";
import { JiraClient, safeTool, toolText } from "../jira/client.js";
import { endpoints } from "../jira/endpoints.js";
import { JiraIssue } from "../jira/types.js";
import { normalizeIssue, searchIssues } from "../reporting/summary.js";
import { accountId, issueKey, projectKey, responseFormat, sprintId } from "./schemas.js";

const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
};

const strictFields = z.record(z.string(), z.unknown()).describe("Explicit Jira fields object. Use exact Jira field IDs/names; the tool does not infer destructive changes.");

const planSubtaskSchema = z.object({
  issue_type: z.string().min(1).max(80).default("Subtask").describe("Subtask issue type name."),
  summary: z.string().min(1).max(255),
  description_text: z.string().max(5000).optional(),
  additional_fields: z.record(z.string(), z.unknown()).optional()
}).strict();

const planChildSchema = z.object({
  issue_type: z.string().min(1).max(80).describe("Normal issue type, such as Feature, Story, Task, or Bug."),
  summary: z.string().min(1).max(255),
  description_text: z.string().max(5000).optional(),
  additional_fields: z.record(z.string(), z.unknown()).optional(),
  subtasks: z.array(planSubtaskSchema).max(50).default([])
}).strict();

const planEpicSchema = z.object({
  issue_type: z.string().min(1).max(80).default("Epic"),
  summary: z.string().min(1).max(255),
  description_text: z.string().max(5000).optional(),
  additional_fields: z.record(z.string(), z.unknown()).optional(),
  children: z.array(planChildSchema).max(100).default([])
}).strict();

export function registerWriteTools(server: McpServer, client: JiraClient): void {
  server.registerTool("create_issue", {
    title: "Create Jira Issue",
    description: "Create a Jira issue. Write mode only: registered only when JIRA_ENABLE_WRITE_TOOLS=true.",
    inputSchema: {
      project_key: projectKey,
      issue_type: z.string().min(1).max(80).describe("Issue type name, such as Task, Story, Bug, or Epic."),
      summary: z.string().min(1).max(255).describe("Issue summary/title."),
      description_text: z.string().max(5000).optional().describe("Optional plain text description."),
      additional_fields: z.record(z.string(), z.unknown()).optional().describe("Optional explicit Jira fields to merge into fields."),
      response_format: responseFormat
    },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const fields: Record<string, unknown> = {
      project: { key: client.defaultProject(params.project_key) },
      issuetype: { name: params.issue_type },
      summary: params.summary,
      ...(params.additional_fields || {})
    };
    if (params.description_text) {
      fields.description = adfText(params.description_text);
    }
    const created = await client.request<{ id: string; key: string; self: string }>(endpoints.createIssue, { method: "POST", body: { fields } });
    return params.response_format === "json" ? toolText({ created }, "json") : toolText(`# Issue Created\n\nKey: ${created.key}\nID: ${created.id}\nSummary: ${params.summary}`);
  }));

  server.registerTool("update_issue_fields", {
    title: "Update Jira Issue Fields",
    description: "Update explicit Jira fields on an issue. Requires a structured fields object and returns before/after normalized summaries.",
    inputSchema: { issue_key: issueKey, fields: strictFields, response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const before = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    await client.request<unknown>(endpoints.issue(params.issue_key), { method: "PUT", body: { fields: params.fields } });
    const after = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    return params.response_format === "json" ? toolText({ before, after }, "json") : toolText(beforeAfter("Issue Updated", before, after));
  }));

  server.registerTool("assign_issue", {
    title: "Assign Jira Issue",
    description: "Assign an issue to a Jira account ID. Use list_users first when the account ID is unknown.",
    inputSchema: { issue_key: issueKey, account_id: accountId, response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const before = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    await client.request<unknown>(endpoints.issueAssignee(params.issue_key), { method: "PUT", body: { accountId: params.account_id } });
    const after = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    return params.response_format === "json" ? toolText({ before, after }, "json") : toolText(beforeAfter("Issue Assigned", before, after));
  }));

  server.registerTool("add_issue_comment", {
    title: "Add Jira Issue Comment",
    description: "Add a plain text comment to a Jira issue.",
    inputSchema: { issue_key: issueKey, comment_text: z.string().min(1).max(10000).describe("Plain text comment body."), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const comment = await client.request<Record<string, unknown>>(endpoints.issueComments(params.issue_key), { method: "POST", body: { body: adfText(params.comment_text) } });
    return params.response_format === "json" ? toolText({ issue: params.issue_key, comment }, "json") : toolText(`# Comment Added\n\nIssue: ${params.issue_key}\nComment ID: ${String(comment.id || "unknown")}`);
  }));

  server.registerTool("transition_issue", {
    title: "Transition Jira Issue",
    description: "Transition an issue using an explicit Jira transition ID. Use list_issue_transitions first.",
    inputSchema: { issue_key: issueKey, transition_id: z.string().min(1).max(80).describe("Transition ID from list_issue_transitions."), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const before = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    await client.request<unknown>(endpoints.issueTransitions(params.issue_key), { method: "POST", body: { transition: { id: params.transition_id } } });
    const after = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    return params.response_format === "json" ? toolText({ before, after }, "json") : toolText(beforeAfter("Issue Transitioned", before, after));
  }));

  server.registerTool("add_labels_to_issue", {
    title: "Add Jira Issue Labels",
    description: "Add one or more labels to a Jira issue without removing existing labels.",
    inputSchema: { issue_key: issueKey, labels: z.array(z.string().min(1).max(255)).min(1).max(25), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const before = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    await client.request<unknown>(endpoints.issue(params.issue_key), { method: "PUT", body: { update: { labels: params.labels.map((label) => ({ add: label })) } } });
    const after = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    return params.response_format === "json" ? toolText({ before, after }, "json") : toolText(beforeAfter("Labels Added", before, after));
  }));

  server.registerTool("remove_labels_from_issue", {
    title: "Remove Jira Issue Labels",
    description: "Remove one or more labels from a Jira issue.",
    inputSchema: { issue_key: issueKey, labels: z.array(z.string().min(1).max(255)).min(1).max(25), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const before = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    await client.request<unknown>(endpoints.issue(params.issue_key), { method: "PUT", body: { update: { labels: params.labels.map((label) => ({ remove: label })) } } });
    const after = normalizeIssue(await client.request<JiraIssue>(endpoints.issue(params.issue_key)));
    return params.response_format === "json" ? toolText({ before, after }, "json") : toolText(beforeAfter("Labels Removed", before, after));
  }));

  server.registerTool("link_issues", {
    title: "Link Jira Issues",
    description: "Create a Jira issue link using an explicit link type and inward/outward issue keys.",
    inputSchema: {
      type_name: z.string().min(1).max(80).describe("Issue link type name, such as Blocks, Relates, or Cloners."),
      inward_issue_key: issueKey,
      outward_issue_key: issueKey,
      comment_text: z.string().max(2000).optional(),
      response_format: responseFormat
    },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const body: Record<string, unknown> = {
      type: { name: params.type_name },
      inwardIssue: { key: params.inward_issue_key },
      outwardIssue: { key: params.outward_issue_key }
    };
    if (params.comment_text) {
      body.comment = { body: adfText(params.comment_text) };
    }
    await client.request<unknown>(endpoints.issueLink, { method: "POST", body });
    return toolText(`# Issues Linked\n\nType: ${params.type_name}\nInward: ${params.inward_issue_key}\nOutward: ${params.outward_issue_key}`);
  }));

  server.registerTool("move_issues_to_sprint", {
    title: "Move Jira Issues To Sprint",
    description: "Move explicit issue keys into a sprint. Requires issue keys and sprint ID.",
    inputSchema: { sprint_id: sprintId, issue_keys: z.array(issueKey).min(1).max(50), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const sprint = client.defaultSprint(params.sprint_id);
    await client.request<unknown>(endpoints.sprintIssues(sprint), { method: "POST", body: { issues: params.issue_keys } });
    return params.response_format === "json" ? toolText({ sprint_id: sprint, moved: params.issue_keys }, "json") : toolText(`# Issues Moved To Sprint\n\nSprint ID: ${sprint}\nIssues: ${params.issue_keys.join(", ")}`);
  }));

  server.registerTool("create_version", {
    title: "Create Jira Version",
    description: "Create a project version/release.",
    inputSchema: versionSchema(),
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const version = await client.request<Record<string, unknown>>(endpoints.version, { method: "POST", body: versionBody(client.defaultProject(params.project_key), params) });
    return params.response_format === "json" ? toolText({ created: version }, "json") : toolText(`# Version Created\n\nName: ${String(version.name || params.name)}\nProject: ${client.defaultProject(params.project_key)}`);
  }));

  server.registerTool("update_version", {
    title: "Update Jira Version",
    description: "Update a project version/release by version ID.",
    inputSchema: { version_id: z.string().min(1).max(80), ...versionSchema(true), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const updated = await client.request<Record<string, unknown>>(endpoints.versionById(params.version_id), { method: "PUT", body: versionBody(params.project_key ? client.defaultProject(params.project_key) : undefined, params) });
    return params.response_format === "json" ? toolText({ updated }, "json") : toolText(`# Version Updated\n\nVersion ID: ${params.version_id}\nName: ${String(updated.name || params.name || "unchanged")}`);
  }));

  server.registerTool("create_component", {
    title: "Create Jira Component",
    description: "Create a project component.",
    inputSchema: componentSchema(),
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const component = await client.request<Record<string, unknown>>(endpoints.component, { method: "POST", body: componentBody(client.defaultProject(params.project_key), params) });
    return params.response_format === "json" ? toolText({ created: component }, "json") : toolText(`# Component Created\n\nName: ${String(component.name || params.name)}\nProject: ${client.defaultProject(params.project_key)}`);
  }));

  server.registerTool("update_component", {
    title: "Update Jira Component",
    description: "Update a project component by component ID.",
    inputSchema: { component_id: z.string().min(1).max(80), ...componentSchema(true), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const updated = await client.request<Record<string, unknown>>(endpoints.componentById(params.component_id), { method: "PUT", body: componentBody(params.project_key ? client.defaultProject(params.project_key) : undefined, params) });
    return params.response_format === "json" ? toolText({ updated }, "json") : toolText(`# Component Updated\n\nComponent ID: ${params.component_id}\nName: ${String(updated.name || params.name || "unchanged")}`);
  }));

  server.registerTool("create_sprint", {
    title: "Create Jira Sprint",
    description: "Create a sprint on a board using explicit board ID and sprint name.",
    inputSchema: sprintSchema(),
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const sprint = await client.request<Record<string, unknown>>(endpoints.createSprint, { method: "POST", body: sprintBody(client.defaultBoard(params.board_id), params) });
    return params.response_format === "json" ? toolText({ created: sprint }, "json") : toolText(`# Sprint Created\n\nName: ${String(sprint.name || params.name)}\nBoard ID: ${client.defaultBoard(params.board_id)}`);
  }));

  server.registerTool("update_sprint", {
    title: "Update Jira Sprint",
    description: "Update sprint name, dates, goal, or state using an explicit sprint ID.",
    inputSchema: { sprint_id: sprintId, ...sprintSchema(true), response_format: responseFormat },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const updated = await client.request<Record<string, unknown>>(endpoints.sprint(client.defaultSprint(params.sprint_id)), { method: "PUT", body: sprintBody(params.board_id ? client.defaultBoard(params.board_id) : undefined, params) });
    return params.response_format === "json" ? toolText({ updated }, "json") : toolText(`# Sprint Updated\n\nSprint ID: ${client.defaultSprint(params.sprint_id)}\nName: ${String(updated.name || params.name || "unchanged")}`);
  }));

  server.registerTool("create_project_plan", {
    title: "Create Jira Project Plan",
    description: "Safely create a structured Jira plan. Dry-run is true by default. Validates issue types, creates epics first, creates children with parent keys, creates subtasks last, and checks for duplicates.",
    inputSchema: {
      project_key: projectKey,
      dry_run: z.boolean().default(true).describe("When true, show what would be created without writing to Jira."),
      duplicate_strategy: z.enum(["reuse", "skip", "fail"]).default("reuse").describe("How to handle an existing issue with the same project, type, and summary."),
      epics: z.array(planEpicSchema).min(1).max(25).describe("Structured plan. Epics are created first, then children, then subtasks."),
      response_format: responseFormat
    },
    annotations: writeAnnotations
  }, async (params) => safeTool(async () => {
    const project = client.defaultProject(params.project_key);
    const capabilities = await getProjectCapabilities(client, project);
    const validationErrors = validatePlan(capabilities, params.epics);
    if (validationErrors.length) {
      return toolText({
        ok: false,
        dry_run: params.dry_run,
        project,
        validationErrors,
        nextAction: "Run get_project_capabilities and update the plan to use supported issue types, or provide required fields in additional_fields."
      }, params.response_format);
    }

    const actions: PlanAction[] = [];
    const createdKeys: string[] = [];
    const context = { client, project, dryRun: params.dry_run, duplicateStrategy: params.duplicate_strategy, actions, createdKeys };

    for (const epic of params.epics) {
      const epicResult = await planCreateIssue(context, epic.issue_type || "Epic", epic.summary, epic.description_text, epic.additional_fields);
      const epicKey = epicResult.key;
      for (const child of epic.children || []) {
        if (!epicKey) {
          actions.push({ action: "blocked", issueType: child.issue_type, summary: child.summary, reason: "Parent epic was skipped, so child cannot be linked." });
          continue;
        }
        const childResult = await planCreateIssue(context, child.issue_type, child.summary, child.description_text, { ...(child.additional_fields || {}), parent: { key: epicKey } });
        const childKey = childResult.key;
        for (const subtask of child.subtasks || []) {
          if (!childKey) {
            actions.push({ action: "blocked", issueType: subtask.issue_type || "Subtask", summary: subtask.summary, reason: "Parent issue was skipped, so subtask cannot be linked." });
            continue;
          }
          await planCreateIssue(context, subtask.issue_type || "Subtask", subtask.summary, subtask.description_text, { ...(subtask.additional_fields || {}), parent: { key: childKey } });
        }
      }
    }

    const result = {
      ok: true,
      dry_run: params.dry_run,
      project,
      duplicate_strategy: params.duplicate_strategy,
      createdKeys,
      actions,
      nextAction: params.dry_run ? "Review this dry run. Re-run with dry_run=false to create these Jira issues." : "Review the created keys and run search_issues or get_issue to inspect the new plan."
    };

    return params.response_format === "json" ? toolText(result, "json") : toolText(planMarkdown(result));
  }));
}

function adfText(text: string): Record<string, unknown> {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }]
      }
    ]
  };
}

interface PlanAction {
  action: "would_create" | "created" | "reused" | "skipped" | "blocked";
  issueType: string;
  summary: string;
  key?: string;
  parentKey?: string;
  reason?: string;
}

interface PlanContext {
  client: JiraClient;
  project: string;
  dryRun: boolean;
  duplicateStrategy: "reuse" | "skip" | "fail";
  actions: PlanAction[];
  createdKeys: string[];
}

function validatePlan(capabilities: Awaited<ReturnType<typeof getProjectCapabilities>>, epics: Array<z.infer<typeof planEpicSchema>>): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const epic of epics) {
    validateIssuePlanItem(capabilities, epic.issue_type || "Epic", epic.summary, epic.additional_fields, errors, seen);
    for (const child of epic.children || []) {
      validateIssuePlanItem(capabilities, child.issue_type, child.summary, child.additional_fields, errors, seen);
      const childType = findIssueType(capabilities, child.issue_type);
      if (childType?.subtask || (childType?.hierarchyLevel ?? 0) < 0) {
        errors.push(`${child.summary}: child issue type ${child.issue_type} is a subtask type. Put it under subtasks instead.`);
      }
      for (const subtask of child.subtasks || []) {
        validateIssuePlanItem(capabilities, subtask.issue_type || "Subtask", subtask.summary, { ...(subtask.additional_fields || {}), parent: { key: "PARENT_WILL_BE_SET" } }, errors, seen);
        const subtaskType = findIssueType(capabilities, subtask.issue_type || "Subtask");
        if (subtaskType && !subtaskType.subtask && subtaskType.hierarchyLevel >= 0) {
          errors.push(`${subtask.summary}: subtask issue type ${subtask.issue_type || "Subtask"} is not configured as a subtask in this project.`);
        }
      }
    }
  }

  return errors;
}

function validateIssuePlanItem(
  capabilities: Awaited<ReturnType<typeof getProjectCapabilities>>,
  issueType: string,
  summary: string,
  additionalFields: Record<string, unknown> | undefined,
  errors: string[],
  seen: Set<string>
): void {
  const type = findIssueType(capabilities, issueType);
  if (!type) {
    errors.push(`${summary}: issue type ${issueType} is not available in project ${capabilities.project.key || "unknown"}.`);
    return;
  }

  const duplicateKey = `${issueType.toLowerCase()}::${summary.toLowerCase()}`;
  if (seen.has(duplicateKey)) {
    errors.push(`${summary}: duplicate item in the submitted plan for issue type ${issueType}.`);
  }
  seen.add(duplicateKey);

  const required = capabilities.requiredCreateFields[issueType] || [];
  const missingRequired = required.filter((field) => !hasProvidedField(additionalFields, field));
  if (missingRequired.length) {
    errors.push(`${summary}: ${issueType} requires extra field(s): ${missingRequired.join(", ")}. Provide them in additional_fields.`);
  }
}

async function planCreateIssue(
  context: PlanContext,
  issueType: string,
  summary: string,
  descriptionText: string | undefined,
  additionalFields: Record<string, unknown> | undefined
): Promise<{ key?: string }> {
  const existing = await findExistingIssue(context.client, context.project, issueType, summary);
  const parentKey = parentKeyFromFields(additionalFields);

  if (existing) {
    if (context.duplicateStrategy === "fail") {
      throw new Error(`Duplicate found for ${issueType} "${summary}" as ${existing.key}. Use duplicate_strategy=reuse or skip if this is expected.`);
    }
    if (context.duplicateStrategy === "skip") {
      context.actions.push({ action: "skipped", issueType, summary, key: existing.key, parentKey, reason: "Duplicate issue already exists." });
      return {};
    }
    context.actions.push({ action: "reused", issueType, summary, key: existing.key, parentKey, reason: "Duplicate issue already exists." });
    return { key: existing.key };
  }

  if (context.dryRun) {
    context.actions.push({ action: "would_create", issueType, summary, parentKey });
    return { key: dryRunKey(issueType, context.actions.length) };
  }

  const fields: Record<string, unknown> = {
    project: { key: context.project },
    issuetype: { name: issueType },
    summary,
    ...(additionalFields || {})
  };
  if (descriptionText) {
    fields.description = adfText(descriptionText);
  }

  const created = await context.client.request<{ id: string; key: string; self: string }>(endpoints.createIssue, { method: "POST", body: { fields } });
  context.createdKeys.push(created.key);
  context.actions.push({ action: "created", issueType, summary, key: created.key, parentKey });
  return { key: created.key };
}

async function findExistingIssue(client: JiraClient, project: string, issueType: string, summary: string): Promise<{ key: string } | undefined> {
  const jql = `project = ${escapeJqlValue(project)} AND issuetype = ${escapeJqlValue(issueType)} AND summary ~ ${escapeJqlValue(summary)} ORDER BY updated DESC`;
  const issues = (await searchIssues(client, jql, 20)).map(normalizeIssue);
  return issues.find((issue) => issue.issueType.toLowerCase() === issueType.toLowerCase() && issue.title.trim().toLowerCase() === summary.trim().toLowerCase());
}

function hasProvidedField(fields: Record<string, unknown> | undefined, fieldName: string): boolean {
  if (!fields) {
    return false;
  }
  const normalized = normalizeFieldName(fieldName);
  return Object.keys(fields).some((key) => normalizeFieldName(key) === normalized);
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parentKeyFromFields(fields: Record<string, unknown> | undefined): string | undefined {
  const parent = fields?.parent;
  if (typeof parent === "object" && parent && "key" in parent) {
    return String((parent as { key?: unknown }).key || "") || undefined;
  }
  return undefined;
}

function dryRunKey(issueType: string, index: number): string {
  return `DRY-${issueType.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "ISS"}-${index}`;
}

function escapeJqlValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function planMarkdown(result: { dry_run: boolean; project: string; duplicate_strategy: string; createdKeys: string[]; actions: PlanAction[]; nextAction: string }): string {
  return [
    "# Jira Project Plan",
    "",
    `Project: ${result.project}`,
    `Mode: ${result.dry_run ? "Dry run" : "Create"}`,
    `Duplicate strategy: ${result.duplicate_strategy}`,
    "",
    "## Actions",
    ...(result.actions.length ? result.actions.map((action) => `- ${action.action}: ${action.issueType} - ${action.summary}${action.key ? ` (${action.key})` : ""}${action.parentKey ? ` under ${action.parentKey}` : ""}${action.reason ? ` - ${action.reason}` : ""}`) : ["- No actions."]),
    "",
    "## Created Keys",
    result.createdKeys.length ? result.createdKeys.map((key) => `- ${key}`).join("\n") : "- None",
    "",
    `Next action: ${result.nextAction}`
  ].join("\n");
}

function beforeAfter(title: string, before: ReturnType<typeof normalizeIssue>, after: ReturnType<typeof normalizeIssue>): string {
  return `# ${title}\n\nIssue: ${after.key}\n\nBefore: ${before.status}, owner ${before.owner}, labels ${before.labels.join(", ") || "none"}\nAfter: ${after.status}, owner ${after.owner}, labels ${after.labels.join(", ") || "none"}`;
}

function versionSchema(optional = false) {
  return {
    project_key: optional ? projectKey : z.string().min(1).max(80).describe("Jira project key."),
    name: optional ? z.string().min(1).max(255).optional() : z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    release_date: z.string().max(40).optional(),
    start_date: z.string().max(40).optional(),
    archived: z.boolean().optional(),
    released: z.boolean().optional(),
    response_format: responseFormat
  };
}

function versionBody(project: string | undefined, params: Record<string, unknown>): Record<string, unknown> {
  return clean({
    project,
    name: params.name,
    description: params.description,
    releaseDate: params.release_date,
    startDate: params.start_date,
    archived: params.archived,
    released: params.released
  });
}

function componentSchema(optional = false) {
  return {
    project_key: optional ? projectKey : z.string().min(1).max(80).describe("Jira project key."),
    name: optional ? z.string().min(1).max(255).optional() : z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    lead_account_id: z.string().min(1).max(200).optional(),
    assignee_type: z.enum(["PROJECT_DEFAULT", "COMPONENT_LEAD", "PROJECT_LEAD", "UNASSIGNED"]).optional(),
    response_format: responseFormat
  };
}

function componentBody(project: string | undefined, params: Record<string, unknown>): Record<string, unknown> {
  return clean({
    project,
    name: params.name,
    description: params.description,
    leadAccountId: params.lead_account_id,
    assigneeType: params.assignee_type
  });
}

function sprintSchema(optional = false) {
  return {
    board_id: optional ? z.number().int().positive().optional() : z.number().int().positive().describe("Board ID where the sprint belongs."),
    name: optional ? z.string().min(1).max(255).optional() : z.string().min(1).max(255),
    start_date: z.string().max(80).optional(),
    end_date: z.string().max(80).optional(),
    goal: z.string().max(2000).optional(),
    state: z.enum(["future", "active", "closed"]).optional(),
    response_format: responseFormat
  };
}

function sprintBody(originBoardId: number | undefined, params: Record<string, unknown>): Record<string, unknown> {
  return clean({
    originBoardId,
    name: params.name,
    startDate: params.start_date,
    endDate: params.end_date,
    goal: params.goal,
    state: params.state
  });
}

function clean(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ""));
}
