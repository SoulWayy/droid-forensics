#!/usr/bin/env bun
/**
 * Test: spawn worker as subprocess, send prompt, stream response
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const worker = spawn(process.argv[0], [join(__dirname, 'src/index.ts'), 'worker'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let buffer = '';
  worker.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.method === 'notification/text_delta') {
          process.stdout.write(msg.params);
        } else if (msg.method === 'notification/thinking_delta') {
          process.stdout.write(`\x1b[2m${msg.params}\x1b[0m`);
        } else if (msg.result?.done) {
          process.stdout.write('\n✅ Done\n');
        } else if (msg.error) {
          process.stdout.write(`\n❌ Error: ${msg.error.message}\n`);
        }
      } catch {}
    }
  });

  // Send a prompt
  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'prompt',
    params: {
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Answer in 1-2 sentences.' },
        { role: 'user', content: 'What is 2+2?' },
      ],
    },
  }) + '\n';
  worker.stdin.write(request);
  worker.stdin.end();

  // Wait for worker to finish
  await new Promise<void>((resolve) => worker.on('exit', () => resolve()));
}

main().catch(console.error);
