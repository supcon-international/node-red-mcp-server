/**
 * MCP tools for working with Node-RED nodes
 */

import { z } from "zod";
import { callNodeRed } from "../utils.mjs";

/**
 * Registers node-related tools in the MCP server
 * @param {Object} server - MCP server instance
 * @param {Object} config - Server configuration
 */
export default function registerNodeTools(server, config) {
  // Trigger inject node
  server.tool(
    "inject",
    "Triggers an inject node in the Node-RED instance by its ID. This tool simulates an input event for the specified inject node.",
    { id: z.string().describe("Inject node ID") },
    async ({ id }) => {
      await callNodeRed("post", "/inject/" + id, null, config);
      return {
        content: [{ type: "text", text: `Inject node ${id} triggered` }],
      };
    }
  );

  function extractSingleNode(moduleName, nodeHtml) {
    // 1. Extract node name from registerType('mcp-in', ...)
    const nameMatch = nodeHtml.match(/registerType\s*\(\s*['"](.+?)['"]/);
    const name = nameMatch ? nameMatch[1] : "";

    // 2. Extract help document from data-help-name script
    const helpMatch = nodeHtml.match(
      /<script[^>]+data-help-name=["'][^"']+["'][^>]*>([\s\S]*?)<\/script>/
    );
    const help = helpMatch ? helpMatch[1].trim() : "";

    return { name, help, module: moduleName };
  }
  // Get list of installed nodes
  server.tool(
    "get-nodes",
    "Retrieves a list of all installed node (name,help,module) in the Node-RED instance.",
    {},
    async () => {
      // 1. Get JSON data
      const htmlString = await callNodeRed("get", "/nodes", null, config);

      // 2. Regular expression matches all nodes
      const nodePattern =
        /<!-- --- \[red-module:([^\]]+)\] --- -->([\s\S]*?)(?=<!-- --- \[red-module:|$)/g;
      const result = [];

      let match;
      while ((match = nodePattern.exec(htmlString)) !== null) {
        const moduleName = match[1]; // node-red-contrib-mcp-protocol/mcp-in
        const nodeHtml = match[2]; // The HTML content of the entire node

        // 3. Extract single node information
        const nodeInfo = extractSingleNode(moduleName, nodeHtml);

        if (nodeInfo.name) {
          result.push(nodeInfo);
        }
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Get information about a specific module
  server.tool(
    "get-node-info",
    "Retrieves detailed information about a specific node module by its name. This tool returns the configuration and properties of the specified node module.",
    { module: z.string().describe("Node module name") },
    async ({ module }) => {
      const info = await callNodeRed("get", "/nodes/" + module, null, config);
      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      };
    }
  );

  // Enable/disable node module
  server.tool(
    "toggle-node-module",
    "Enables or disables a specific node module in the Node-RED instance. This tool accepts a module name and a boolean flag to enable or disable the module.",
    {
      module: z.string().describe("Node module name"),
      enabled: z.boolean().describe("true to enable, false to disable"),
    },
    async ({ module, enabled }) => {
      try {
        await callNodeRed("put", "/nodes/" + module, { enabled }, config);
        return {
          content: [
            {
              type: "text",
              text: `Module ${module} ${enabled ? "enabled" : "disabled"}`,
            },
          ],
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Find nodes by type
  server.tool(
    "find-nodes-by-type",
    "Searches for nodes in the Node-RED instance by their type. This tool returns a list of nodes matching the specified type.",
    { nodeType: z.string().describe("Node type to search for") },
    async ({ nodeType }) => {
      const flows = await callNodeRed("get", "/flows", null, config);
      const nodes = flows.filter((node) => node.type === nodeType);

      return {
        content: [
          {
            type: "text",
            text:
              nodes.length > 0
                ? `Found ${
                    nodes.length
                  } nodes of type "${nodeType}":\n\n${JSON.stringify(
                    nodes,
                    null,
                    2
                  )}`
                : `No nodes of type "${nodeType}" found`,
          },
        ],
      };
    }
  );

  // Search nodes by name/properties
  server.tool(
    "search-nodes",
    "Searches for nodes in the Node-RED instance by a query string, optionally filtering by a specific property. This tool returns a list of nodes matching the search criteria.",
    {
      query: z.string().describe("String to search in node name or properties"),
      property: z
        .string()
        .optional()
        .describe("Specific property to search (optional)"),
    },
    async ({ query, property }) => {
      const flows = await callNodeRed("get", "/flows", null, config);

      const nodes = flows.filter((node) => {
        if (property) {
          return node[property] && String(node[property]).includes(query);
        } else {
          return JSON.stringify(node).includes(query);
        }
      });

      return {
        content: [
          {
            type: "text",
            text:
              nodes.length > 0
                ? `Found ${
                    nodes.length
                  } nodes matching query "${query}":\n\n${JSON.stringify(
                    nodes,
                    null,
                    2
                  )}`
                : `No nodes found matching query "${query}"`,
          },
        ],
      };
    }
  );
}
