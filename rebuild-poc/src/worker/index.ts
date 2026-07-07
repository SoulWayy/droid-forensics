/**
 * Worker Process — LLM streaming + tool execution
 *
 * Communicates with the TUI parent over JSON-RPC (stdin/stdout).
 * No rate limit spam, exponential backoff on errors.
 *
 * Hardened boundaries (render-death-spiral POC):
 *  - Every inbound request is validated through shared zod/v4 schemas
 *    (src/rpc/schema.ts) before dispatch — no `any` reaches tool code.
 *  - An `rpc("cancel", { targetId })` method aborts the in-flight LLM stream
 *    end-to-end via an AbortController, so a runaway render/stream can be
 *    stopped from the parent.
 */
import { streamLlm } from '../llm/client.js';
import type { LlmConfig } from '../llm/client.js';
import {
  RpcRequestSchema,
  PromptParamsSchema,
  CancelParamsSchema,
  safeParse,
} from '../rpc/schema.js';

export interface RpcRequest {
  id: string;
  method: string;
  params: unknown;
}

/**
 * Worker entry point. Reads JSON-RPC from stdin, writes to stdout.
 */
export async function runWorker() {
  process.stdin.setEncoding('utf-8');
  let buffer = '';

  for await (const chunk of process.stdin) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parsed = safeParse(RpcRequestSchema, trimmed);
      if (!parsed.ok) {
        sendError('parse-error', `invalid request envelope: ${parsed.error}`);
        continue;
      }

      let request: RpcRequest;
      try {
        request = {
          id: parsed.data.id,
          method: parsed.data.method,
          params: parsed.data.params,
        };
      } catch (err) {
        sendError('parse-error', (err as Error).message);
        continue;
      }
      await handleRequest(request);
    }
  }
}

// Tracks the AbortController for the currently-streaming prompt so the parent
// can cancel it via rpc("cancel", ...).
const activeStreams = new Map<string, AbortController>();

async function handleRequest(request: RpcRequest) {
  switch (request.method) {
    case 'prompt': {
      const v = safeParse(PromptParamsSchema, request.params);
      if (!v.ok) {
        sendError(request.id, `invalid prompt params: ${v.error}`);
        return;
      }
      await handlePrompt(request.id, v.data.messages);
      break;
    }
    case 'cancel': {
      const v = safeParse(CancelParamsSchema, request.params);
      if (!v.ok) {
        sendResult(request.id, { cancelled: false, reason: `invalid cancel params: ${v.error}` });
        return;
      }
      const ctrl = activeStreams.get(v.data.targetId);
      if (ctrl) {
        ctrl.abort();
        activeStreams.delete(v.data.targetId);
        sendResult(request.id, { cancelled: true, targetId: v.data.targetId });
      } else {
        sendResult(request.id, { cancelled: false, reason: 'no active stream for targetId' });
      }
      break;
    }
    case 'ping':
      sendResult(request.id, { pong: true });
      break;
    default:
      sendError(request.id, `Unknown method: ${request.method}`);
  }
}

async function handlePrompt(
  id: string,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
) {
  const controller = new AbortController();
  activeStreams.set(id, controller);

  const config: Partial<LlmConfig> = {
    model: process.env.DROID_LLM_MODEL || process.env.LLM_MODEL || 'deepseek-v4-flash-free',
    signal: controller.signal,
  };

  sendNotification('thinking', 'Starting LLM stream...');

  try {
    for await (const chunk of streamLlm(messages, config)) {
      if (controller.signal.aborted) break;
      switch (chunk.type) {
        case 'thinking':
          sendNotification('thinking_delta', chunk.content);
          break;
        case 'text':
          sendNotification('text_delta', chunk.content);
          break;
        case 'error':
          sendError(id, chunk.content);
          return;
        case 'done':
          sendResult(id, { done: true });
          return;
      }
    }
    sendResult(id, { done: true });
  } catch (err) {
    if (controller.signal.aborted) {
      sendResult(id, { done: true, aborted: true });
    } else {
      sendError(id, (err as Error).message);
    }
  } finally {
    activeStreams.delete(id);
  }
}

// ── JSON-RPC helpers ──
function sendResult(id: string, result: unknown) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n';
  process.stdout.write(msg);
}

function sendError(id: string, message: string) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { message } }) + '\n';
  process.stdout.write(msg);
}

function sendNotification(method: string, params: unknown) {
  const msg = JSON.stringify({ jsonrpc: '2.0', method: `notification/${method}`, params }) + '\n';
  process.stdout.write(msg);
}
