import { JiraClient } from "./client.js";
import { endpoints } from "./endpoints.js";
import { JiraIssueType, JiraProject } from "./types.js";

export interface ProjectCapabilities {
  project: {
    id?: string;
    key?: string;
    name?: string;
    type?: string;
    simplified?: boolean;
  };
  issueTypes: Array<{
    id?: string;
    name: string;
    description?: string;
    subtask: boolean;
    hierarchyLevel: number;
  }>;
  hasFeature: boolean;
  hasSubtask: boolean;
  requiredCreateFields: Record<string, string[]>;
  recommendedStructure: string;
  warnings: string[];
}

export async function getProjectCapabilities(client: JiraClient, projectKey: string): Promise<ProjectCapabilities> {
  const project = await client.request<JiraProject>(endpoints.project(projectKey));
  const issueTypes = (project.issueTypes || []).map(normalizeIssueType).sort((a, b) => b.hierarchyLevel - a.hierarchyLevel || a.name.localeCompare(b.name));
  const requiredCreateFields = await getRequiredCreateFields(client, projectKey, issueTypes);
  const hasFeature = issueTypes.some((type) => type.name.toLowerCase() === "feature");
  const hasSubtask = issueTypes.some((type) => type.subtask || type.name.toLowerCase() === "subtask");
  const normalTypes = issueTypes.filter((type) => type.hierarchyLevel === 0 && !type.subtask).map((type) => type.name).sort(preferredIssueTypeOrder);
  const topTypes = issueTypes.filter((type) => type.hierarchyLevel > 0).map((type) => type.name);
  const subtaskTypes = issueTypes.filter((type) => type.subtask || type.hierarchyLevel < 0).map((type) => type.name);

  return {
    project: {
      id: project.id,
      key: project.key,
      name: project.name,
      type: project.projectTypeKey,
      simplified: project.simplified
    },
    issueTypes,
    hasFeature,
    hasSubtask,
    requiredCreateFields,
    recommendedStructure: `${topTypes[0] || "Epic"} -> ${normalTypes.join("/") || "Story/Task/Bug"}${subtaskTypes.length ? ` -> ${subtaskTypes[0]}` : ""}`,
    warnings: buildCapabilityWarnings(issueTypes, requiredCreateFields)
  };
}

function preferredIssueTypeOrder(a: string, b: string): number {
  const preferred = ["Feature", "Story", "Task", "Bug"];
  const aIndex = preferred.indexOf(a);
  const bIndex = preferred.indexOf(b);
  if (aIndex >= 0 && bIndex >= 0) {
    return aIndex - bIndex;
  }
  if (aIndex >= 0) {
    return -1;
  }
  if (bIndex >= 0) {
    return 1;
  }
  return a.localeCompare(b);
}

export function findIssueType(capabilities: ProjectCapabilities, issueTypeName: string): ProjectCapabilities["issueTypes"][number] | undefined {
  return capabilities.issueTypes.find((type) => type.name.toLowerCase() === issueTypeName.toLowerCase());
}

function normalizeIssueType(type: JiraIssueType) {
  return {
    id: type.id,
    name: type.name || "Unknown",
    description: type.description,
    subtask: Boolean(type.subtask),
    hierarchyLevel: typeof type.hierarchyLevel === "number" ? type.hierarchyLevel : type.subtask ? -1 : 0
  };
}

async function getRequiredCreateFields(client: JiraClient, projectKey: string, issueTypes: Array<{ id?: string; name: string }>): Promise<Record<string, string[]>> {
  try {
    const data = await client.request<{ projects?: Array<{ issuetypes?: Array<{ name?: string; fields?: Record<string, { required?: boolean; name?: string }> }> }> }>(endpoints.createMeta, {
      query: {
        projectKeys: projectKey,
        expand: "projects.issuetypes.fields"
      }
    });
    const fieldsByType: Record<string, string[]> = {};
    for (const project of data.projects || []) {
      for (const issueType of project.issuetypes || []) {
        const required = Object.entries(issueType.fields || {})
          .filter(([, field]) => field.required)
          .map(([key, field]) => field.name || key)
          .filter((field) => !["Project", "Issue Type", "Summary"].includes(field));
        if (issueType.name) {
          fieldsByType[issueType.name] = required;
        }
      }
    }
    return fieldsByType;
  } catch {
    return Object.fromEntries(issueTypes.map((type) => [type.name, []]));
  }
}

function buildCapabilityWarnings(issueTypes: Array<{ name: string; subtask: boolean; hierarchyLevel: number }>, requiredCreateFields: Record<string, string[]>): string[] {
  const warnings: string[] = [];
  if (!issueTypes.some((type) => type.name.toLowerCase() === "epic")) {
    warnings.push("Epic issue type was not found. Plan creation can still create normal issues, but parent planning may be limited.");
  }
  if (!issueTypes.some((type) => type.subtask || type.hierarchyLevel < 0)) {
    warnings.push("Subtask issue type was not found. Subtask rows in a plan cannot be created for this project.");
  }
  for (const [issueType, fields] of Object.entries(requiredCreateFields)) {
    if (fields.length) {
      warnings.push(`${issueType} has extra required create field(s): ${fields.join(", ")}. Provide them in additional_fields when creating issues.`);
    }
  }
  return warnings;
}
