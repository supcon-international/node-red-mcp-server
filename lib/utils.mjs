/**
 * Utility tools for the Node-RED MCP server
 */

import axios from "axios";

/**
 * Call the Node-RED API
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} path - API path
 * @param {Object|null} data - Data to send (optional)
 * @param {Object} config - Connection configuration
 * @returns {Promise<any>} Result of the API call
 */
export async function callNodeRed(method, path, data = null, config) {
  const url = config.nodeRedUrl + path;
  const headers = config.nodeRedToken
    ? { Authorization: "Bearer " + config.nodeRedToken }
    : {};
  if (["post", "put"].includes(method.toLowerCase())) {
    headers["Content-Type"] = "application/json";
  }
  try {
    const response = await axios({ method, url, headers, data });
    return response.data;
  } catch (error) {
    const message = error.response?.data || error.message;
    throw new Error(`Node-RED API error: ${message}`);
  }
}

/**
 * Format output of Node-RED flows
 * @param {Array} flows - Array of Node-RED flows
 * @returns {Object} Formatted data with statistics
 */
export function formatFlowsOutput(flows) {
  // Grouping by type
  const result = {
    tabs: flows.filter((n) => n.type === "tab"),
    nodes: flows.filter((n) => n.type !== "tab" && n.type !== "subflow"),
    subflows: flows.filter((n) => n.type === "subflow"),
  };

  // Statistics
  const stats = {
    tabCount: result.tabs.length,
    nodeCount: result.nodes.length,
    subflowCount: result.subflows.length,
    nodeTypes: {},
  };

  result.nodes.forEach((node) => {
    if (!stats.nodeTypes[node.type]) stats.nodeTypes[node.type] = 0;
    stats.nodeTypes[node.type]++;
  });

  return {
    summary: `Node-RED project: ${stats.tabCount} tabs, ${stats.nodeCount} nodes, ${stats.subflowCount} subflows`,
    statistics: stats,
    data: result,
  };
}
