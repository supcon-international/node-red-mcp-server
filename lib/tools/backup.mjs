/**
 * MCP tools for Node-RED flows backup and restore functionality
 * Uses Node-RED API for universal compatibility (local/remote)
 */

import { z } from "zod";
import { callNodeRed } from "../utils.mjs";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";

// Configuration defaults
const DEFAULTS = {
  maxBackups: 10,
  autoCleanup: true,
  backupDir: ".mcp-backups",
  metadataFile: "backup_metadata.json",
};

/**
 * Registers backup-related tools in the MCP server
 * @param {Object} server - MCP server instance
 * @param {Object} config - Server configuration
 */
export default function registerBackupTools(server, config) {
  // Backup flows tool
  server.tool(
    "backup-flows",
    "Create a named backup of current Node-RED flows with optional reason",
    {
      name: z
        .string()
        .optional()
        .describe(
          "Backup name/label (optional, auto-generated if not provided)"
        ),
      reason: z
        .string()
        .optional()
        .describe("Optional reason/description for creating this backup"),
    },
    async ({ name, reason }) => {
      try {
        const metadata = await createBackup(name, reason, config);
        return {
          content: [
            {
              type: "text",
              text: `Backup created successfully!\n\nName: ${
                metadata.name
              }\nTimestamp: ${metadata.timestamp}\nReason: ${
                metadata.reason
              }\nFlows: ${metadata.flowsCount} tabs, ${
                metadata.nodesCount
              } nodes\nSize: ${Math.round(metadata.size / 1024)}KB`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Backup failed: ${error.message}`,
            },
          ],
        };
      }
    }
  );


  // List backups tool
  server.tool(
    "list-backups",
    "List all available flow backups with details",
    {
      detailed: z
        .boolean()
        .optional()
        .describe("Show detailed backup information"),
    },
    async ({ detailed }) => {
      try {
        const backups = await listBackups(detailed, config);

        if (backups.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No backups found. Create your first backup with backup-flows.",
              },
            ],
          };
        }

        let output = `Found ${backups.length} backup(s):\n\n`;

        backups.forEach((backup, index) => {
          const activeMarker = backup.isLatest ? " [LATEST]" : "";
          output += `${index + 1}. ${backup.name}${activeMarker}\n`;
          output += `   Created: ${new Date(
            backup.timestamp
          ).toLocaleString()}\n`;
          output += `   Reason: ${backup.reason}\n`;

          if (detailed) {
            output += `   Flows: ${backup.flowsCount} tabs, ${backup.nodesCount} nodes\n`;
            output += `   Size: ${Math.round(backup.size / 1024)}KB\n`;
          }
          output += "\n";
        });

        return {
          content: [{ type: "text", text: output.trim() }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to list backups: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // Get backup flows tool
  server.tool(
    "get-backup-flows",
    "Get the specific flows content from a backup by name",
    {
      name: z
        .string()
        .describe("Backup name to retrieve flows from (required)"),
    },
    async ({ name }) => {
      try {
        const backupFlows = await getBackupFlows(name, config);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(backupFlows.flows, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to get backup flows: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // Backup health tool
  server.tool(
    "backup-health",
    "Check backup system health and provide recommendations",
    {},
    async () => {
      try {
        const health = await checkBackupHealth(config);

        let output = `Backup System Health Report\n\n`;
        output += `Overall Status: ${
          health.healthy ? "✅ HEALTHY" : "❌ ISSUES DETECTED"
        }\n`;
        output += `Total Backups: ${health.count}\n`;
        output += `Total Size: ${Math.round(health.totalSize / 1024)}KB\n`;

        if (health.latestAge !== null) {
          output += `Latest Backup: ${health.latestAge}m ago\n`;
        }

        output += `Storage Location: ${health.location}\n`;

        if (health.issues.length > 0) {
          output += `\n📋 Issues & Recommendations:\n`;
          health.issues.forEach((issue, index) => {
            output += `${index + 1}. ${issue}\n`;
          });
        }

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Health check failed: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}

/**
 * Get Node-RED directory and backup paths
 */
function getPaths(config) {
  const nodeRedDir =
    process.env.NODE_RED_USER_DIR ||
    config.nodeRedDir ||
    path.join(os.homedir(), ".node-red");

  const backupPath = config.backup?.backupPath || nodeRedDir;
  const backupDir = path.join(backupPath, DEFAULTS.backupDir);
  const flowsPath = path.join(nodeRedDir, "flows.json");
  const metadataPath = path.join(backupDir, DEFAULTS.metadataFile);

  return { nodeRedDir, backupDir, flowsPath, metadataPath };
}

/**
 * Ensure backup directory exists and initialize metadata
 */
async function ensureBackupDirectory(config) {
  const { backupDir, metadataPath } = getPaths(config);

  await fs.mkdir(backupDir, { recursive: true });

  try {
    await fs.access(metadataPath);
  } catch {
    const initialMetadata = {
      version: "1.0",
      config: {
        maxBackups: config.backup?.maxBackups || DEFAULTS.maxBackups,
        autoCleanup: config.backup?.autoCleanup ?? DEFAULTS.autoCleanup,
      },
      backups: [],
    };
    await fs.writeFile(metadataPath, JSON.stringify(initialMetadata, null, 2));
  }
}

/**
 * Generate backup name and validate
 */
function createBackupName(name, timestamp) {
  if (name) {
    if (!/^[a-zA-Z0-9_\-]{1,50}$/.test(name)) {
      throw new Error(
        "Backup name must be 1-50 characters, letters/numbers/underscores/hyphens only"
      );
    }
    if (["latest", "current", "temp", "backup"].includes(name.toLowerCase())) {
      throw new Error(`'${name}' is a reserved name`);
    }
    return name;
  }
  return `backup_${timestamp
    .replace(/[-:.]/g, "")
    .replace("T", "_")
    .substring(0, 15)}`;
}

/**
 * Calculate checksum and flow statistics
 */
function analyzeFlows(flows) {
  if (!Array.isArray(flows)) {
    throw new Error("flows.json does not contain a valid flows array");
  }

  return {
    checksum: crypto
      .createHash("sha256")
      .update(JSON.stringify(flows))
      .digest("hex"),
    flowsCount: flows.filter((f) => f.type === "tab").length,
    nodesCount: flows.filter(
      (f) => f.type && f.type !== "tab" && f.type !== "subflow"
    ).length,
    size: JSON.stringify(flows).length,
  };
}

/**
 * Create a new backup
 */
async function createBackup(name, reason, config) {
  await ensureBackupDirectory(config);
  const { backupDir, metadataPath } = getPaths(config);

  // Get current flows from Node-RED API
  const flows = await callNodeRed("get", "/flows", null, config);
  const timestamp = new Date().toISOString();
  const backupName = createBackupName(name, timestamp);
  const analysis = analyzeFlows(flows);

  // Check for duplicate names
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  if (metadata.backups.some((b) => b.name === backupName)) {
    throw new Error(`Backup '${backupName}' already exists`);
  }

  // Create backup data
  const backupData = {
    metadata: {
      name: backupName,
      timestamp,
      reason: reason || "Manual backup",
      checksum: analysis.checksum,
      flowsCount: analysis.flowsCount,
      nodesCount: analysis.nodesCount,
      size: analysis.size,
    },
    flows,
  };

  // Save backup file
  const backupFile = path.join(backupDir, `${backupName}.json`);
  await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));

  // Update metadata
  metadata.backups.push({
    ...backupData.metadata,
    filename: `${backupName}.json`,
  });

  // Auto cleanup
  if (
    metadata.config.autoCleanup &&
    metadata.backups.length > metadata.config.maxBackups
  ) {
    const sortedBackups = metadata.backups.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    const toDelete = sortedBackups.slice(metadata.config.maxBackups);

    for (const backup of toDelete) {
      try {
        await fs.unlink(path.join(backupDir, backup.filename));
      } catch {}
    }

    metadata.backups = sortedBackups.slice(0, metadata.config.maxBackups);
  }

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  return backupData.metadata;
}


/**
 * Get flows from a specific backup
 */
async function getBackupFlows(backupName, config) {
  await ensureBackupDirectory(config);
  const { backupDir } = getPaths(config);

  const backupFile = path.join(backupDir, `${backupName}.json`);
  try {
    const backupData = JSON.parse(await fs.readFile(backupFile, "utf8"));
    
    // Validate backup integrity
    const currentChecksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(backupData.flows))
      .digest("hex");
    
    if (currentChecksum !== backupData.metadata.checksum) {
      throw new Error("Backup file is corrupted: checksum mismatch");
    }

    return {
      metadata: backupData.metadata,
      flows: backupData.flows,
    };
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`Backup '${backupName}' not found`);
    }
    throw err;
  }
}

/**
 * List all available backups
 */
async function listBackups(detailed, config) {
  await ensureBackupDirectory(config);
  const { metadataPath } = getPaths(config);

  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  const sortedBackups = metadata.backups.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return sortedBackups.map((backup, index) => ({
    name: backup.name,
    timestamp: backup.timestamp,
    reason: backup.reason,
    isLatest: index === 0,
    ...(detailed && {
      flowsCount: backup.flowsCount,
      nodesCount: backup.nodesCount,
      size: backup.size,
    }),
  }));
}

/**
 * Check backup system health
 */
async function checkBackupHealth(config) {
  await ensureBackupDirectory(config);
  const { backupDir, metadataPath } = getPaths(config);

  const health = {
    healthy: true,
    count: 0,
    totalSize: 0,
    latestAge: null,
    location: backupDir,
    issues: [],
  };

  try {
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    health.count = metadata.backups.length;

    if (health.count === 0) {
      health.healthy = false;
      health.issues.push(
        "No backups found. Create your first backup immediately"
      );
      return health;
    }

    // Check backup files and calculate size
    let corruptedCount = 0;
    for (const backup of metadata.backups) {
      try {
        const backupFile = path.join(backupDir, backup.filename);
        const stats = await fs.stat(backupFile);
        health.totalSize += stats.size;

        // Quick integrity check
        const backupData = JSON.parse(await fs.readFile(backupFile, "utf8"));
        const checksum = crypto
          .createHash("sha256")
          .update(JSON.stringify(backupData.flows))
          .digest("hex");

        if (checksum !== backup.checksum) {
          corruptedCount++;
        }
      } catch {
        corruptedCount++;
      }
    }

    // Find latest backup age
    const latestBackup = metadata.backups.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )[0];
    if (latestBackup) {
      health.latestAge = Math.round(
        (Date.now() - new Date(latestBackup.timestamp).getTime()) / (1000 * 60)
      );
    }

    // Generate issues/recommendations
    if (corruptedCount > 0) {
      health.healthy = false;
      health.issues.push(`Found ${corruptedCount} corrupted backup(s)`);
    }

    if (health.latestAge && health.latestAge > 24) {
      health.issues.push(
        "Latest backup is over 24 hours old. Consider creating a new backup"
      );
    }

    if (health.count >= metadata.config.maxBackups * 0.9) {
      health.issues.push(
        `Backup count approaching limit (${health.count}/${metadata.config.maxBackups})`
      );
    }

    if (health.totalSize > 100 * 1024 * 1024) {
      // 100MB
      health.issues.push(
        "Backup files are using significant disk space. Consider cleanup"
      );
    }
  } catch (error) {
    health.healthy = false;
    health.issues.push(
      "Backup system initialization failed, check path permissions"
    );
  }

  return health;
}
