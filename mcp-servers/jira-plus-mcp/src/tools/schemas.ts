import { z } from "zod";

export const responseFormat = z.enum(["markdown", "json"]).default("markdown").describe("Use markdown for readable summaries or json for structured output.");
export const limit = z.number().int().min(1).max(100).default(50).describe("Maximum results to return. Keep this low for concise MCP responses.");
export const projectKey = z.string().min(1).max(80).optional().describe("Jira project key. If omitted, JIRA_DEFAULT_PROJECT is used when configured.");
export const boardId = z.number().int().positive().optional().describe("Jira Agile board ID. If omitted, JIRA_DEFAULT_BOARD is used when configured.");
export const sprintId = z.number().int().positive().optional().describe("Jira sprint ID. If omitted, JIRA_DEFAULT_SPRINT is used when configured.");
export const issueKey = z.string().min(1).max(80).describe("Jira issue key, for example YOUR_ISSUE_KEY_HERE.");
export const accountId = z.string().min(1).max(200).describe("Jira account ID, for example YOUR_ACCOUNT_ID_HERE.");
export const jql = z.string().min(1).max(4000).describe("Jira Query Language search string.");
export const planId = z.number().int().positive().describe("Jira Plans/Roadmaps plan ID.");
export const cursor = z.string().min(1).max(500).optional().describe("Optional pagination cursor returned by Jira.");
