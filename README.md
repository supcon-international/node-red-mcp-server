[![npm version](https://img.shields.io/npm/v/@supcon-international/node-red-mcp-server.svg)](https://www.npmjs.com/package/@supcon-international/node-red-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@supcon-international/node-red-mcp-server.svg)](https://www.npmjs.com/package/@supcon-international/node-red-mcp-server)
[![GitHub license](https://img.shields.io/github/license/supcon-international/node-red-mcp-server.svg)](https://github.com/supcon-international/node-red-mcp-server/blob/main/LICENSE)

# @supcon-international/node-red-mcp-server

Model Context Protocol (MCP) server for Node-RED — allows language models (like Claude, GPT) to interact with Node-RED through a standardized API.

> This is an enhanced version based on [karavaev-evgeniy/node-red-mcp-server](https://github.com/karavaev-evgeniy/node-red-mcp-server)

## Description

`node-red-mcp-server` Node-RED-MCP-Server for handling complex Node-RED tasks autonomously

### Enhanced Key Features

- Retrieve and update Node-RED flows via MCP
- Multi-version flow backup system with integrity validation
- Add detailed argument descriptions for tools, making it better for LLM usage and handling complicated tasks
- get available nodes information (name,help,module name) instead of raw code
- install new node via llm
- check module and node set module information and manage states
- Manage tabs and individual nodes
- Search for nodes by type or properties
- Access settings and runtime state
- Trigger inject nodes remotely
- Output and visualize flows and stats

## Installation

### Global Installation

```bash
npm install -g @supcon-international/node-red-mcp-server
```

### Local Installation

```bash
npm install @supcon-international/node-red-mcp-server
```

## Usage

### Command Line

```bash
node-red-mcp --url http://localhost:1880 --token YOUR_TOKEN
```

### Configuration via `.env`

Create a `.env` file:

```
NODE_RED_URL=http://localhost:1880
NODE_RED_TOKEN=YOUR_TOKEN
MCP_BACKUP_PATH=/custom/backup/path
MCP_MAX_BACKUPS=10
```

Then run:

```bash
node-red-mcp
```

### Integration with Claude or Other LLMs

1. Start the MCP server or configure Claude Desktop to start it automatically with the tool configuration below.

2. Configure Claude Desktop:

   - Open Claude Desktop app
   - Go to Settings → Advanced → Tool Configuration
   - Add a new tool configuration:

```json
{
  "node-red": {
    "command": "npx",
    "args": ["@supcon-international/node-red-mcp-server", "--verbose"],
    "env(Optional,if None then use default value)": {
      "NODE_RED_URL": "http://your-node-red-url:1880",
      "NODE_RED_TOKEN": "your-token-if-needed",
      "MCP_BACKUP_PATH": "/custom/backup/path",
      "MCP_MAX_BACKUPS": "10"
    }
  }
}
```

or

```json
{
  "node-red": {
    "command": "node",
    "args": [
      "/path/to/node-red-mcp-server/bin/node-red-mcp-server.mjs",
      "--verbose"
    ],
    "env(Optional,if None then use default value)": {
      "NODE_RED_URL": "http://your-node-red-url:1880",
      "NODE_RED_TOKEN": "your-token-if-needed",
      "MCP_BACKUP_PATH": "/custom/backup/path",
      "MCP_MAX_BACKUPS": "10"
    }
  }
}
```

- Replace `/path/to/node-red-mcp-server` with the actual path to your installation
- Update `NODE_RED_URL` to point to your Node-RED instance
- Set `NODE_RED_TOKEN` if your Node-RED instance requires authentication

3. After configuration, Claude can interact with your Node-RED instance through the MCP tools.

For more information about the Model Context Protocol, visit the [official MCP documentation](https://modelcontextprotocol.io/introduction).

### Programmatic Usage

```javascript
import { createServer } from "node-red-mcp-server";

const server = createServer({
  nodeRedUrl: "http://localhost:1880",
  nodeRedToken: "YOUR_TOKEN",
  verbose: true,
});

await server.start();
```

## Configuration Options

### CLI Parameters

| Parameter       | Short | Description                                     |
| --------------- | ----- | ----------------------------------------------- |
| `--url`         | `-u`  | Node-RED base URL                               |
| `--token`       | `-t`  | API access token                                |
| `--verbose`     | `-v`  | Enable verbose logging                          |
| `--backup-path` |       | Custom backup directory path                    |
| `--max-backups` |       | Maximum number of backups to keep (default: 10) |
| `--help`        | `-h`  | Show help                                       |
| `--version`     | `-V`  | Show version number                             |

### Environment Variables

| Variable          | Description                       |
| ----------------- | --------------------------------- |
| `NODE_RED_URL`    | URL of your Node-RED instance     |
| `NODE_RED_TOKEN`  | API access token                  |
| `MCP_BACKUP_PATH` | Custom backup directory path      |
| `MCP_MAX_BACKUPS` | Maximum number of backups to keep |

## MCP Tools

### Flow Tools

- `get-flows` — Get all flows
- `update-flows` — Update all flows
- `get-flow` — Get a specific flow by ID
- `update-flow` — Update a specific flow by ID
- `list-tabs` — List all tabs (workspaces)
- `create-flow` — Create a new flow tab
- `delete-flow` — Delete a flow tab
- `get-flows-state` — Get deployment state
- `set-flows-state` — Change deployment state
- `get-flows-formatted` — Get human-readable flow list
- `visualize-flows` — Generate graph-like view of flows

### Node Tools

- `inject` — Trigger an inject node
- `get-available-nodes` — List available node summary information (name help-doc module)
- `install-node-module` - install new node module
- `get-node-detailed-info` — Detailed info about a node module
- `get-node-set-detailed-info` - Detailed source code about a node module set
- `toggle-node-module` — Enable/disable a node module
- `toggle-node-module-set` - Enable/disable a node module set
- `find-nodes-by-type` — Locate nodes by type
- `search-nodes` — Find nodes by name or property

### Backup Tools

- `backup-flows` — Create a named backup of current flows with optional reason
- `list-backups` — List all available flow backups with details
- `get-backup-flows` — Get the specific flows content from a backup by name
- `backup-health` — Check backup system health and provide recommendations

### Settings Tools

- `get-settings` — Get Node-RED runtime settings
- `get-diagnostics` — Fetch diagnostics info

### Utility Tools

- `api-help` — Show Node-RED API help

## Requirements

- Node.js v16 or newer
- A running Node-RED instance with HTTP API access

## License

MIT License
Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
