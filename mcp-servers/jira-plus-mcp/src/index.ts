#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { JiraClient } from "./jira/client.js";
import { registerReadTools } from "./tools/read-tools.js";
import { registerReportingTools } from "./tools/reporting-tools.js";
import { registerWriteTools } from "./tools/write-tools.js";

dotenv.config({ quiet: true });

const server = new McpServer({
  name: "jira-plus",
  version: "1.0.0"
});

const client = new JiraClient();

registerReadTools(server, client);
registerReportingTools(server, client);

if (process.env.JIRA_ENABLE_WRITE_TOOLS === "true") {
  registerWriteTools(server, client);
}

const transport = new StdioServerTransport();
await server.connect(transport);
