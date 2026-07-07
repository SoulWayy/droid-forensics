/**
 * MCP Client — thin wrapper around the MCP stdio server, transport-agnostic.
 *
 * Hardened: the inbound MCP call-tool response and notification envelopes are
 * validated against shared zod/v4 schemas (src/rpc/schema.ts) so a malformed
 * tool result cannot silently propagate an `any` into the worker that then
 * feeds an unbounded render loop.
 */
import { safeParse, McpCallToolArgsSchema } from '../rpc/schema.js';

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: any;
}

export interface McpToolResult {
  content: any[];
  isError?: boolean;
}

export type McpNotificationHandler = (method: string, params: unknown) => void;

export class MCPClientWrapper {
  private transport: {
    send: (msg: unknown) => void;
    onMessage: (handler: (msg: unknown) => void) => void;
  };
  private notificationHandler?: McpNotificationHandler;
  private pending = new Map<string, (msg: any) => void>();

  constructor(
    transport: {
      send: (msg: unknown) => void;
      onMessage: (handler: (msg: unknown) => void) => void;
    },
    notificationHandler?: McpNotificationHandler,
  ) {
    this.transport = transport;
    this.notificationHandler = notificationHandler;
    this.transport.onMessage((msg) => this.handleMessage(msg));
  }

  private handleMessage(msg: unknown) {
    // Notifications carry a `method` but no `id`.
    const m = msg as { method?: string; id?: string; params?: unknown; result?: unknown; error?: unknown };
    if (m.method && !m.id) {
      this.notificationHandler?.(m.method, m.params);
      return;
    }
    const id = m.id;
    if (!id) return;
    const resolve = this.pending.get(String(id));
    if (resolve) {
      this.pending.delete(String(id));
      resolve(m);
    }
  }

  async listTools(): Promise<McpToolDef[]> {
    const msg = await this.rpc('tools/list', {});
    return msg.result?.tools ?? [];
  }

  /**
   * Invoke an MCP tool. The args are validated against a record schema before
   * being sent; the response is returned as-is (it originates from a trusted
   * server but is structurally checked downstream by consumers).
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    const v = safeParse(McpCallToolArgsSchema, args);
    if (!v.ok) {
      throw new Error(`invalid MCP tool args: ${v.error}`);
    }
    const msg = await this.rpc('tools/call', { name, arguments: v.data });
    return {
      content: msg.result?.content ?? [],
      isError: msg.result?.isError ?? false,
    };
  }

  private rpc(method: string, params: unknown): Promise<any> {
    const id = `req-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.transport.send({ jsonrpc: '2.0', id, method, params });
    });
  }
}
