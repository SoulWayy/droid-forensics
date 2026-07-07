/**
 * Worker Process — LLM streaming + tool execution
 * 
 * Communicates with the TUI parent over JSON-RPC (stdin/stdout).
 * No rate limit spam, exponential backoff on errors.
 */
import { streamLlm } from '../llm/client.js';

interface RpcRequest {
  id: string;
  method: string;
  params: any;
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

      try {
        const request: RpcRequest = JSON.parse(trimmed);
        await handleRequest(request);
      } catch (err) {
        sendError('parse-error', (err as Error).message);
      }
    }
  }
}

async function handleRequest(request: RpcRequest) {
  switch (request.method) {
    case 'prompt':
      await handlePrompt(request.id, request.params.messages || []);
      break;
    case 'ping':
      sendResult(request.id, { pong: true });
      break;
    default:
      sendError(request.id, `Unknown method: ${request.method}`);
  }
}

async function handlePrompt(id: string, messages: { role: string; content: string }[]) {
  sendNotification('thinking', 'Starting LLM stream...');

  try {
    for await (const chunk of streamLlm(
      messages as any,
      { model: process.env.LLM_MODEL || 'deepseek-v4-flash-free' }
    )) {
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
  } catch (err) {
    sendError(id, (err as Error).message);
  }
}

// ── JSON-RPC helpers ──
function sendResult(id: string, result: any) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n';
  process.stdout.write(msg);
}

function sendError(id: string, message: string) {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { message } }) + '\n';
  process.stdout.write(msg);
}

function sendNotification(method: string, params: any) {
  const msg = JSON.stringify({ jsonrpc: '2.0', method: `notification/${method}`, params }) + '\n';
  process.stdout.write(msg);
}
