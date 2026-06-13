import { AzureDevOpsClient, PREVIEW_API_VERSION, valueArray } from "./client.js";
import type { AzureWorkItem, CapacitySummary, NormalizedWorkItem, SprintContext } from "./types.js";
import { normalizeWorkItem, resolveProject, resolveTeam } from "../format.js";

const WORK_ITEM_FIELDS = [
  "System.Id",
  "System.Title",
  "System.WorkItemType",
  "System.State",
  "System.ChangedDate",
  "System.AssignedTo",
  "System.IterationPath",
  "System.AreaPath",
  "Microsoft.VSTS.Scheduling.StartDate",
  "Microsoft.VSTS.Scheduling.TargetDate",
  "Microsoft.VSTS.Scheduling.DueDate",
  "Microsoft.VSTS.Scheduling.RemainingWork",
  "Microsoft.VSTS.Scheduling.CompletedWork",
  "Microsoft.VSTS.Scheduling.OriginalEstimate",
  "Microsoft.VSTS.Common.ClosedDate",
  "Microsoft.VSTS.Common.Priority",
  "Microsoft.VSTS.Common.Severity"
];

export async function runWiql(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; query: string; limit?: number }
): Promise<number[]> {
  const project = resolveProject(params.project);
  const data = await client.request<{ workItems?: Array<{ id: number }> }>(
    "/_apis/wit/wiql",
    {
      organization: params.organization,
      project,
      method: "POST",
      body: { query: params.query },
      query: { $top: params.limit || 50 }
    }
  );
  return (data.workItems || []).map((item) => item.id);
}

export async function getWorkItemsByIds(
  client: AzureDevOpsClient,
  params: { organization?: string; ids: number[]; expandRelations?: boolean }
): Promise<NormalizedWorkItem[]> {
  if (!params.ids.length) return [];
  const batches: NormalizedWorkItem[] = [];
  for (let index = 0; index < params.ids.length; index += 200) {
    const ids = params.ids.slice(index, index + 200);
    const data = await client.request<{ value?: AzureWorkItem[] }>("/_apis/wit/workitems", {
      organization: params.organization,
      query: {
        ids: ids.join(","),
        fields: WORK_ITEM_FIELDS.join(","),
        $expand: params.expandRelations ? "relations" : undefined
      }
    });
    batches.push(...valueArray<AzureWorkItem>(data).map(normalizeWorkItem));
  }
  return batches;
}

export async function getWorkItem(
  client: AzureDevOpsClient,
  params: { organization?: string; id: number }
): Promise<AzureWorkItem> {
  return client.request<AzureWorkItem>(`/_apis/wit/workitems/${params.id}`, {
    organization: params.organization,
    query: { $expand: "relations" }
  });
}

export async function getCurrentSprint(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; team?: string }
): Promise<SprintContext> {
  const project = resolveProject(params.project);
  const team = resolveTeam(params.team);
  const data = await client.request<{ value?: Array<Record<string, unknown>> }>(
    `/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations`,
    {
      organization: params.organization,
      project,
      query: { $timeframe: "current" }
    }
  );
  const iteration = valueArray<Record<string, unknown>>(data)[0];
  if (!iteration) {
    throw new Error(`Current sprint not found for project "${project}" and team "${team}". Check the team name and iteration dates.`);
  }
  const attributes = (iteration.attributes || {}) as Record<string, unknown>;
  return {
    project,
    team,
    iterationId: String(iteration.id),
    iterationName: String(iteration.name || iteration.path || "Current sprint"),
    iterationPath: String(iteration.path || ""),
    startDate: attributes.startDate ? String(attributes.startDate) : undefined,
    finishDate: attributes.finishDate ? String(attributes.finishDate) : undefined
  };
}

export async function listSprintWorkItems(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; team?: string; iterationId?: string; limit?: number }
): Promise<{ sprint: SprintContext; items: NormalizedWorkItem[] }> {
  const sprint = params.iterationId
    ? { project: resolveProject(params.project), team: resolveTeam(params.team), iterationId: params.iterationId, iterationName: params.iterationId }
    : await getCurrentSprint(client, params);
  const data = await client.request<{ workItemRelations?: Array<{ target?: { id?: number } }> }>(
    `/${encodeURIComponent(sprint.team)}/_apis/work/teamsettings/iterations/${encodeURIComponent(sprint.iterationId)}/workitems`,
    {
      organization: params.organization,
      project: sprint.project
    }
  );
  const ids = (data.workItemRelations || [])
    .map((relation) => relation.target?.id)
    .filter((id): id is number => typeof id === "number")
    .slice(0, params.limit || 100);
  const items = await getWorkItemsByIds(client, { organization: params.organization, ids });
  return { sprint, items };
}

export async function getTeamCapacity(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; team?: string; iterationId?: string }
): Promise<{ sprint: SprintContext; capacity: CapacitySummary }> {
  const sprint = params.iterationId
    ? { project: resolveProject(params.project), team: resolveTeam(params.team), iterationId: params.iterationId, iterationName: params.iterationId }
    : await getCurrentSprint(client, params);
  const data = await client.request<{ value?: Array<Record<string, unknown>> }>(
    `/${encodeURIComponent(sprint.team)}/_apis/work/teamsettings/iterations/${encodeURIComponent(sprint.iterationId)}/capacities`,
    {
      organization: params.organization,
      project: sprint.project
    }
  );
  const members = valueArray<Record<string, unknown>>(data).map((entry) => {
    const teamMember = (entry.teamMember || {}) as Record<string, unknown>;
    const activities = Array.isArray(entry.activities)
      ? entry.activities.map((activity) => ({
          name: String((activity as Record<string, unknown>).name || "Activity"),
          capacityPerDay: Number((activity as Record<string, unknown>).capacityPerDay || 0)
        }))
      : [];
    const daysOffDetails = Array.isArray(entry.daysOff)
      ? entry.daysOff.map((dayOff) => {
          const value = dayOff as Record<string, unknown>;
          return {
            start: value.start ? String(value.start) : undefined,
            end: value.end ? String(value.end) : undefined
          };
        })
      : [];
    const daysOff = daysOffDetails.length;
    return {
      name: String(teamMember.displayName || teamMember.uniqueName || "Unknown team member"),
      activities,
      daysOff,
      daysOffDetails,
      totalCapacityPerDay: activities.reduce((sum, activity) => sum + activity.capacityPerDay, 0)
    };
  });
  return {
    sprint,
    capacity: {
      teamMembers: members,
      totalCapacityPerDay: members.reduce((sum, member) => sum + member.totalCapacityPerDay, 0),
      daysOffCount: members.reduce((sum, member) => sum + member.daysOff, 0),
      warnings: members.length ? [] : ["No capacity data is available for this sprint/team."]
    }
  };
}

export async function listDeliveryPlans(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string }
): Promise<Array<Record<string, unknown>>> {
  const project = resolveProject(params.project);
  const data = await client.request<{ value?: Array<Record<string, unknown>> }>("/_apis/work/plans", {
    organization: params.organization,
    project,
    apiVersion: PREVIEW_API_VERSION
  });
  return valueArray<Record<string, unknown>>(data);
}

export async function resolveDeliveryPlanId(
  client: AzureDevOpsClient,
  params: { organization?: string; project?: string; deliveryPlan: string }
): Promise<string> {
  if (/^[0-9a-f-]{20,}$/i.test(params.deliveryPlan)) return params.deliveryPlan;
  const plans = await listDeliveryPlans(client, params);
  const match = plans.find((plan) => String(plan.name || "").toLowerCase() === params.deliveryPlan.toLowerCase());
  if (!match || !match.id) {
    throw new Error(`Delivery plan "${params.deliveryPlan}" was not found. Use list_delivery_plans to confirm the exact name.`);
  }
  return String(match.id);
}
