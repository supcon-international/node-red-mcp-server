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
    "get-available-nodes",
    "Retrieves a list of all installed nodes their information (name,help,module) in the Node-RED instance.",
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
    "get-node-detailed-info",
    "Retrieves source code about a specific node module by its name. Args: module (e.g.'node-red/inject')",
    { module: z.string().describe("Node module name") },
    async ({ module }) => {
      const info = await callNodeRed("get", "/nodes/" + module, null, config);
      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      };
    }
  );
  // Get  source code about a node module set
  server.tool(
    "get-node-set-detailed-info",
    "Retrieves source code about a specific node module by its name. Args: module (e.g.'@supcon-international/node-red-function-gpt-with-memory') set (e.g.'function-gpt')",
    {
      module: z.string().describe("Node module name"),
      set: z.string().describe("Node module set name"),
    },
    async ({ module, set }) => {
      const info = await callNodeRed(
        "get",
        "/nodes/" + module + "/" + set,
        null,
        config
      );
      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      };
    }
  );
  // Install node module
  server.tool(
    "install-node-module",
    "Install a specific node module in the Node-RED instance. Args: module (e.g.'node-red-dashboard')",
    { module: z.string().describe("Node module name") },
    async ({ module }) => {
      const info = await callNodeRed("post", "/nodes", { module }, config);
      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      };
    }
  );

  // Enable/disable node module
  server.tool(
    "toggle-node-module",
    "Enables or disables a specific node module in the Node-RED instance. Args: module (e.g.'node-red/inject') enabled (e.g.'true')",
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
  // Enable/disable node module set
  server.tool(
    "toggle-node-module-set",
    "Enables or disables a specific node module set in the Node-RED instance. Args: module (e.g.'@supcon-international/node-red-function-gpt-with-memory') set (e.g.'function-gpt') enabled (e.g.'true')",
    {
      module: z.string().describe("Node module name"),
      set: z.string().describe("Node module set name"),
      enabled: z.boolean().describe("true to enable, false to disable"),
    },
    async ({ module, set, enabled }) => {
      try {
        await callNodeRed(
          "put",
          "/nodes/" + module + "/" + set,
          { enabled },
          config
        );
        return {
          content: [
            {
              type: "text",
              text: `Module ${module} set ${set} ${
                enabled ? "enabled" : "disabled"
              }`,
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
    "Searches for nodes in the Node-RED instance by their type. Args: nodeType (e.g.'inject')",
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
    "Searches for nodes in the Node-RED instance by a query string, optionally filtering by a specific property. Args: query (e.g.'inject') property (e.g.'type') (optional)",
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
