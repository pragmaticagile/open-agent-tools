import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

export interface AuthConfig {
  organization?: string;
  pat: string;
  patSource: "AZURE_DEVOPS_PAT" | "AZURE_DEVOPS_PAT_FILE";
}

export function resolveOrganization(inputOrg?: string): string {
  const org = inputOrg || process.env.AZURE_DEVOPS_ORG || process.argv[2];
  if (!org || !org.trim()) {
    throw new Error(
      "Azure DevOps organization is missing. Set AZURE_DEVOPS_ORG, pass the organization as the first CLI argument, or provide organization in the tool input."
    );
  }
  return org.trim().replace(/^https?:\/\/dev\.azure\.com\//i, "").replace(/^\/+|\/+$/g, "");
}

export function readPat(): Pick<AuthConfig, "pat" | "patSource"> {
  const directPat = process.env.AZURE_DEVOPS_PAT?.trim();
  if (directPat) {
    return { pat: directPat, patSource: "AZURE_DEVOPS_PAT" };
  }

  const patFile = process.env.AZURE_DEVOPS_PAT_FILE?.trim();
  if (!patFile) {
    throw new Error(
      "Azure DevOps PAT is missing. Set AZURE_DEVOPS_PAT or AZURE_DEVOPS_PAT_FILE. Use a read-only PAT when possible, and never paste the PAT into chat."
    );
  }

  const expanded = patFile.startsWith("~") ? path.join(process.env.HOME || "", patFile.slice(1)) : patFile;
  try {
    const pat = fs.readFileSync(expanded, "utf8").trim();
    if (!pat) {
      throw new Error("The PAT file is empty.");
    }
    return { pat, patSource: "AZURE_DEVOPS_PAT_FILE" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read AZURE_DEVOPS_PAT_FILE. Check that the file exists and is readable. Details: ${message}`);
  }
}

export function authHeader(pat: string): string {
  return `Basic ${Buffer.from(`:${pat}`, "utf8").toString("base64")}`;
}
