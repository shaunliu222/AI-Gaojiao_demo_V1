import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { knowledgeSearchTool } from './tools/knowledge-search.js';
import { academicQueryTool } from './tools/academic-query.js';
import { resourceSearchTool } from './tools/resource-search.js';

const tools = [knowledgeSearchTool, academicQueryTool, resourceSearchTool];

const server = new Server(
  { name: 'edu-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.name === request.params.name);
  if (!tool) {
    return { content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }], isError: true };
  }

  try {
    const result = await tool.execute(request.params.arguments as any);
    return result;
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Tool error: ${error.message}` }], isError: true };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Education MCP Server running on stdio');
  console.error(`Tools: ${tools.map(t => t.name).join(', ')}`);
}

main().catch(console.error);
