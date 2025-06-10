/**
 * MCP tools for working with Node-RED settings
 */

import { callNodeRed } from "../utils.mjs";

/**
 * Registers tools for working with settings in the MCP server
 * @param {Object} server - Instance of the MCP server
 * @param {Object} config - Server configuration
 */
export default function registerSettingsTools(server, config) {
  // Retrieve runtime settings
  server.tool(
    "get-settings",
    "Retrieves the runtime settings of the Node-RED instance. This tool returns the current configuration settings of the Node-RED server.",
    {},
    async () => {
      const settings = await callNodeRed("get", "/settings", null, config);
      return {
        content: [{ type: "text", text: JSON.stringify(settings, null, 2) }],
      };
    }
  );

  // Retrieve diagnostics
  server.tool(
    "get-diagnostics",
    "Retrieves diagnostic information from the Node-RED instance. This tool returns detailed runtime diagnostics, including system status and performance metrics.",
    {},
    async () => {
      const diagnostics = await callNodeRed(
        "get",
        "/diagnostics",
        null,
        config
      );
      return {
        content: [{ type: "text", text: JSON.stringify(diagnostics, null, 2) }],
      };
    }
  );
}
