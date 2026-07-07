#!/usr/bin/env bun
/**
 * Droid Rebuild — Main Entry Point (src/)
 * 
 * Called by cli.ts or directly:
 *   bun run src/index.ts worker   — JSON-RPC worker
 *   bun run cli.ts                 — CLI mode (preferred)
 */
const mode = process.argv[2];

if (mode === 'worker') {
  const { runWorker } = await import('./worker/index.js');
  await runWorker();
}
