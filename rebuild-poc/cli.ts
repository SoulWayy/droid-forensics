#!/usr/bin/env bun
/**
 * Droid Rebuild — Root Entry Point
 * 
 * Usage: bun run src/index.ts [mode]
 *        bun run cli.ts [mode] (alias)
 */
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] || 'cli';

if (mode === 'worker') {
  const { runWorker } = await import('./src/worker/index.js');
  await runWorker();
  process.exit(0);
}

if (mode === 'exec') {
  let prompt = process.argv.slice(3).join(' ');
  if (!prompt) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    prompt = Buffer.concat(chunks).toString('utf-8').trim();
  }
  if (!prompt) { console.error('Usage: bun run cli.ts exec "your prompt"'); process.exit(1); }
  await runPrompt(prompt, true);
  process.exit(0);
}

if (mode === 'tui') {
  const { startTui } = await import('./src/tui/index.js');
  await startTui();
  process.exit(0);
}

// ── CLI mode (default) ──
if (mode === 'cli') {
  console.log('Droid Rebuild — Interactive CLI (type "exit" to quit)\n');
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) { rl.prompt(); continue; }
    if (trimmed === 'exit' || trimmed === 'quit') break;
    await runPrompt(trimmed, true);
    console.log();
    rl.prompt();
  }
  rl.close();
  process.exit(0);
}

// ── Core: spawn worker, send prompt, stream response ──
async function runPrompt(prompt: string, stream: boolean) {
  const workerPath = join(__dirname, 'src/index.ts');
  const worker = spawn(process.argv[0] || 'bun', [workerPath, 'worker'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: __dirname,
    env: { ...process.env, LLM_API_KEY: process.env.LLM_API_KEY || '' },
  });

  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'prompt',
    params: {
      messages: [
        { role: 'system', content: 'You are Droid, a helpful coding assistant. Answer concisely.' },
        { role: 'user', content: prompt },
      ],
    },
  }) + '\n';

  worker.stdin.write(request);
  worker.stdin.end();

  for await (const chunk of worker.stdout) {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.method === 'notification/text_delta') {
          if (stream) process.stdout.write(msg.params);
        } else if (msg.method === 'notification/thinking_delta') {
          if (stream) process.stdout.write(`\x1b[2m${msg.params}\x1b[0m`);
        } else if (msg.error) {
          console.error('\nError:', msg.error.message);
        }
      } catch {}
    }
  }
  await new Promise<void>(r => worker.on('exit', () => r()));
}
