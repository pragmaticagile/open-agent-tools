export type ResponseFormat = "markdown" | "json";

export interface JiraProject {
  id?: string;
  key?: string;
  name?: string;
  projectTypeKey?: string;
  simplified?: boolean;
  lead?: JiraUser;
  issueTypes?: JiraIssueType[];
}

export interface JiraIssueType {
  id?: string;
  name?: string;
  description?: string;
  subtask?: boolean;
  hierarchyLevel?: number;
}

export interface JiraUser {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
  active?: boolean;
}

export interface JiraBoard {
  id: number;
  self?: string;
  name?: string;
  type?: string;
  location?: {
    projectKey?: string;
    projectName?: string;
    displayName?: string;
  };
}

export interface JiraSprint {
  id: number;
  name?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
  originBoardId?: number;
}

export interface JiraIssue {
  id?: string;
  key: string;
  fields?: JiraIssueFields;
}

export interface JiraIssueFields {
  summary?: string;
  issuetype?: { name?: string };
  status?: { name?: string; statusCategory?: { name?: string } };
  assignee?: JiraUser | null;
  reporter?: JiraUser | null;
  priority?: { name?: string };
  labels?: string[];
  created?: string;
  updated?: string;
  duedate?: string | null;
  resolutiondate?: string | null;
  components?: Array<{ id?: string; name?: string }>;
  fixVersions?: Array<{ id?: string; name?: string; releaseDate?: string; released?: boolean }>;
  parent?: { key?: string; fields?: { summary?: string } };
  [key: string]: unknown;
}

export interface NormalizedIssue {
  key: string;
  title: string;
  issueType: string;
  status: string;
  statusCategory: string;
  owner: string;
  ownerAccountId?: string;
  priority: string;
  labels: string[];
  sprintNames: string[];
  startDate?: string;
  endDate?: string;
  estimate?: number;
  storyPoints?: number;
  created?: string;
  updated?: string;
  dueDate?: string;
  blockers: string[];
  components: string[];
  fixVersions: string[];
}

export interface JiraPage<T> {
  startAt?: number;
  maxResults?: number;
  total?: number;
  isLast?: boolean;
  nextPageCursor?: string;
  values?: T[];
  issues?: JiraIssue[];
}

export interface JiraPlanIssueSource {
  type?: "Board" | "Project" | "Filter" | string;
  value?: string | number;
}

export interface JiraPlan {
  id?: string | number;
  name?: string;
  scenarioId?: string | number;
  status?: string;
  issueSources?: JiraPlanIssueSource[];
  [key: string]: unknown;
}
