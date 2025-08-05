#!/usr/bin/env node

/**
 * Command-line interface for Node-RED MCP server
 */

import { createServer } from "../lib/server.mjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Define __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from package.json
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  nodeRedUrl: process.env.NODE_RED_URL,
  nodeRedToken: process.env.NODE_RED_TOKEN,
  verbose: false,
  backup: {
    backupPath: process.env.MCP_BACKUP_PATH,
    maxBackups: process.env.MCP_MAX_BACKUPS ? parseInt(process.env.MCP_MAX_BACKUPS) : undefined,
  }
};

// Process arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === "--url" || arg === "-u") {
    options.nodeRedUrl = args[++i];
  } else if (arg === "--token" || arg === "-t") {
    options.nodeRedToken = args[++i];
  } else if (arg === "--verbose" || arg === "-v") {
    options.verbose = true;
  } else if (arg === "--backup-path") {
    options.backup.backupPath = args[++i];
  } else if (arg === "--max-backups") {
    options.backup.maxBackups = parseInt(args[++i]);
  } else if (arg === "--help" || arg === "-h") {
    console.log(`
Node-RED MCP Server v${packageJson.version}

Usage: node-red-mcp [options]

Options:
  -u, --url <url>           Node-RED base URL (default: http://localhost:1880)
  -t, --token <token>       API access token
  -v, --verbose             Enable verbose logging
  --backup-path <path>      Custom backup directory path
  --max-backups <number>    Maximum number of backups to keep (default: 10)
  -h, --help               Show this help message
  -V, --version            Show version number

Environment Variables:
  NODE_RED_URL             Node-RED base URL
  NODE_RED_TOKEN           API access token  
  MCP_BACKUP_PATH          Custom backup directory path
  MCP_MAX_BACKUPS          Maximum number of backups to keep
`);
    process.exit(0);
  } else if (arg === "--version" || arg === "-V") {
    console.log(packageJson.version);
    process.exit(0);
  }
}

// Create and start server
async function run() {
  try {
    const server = createServer(options);
    await server.start();
  } catch (error) {
    process.exit(1);
  }
}

// Start
run();
