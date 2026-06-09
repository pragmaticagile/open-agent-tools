export type ResponseFormat = "markdown" | "json";

export interface AzureIdentityRef {
  displayName?: string;
  uniqueName?: string;
  id?: string;
}

export interface AzureWorkItem {
  id: number;
  url?: string;
  fields: Record<string, unknown>;
  relations?: Array<{ rel?: string; url?: string; attributes?: Record<string, unknown> }>;
}

export interface NormalizedWorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  owner: string;
  iteration: string;
  area: string;
  startDate?: string;
  targetDate?: string;
  closedDate?: string;
  remainingWork?: number;
  completedWork?: number;
  originalEstimate?: number;
  severity?: string;
  priority?: string | number;
  url?: string;
}

export interface SprintContext {
  project: string;
  team: string;
  iterationId: string;
  iterationName: string;
  iterationPath?: string;
  startDate?: string;
  finishDate?: string;
}

export interface CapacitySummary {
  teamMembers: Array<{
    name: string;
    activities: Array<{ name: string; capacityPerDay: number }>;
    daysOff: number;
    totalCapacityPerDay: number;
  }>;
  totalCapacityPerDay: number;
  daysOffCount: number;
  warnings: string[];
}

export interface ToolContext {
  organization?: string;
  project?: string;
  team?: string;
  repository?: string;
  deliveryPlan?: string;
  pipeline?: string | number;
  response_format?: ResponseFormat;
  limit?: number;
}
