#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { AzureDevOpsClient } from "./azure/client.js";
import { registerTools } from "./tools/register.js";

dotenv.config();

const server = new McpServer({
  name: "ado-plus",
  version: "1.0.0"
});

registerTools(server, new AzureDevOpsClient());

const transport = new StdioServerTransport();
await server.connect(transport);
