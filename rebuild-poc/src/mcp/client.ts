import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

export class MCPClientWrapper {
  private client: Client;
  private transport: any;

  constructor(private name: string, private version: string = '1.0.0') {
    this.client = new Client(
      { name: this.name, version: this.version },
      { capabilities: {} }
    );
  }

  async connectStdio(command: string, args: string[], env?: Record<string, string>) {
    this.transport = new StdioClientTransport({
      command,
      args,
      env: env || (process.env as any),
    });
    await this.client.connect(this.transport);
  }

  async connectSSE(url: string) {
    this.transport = new SSEClientTransport(new URL(url));
    await this.client.connect(this.transport);
  }

  async discoverTools() {
    return await this.client.request({ method: 'tools/list' }, ListToolsResultSchema);
  }

  async callTool(toolName: string, args: any) {
    // If the special RUBE_SEARCH_TOOLS macro is used, we map it to discoverTools
    if (toolName === 'RUBE_SEARCH_TOOLS') {
      return await this.discoverTools();
    }
    
    return await this.client.request(
      { method: 'tools/call', params: { name: toolName, arguments: args } },
      CallToolResultSchema
    );
  }

  async close() {
    if (this.transport) {
      await this.transport.close();
    }
  }
}
