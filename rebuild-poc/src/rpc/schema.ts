/**
 * RPC Schema Layer — shared zod/v4 validation for the JSON-RPC boundary.
 *
 * Droid communicates over stdin/stdout JSON-RPC between the TUI (parent) and
 * the worker (child). Every message crossing that boundary is a *trust
 * boundary*: the worker must never blindly `JSON.parse` + `any` its way to a
 * tool call, because malformed params are exactly how a runaway render loop
 * or an out-of-memory death-spiral starts. These schemas make the shapes
 * explicit and validated at the edge.
 *
 * Built on the project's canonical `zod/v4` import (see src/tools/*).
 */
import { z } from 'zod/v4';

// ── Primitives ──
const Role = z.enum(['user', 'assistant', 'system']);
const Message = z.object({
  role: Role,
  content: z.string(),
});

// ── Request envelope (transport-agnostic) ──
export const RpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0').optional(),
  id: z.string(),
  method: z.string(),
  params: z.unknown().optional(),
});
export type RpcRequest = z.infer<typeof RpcRequestSchema>;

// ── Method-specific params (validated after dispatch) ──
export const PromptParamsSchema = z.object({
  messages: z.array(Message).min(1, 'prompt requires at least one message'),
  model: z.string().optional(),
});
export type PromptParams = z.infer<typeof PromptParamsSchema>;

export const PingParamsSchema = z.object({});
export type PingParams = z.infer<typeof PingParamsSchema>;

export const CancelParamsSchema = z.object({
  /** id of the in-flight request to abort */
  targetId: z.string(),
});
export type CancelParams = z.infer<typeof CancelParamsSchema>;

// ── Result envelope ──
export const RpcResultSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.unknown(),
});
export type RpcResult = z.infer<typeof RpcResultSchema>;

// ── Error envelope ──
export const RpcErrorSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string().or(z.null()),
  error: z.object({
    code: z.number().optional(),
    message: z.string(),
  }),
});
export type RpcError = z.infer<typeof RpcErrorSchema>;

// ── Notification envelope ──
export const RpcNotificationSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string().startsWith('notification/'),
  params: z.unknown().optional(),
});
export type RpcNotification = z.infer<typeof RpcNotificationSchema>;

// ── Well-known notification param shapes (validated by consumers) ──
export const ThinkingDeltaParamsSchema = z.string();
export const TextDeltaParamsSchema = z.string();
export const ToolProgressParamsSchema = z.object({
  tool: z.string(),
  status: z.string(),
});
export const SystemAlertParamsSchema = z.object({
  message: z.string(),
  code: z.number().optional(),
});

// ── MCP call-tool args (already schema'd upstream, kept explicit here) ──
export const McpCallToolArgsSchema = z.record(z.string(), z.unknown());
export type McpCallToolArgs = z.infer<typeof McpCallToolArgsSchema>;

/**
 * Validate a raw JSON value against a schema, returning either the typed
 * value or a structured error. Callers use this at the IPC boundary.
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  value: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}
