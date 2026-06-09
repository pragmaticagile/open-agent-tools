import { z } from "zod";

export const responseFormat = z.enum(["markdown", "json"]).default("markdown").describe("Use markdown for readable summaries or json for structured data.");
export const organization = z.string().min(1).optional().describe("Azure DevOps organization name. Optional when AZURE_DEVOPS_ORG or the first CLI argument is set.");
export const project = z.string().min(1).optional().describe("Azure DevOps project name. Optional only when AZURE_DEVOPS_DEFAULT_PROJECT is set.");
export const team = z.string().min(1).optional().describe("Azure DevOps team name. Optional only when AZURE_DEVOPS_DEFAULT_TEAM is set.");
export const limit = z.number().int().min(1).max(200).default(50).describe("Maximum number of items to return.");
export const offset = z.number().int().min(0).default(0).describe("Number of items to skip when the Azure DevOps API supports paging.");
