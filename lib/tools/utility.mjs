/**
 * MCP Utility Tools for Node-RED
 */

/**
 * Registers utility tools on the MCP server
 * @param {Object} server - Instance of the MCP server
 * @param {Object} config - Server configuration
 */
export default function registerUtilityTools(server, config) {
  // Node-RED API Help
  server.tool(
    "api-help",
    "Displays a help table of all available Node-RED Admin API methods, including their implementation status in the MCP server. This tool provides a quick reference for available API endpoints.",
    {},
    async () => {
      const endpoints = [
        { method: "GET", path: "/flows", description: "Get all flows" },
        { method: "POST", path: "/flows", description: "Update all flows" },
        {
          method: "GET",
          path: "/flow/:id",
          description: "Get a specific flow",
        },
        {
          method: "PUT",
          path: "/flow/:id",
          description: "Update a specific flow",
        },
        {
          method: "DELETE",
          path: "/flow/:id",
          description: "Delete a specific flow",
        },
        { method: "POST", path: "/flow", description: "Create a new flow" },
        {
          method: "GET",
          path: "/flows/state",
          description: "Get the state of flows",
        },
        {
          method: "POST",
          path: "/flows/state",
          description: "Set the state of flows",
        },
        {
          method: "GET",
          path: "/nodes",
          description: "Get list of installed nodes",
        },
        {
          method: "POST",
          path: "/nodes",
          description: "Install a new node module",
        },
        {
          method: "GET",
          path: "/settings",
          description: "Get runtime settings",
        },
        {
          method: "GET",
          path: "/diagnostics",
          description: "Get diagnostics information",
        },
        {
          method: "POST",
          path: "/inject/:id",
          description: "Trigger an inject node",
        },
        {
          method: "GET",
          path: "/nodes/:module",
          description: "Get a node module’s information",
        },
        {
          method: "PUT",
          path: "/nodes/:module",
          description: "Enable/Disable a node module",
        },
        {
          method: "DELETE",
          path: "/nodes/:module",
          description: "Remove a node module",
        },
        {
          method: "GET",
          path: "/nodes/:module/:set",
          description: "Get a node module set information",
        },
        {
          method: "PUT",
          path: "/nodes/:module/:set",
          description: "Enable/Disable a node set",
        },
      ];

      // Check implemented methods
      const implementedMethods = {
        "GET /flows": true,
        "POST /flows": true,
        "GET /flow/:id": true,
        "PUT /flow/:id": true,
        "POST /inject/:id": true,
        "POST /flow": true,
        "DELETE /flow/:id": true,
        "GET /flows/state": true,
        "POST /flows/state": true,
        "GET /nodes": true,
        "GET /settings": true,
        "GET /diagnostics": true,
      };

      const output = [
        "# Node-RED API Help",
        "",
        "| Method | Path | Description | Implemented in MCP |",
        "|--------|------|-------------|---------------------|",
      ];

      endpoints.forEach((endpoint) => {
        const key = `${endpoint.method} ${endpoint.path}`;
        output.push(
          `| ${endpoint.method} | ${endpoint.path} | ${
            endpoint.description
          } | ${implementedMethods[key] ? "✅" : "❌"} |`
        );
      });

      return { content: [{ type: "text", text: output.join("\n") }] };
    }
  );
}
