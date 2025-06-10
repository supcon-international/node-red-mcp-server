/**
 * MCP tools for working with Node-RED flows
 */

import { z } from "zod";
import { callNodeRed, formatFlowsOutput } from "../utils.mjs";

/**
 * Registers flow-related tools in the MCP server
 * @param {Object} server - MCP server instance
 * @param {Object} config - Server configuration
 */
export default function registerFlowTools(server, config) {
  // Get all flows
  server.tool(
    "get-flows",
    "Retrieves the complete list of flows from the Node-RED instance. This tool returns the full JSON configuration of all flows, including tabs, nodes, and subflows.",
    {},
    async () => {
      const flows = await callNodeRed("get", "/flows", null, config);
      return {
        content: [{ type: "text", text: JSON.stringify(flows, null, 2) }],
      };
    }
  );

  // Update flows
  server.tool(
    "update-flows",
    "Updates the entire flow configuration of the Node-RED instance. This tool accepts a JSON string representing the new flow configuration and applies it to the Node-RED instance.",
    { flowsJson: z.string().describe("Flow configuration in JSON") },
    async ({ flowsJson }) => {
      try {
        const flowsObj = JSON.parse(flowsJson);
        await callNodeRed("post", "/flows", flowsObj, config);
        return { content: [{ type: "text", text: "Flows updated" }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Get flow by ID
  server.tool(
    "get-flow",
    "Retrieves the configuration of a specific flow by its ID. This tool returns the JSON configuration of the specified flow, including all its nodes and properties.",
    { id: z.string().describe("Flow ID") },
    async ({ id }) => {
      const flow = await callNodeRed("get", "/flow/" + id, null, config);
      return {
        content: [{ type: "text", text: JSON.stringify(flow, null, 2) }],
      };
    }
  );

  // Update flow by ID
  server.tool(
    "update-flow",
    "Updates the configuration of a specific flow by its ID. This tool accepts a JSON string representing the new flow configuration and applies it to the specified flow.",
    {
      id: z.string().describe("Flow ID"),
      flowJson: z.string().describe("Flow configuration in JSON"),
    },
    async ({ id, flowJson }) => {
      try {
        const flowObj = JSON.parse(flowJson);
        await callNodeRed("put", "/flow/" + id, flowObj, config);
        return { content: [{ type: "text", text: `Flow ${id} updated` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // List tabs
  server.tool(
    "list-tabs",
    "Lists all flow tabs (workspaces) in the Node-RED instance. This tool returns the names and IDs of all tabs.",
    {},
    async () => {
      const flows = await callNodeRed("get", "/flows", null, config);
      const tabs = flows
        .filter((node) => node.type === "tab")
        .map(
          (node) => `- ${node.label || node.name || "Unnamed"} (ID: ${node.id})`
        );

      return { content: [{ type: "text", text: tabs.join("\n") }] };
    }
  );

  // Create new flow
  server.tool(
    "create-flow",
    "Creates a new flow in the Node-RED instance. This tool accepts a JSON string representing the new flow configuration and adds it to the Node-RED instance.",
    { flowJson: z.string().describe("New flow configuration in JSON") },
    async ({ flowJson }) => {
      try {
        const flowObj = JSON.parse(flowJson);
        const result = await callNodeRed("post", "/flow", flowObj, config);
        return {
          content: [
            { type: "text", text: `New flow created with ID: ${result.id}` },
          ],
        };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Delete flow
  server.tool(
    "delete-flow",
    "Deletes a specific flow from the Node-RED instance by its ID. This tool permanently removes the flow and all its associated nodes.",
    { id: z.string().describe("Flow ID to delete") },
    async ({ id }) => {
      try {
        await callNodeRed("delete", "/flow/" + id, null, config);
        return { content: [{ type: "text", text: `Flow ${id} deleted` }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Get flows state
  server.tool(
    "get-flows-state",
    "Retrieves the current deployment state of all flows in the Node-RED instance. This tool returns the runtime state of the flows, including their active status.",
    {},
    async () => {
      const state = await callNodeRed("get", "/flows/state", null, config);
      return {
        content: [{ type: "text", text: JSON.stringify(state, null, 2) }],
      };
    }
  );

  // Set flows state
  server.tool(
    "set-flows-state",
    "Updates the deployment state of all flows in the Node-RED instance. This tool accepts a JSON string representing the new state and applies it to the flows.",
    { stateJson: z.string().describe("Flows state in JSON") },
    async ({ stateJson }) => {
      try {
        const stateObj = JSON.parse(stateJson);
        await callNodeRed("post", "/flows/state", stateObj, config);
        return { content: [{ type: "text", text: "Flows state updated" }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );

  // Formatted flows output
  server.tool(
    "get-flows-formatted",
    "Retrieves a human-readable, formatted list of all flows in the Node-RED instance. This tool returns a structured summary of the flows, including statistics and grouping by type.",
    {},
    async () => {
      const flows = await callNodeRed("get", "/flows", null, config);
      const formatted = formatFlowsOutput(flows);

      return {
        content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }],
      };
    }
  );

  // Structured flows output with visualization
  server.tool(
    "visualize-flows",
    "Generates a graph-like visualization of the flows in the Node-RED instance. This tool returns a structured representation of the flows, grouped by tabs and nodes, for easy visualization.",
    {},
    async () => {
      const flows = await callNodeRed("get", "/flows", null, config);

      // Group by tabs
      const tabs = flows.filter((node) => node.type === "tab");
      const nodesByTab = {};

      tabs.forEach((tab) => {
        nodesByTab[tab.id] = flows.filter((node) => node.z === tab.id);
      });

      // Format output into a more convenient structure
      const result = tabs.map((tab) => {
        const nodes = nodesByTab[tab.id];
        const nodeTypes = {};

        nodes.forEach((node) => {
          if (!nodeTypes[node.type]) nodeTypes[node.type] = 0;
          nodeTypes[node.type]++;
        });

        return {
          id: tab.id,
          name: tab.label || tab.name || "Unnamed",
          nodes: nodes.length,
          nodeTypes: Object.entries(nodeTypes)
            .map(([type, count]) => `${type}: ${count}`)
            .join(", "),
        };
      });

      // Format for output
      const output = ["# Node-RED Flow Structure", "", "## Tabs", ""];

      result.forEach((tab) => {
        output.push(`### ${tab.name} (ID: ${tab.id})`);
        output.push(`- Number of nodes: ${tab.nodes}`);
        output.push(`- Node types: ${tab.nodeTypes}`);
        output.push("");
      });

      return { content: [{ type: "text", text: output.join("\n") }] };
    }
  );
}
