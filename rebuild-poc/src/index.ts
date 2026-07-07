#!/usr/bin/env bun
/**
 * Droid Rebuild — Main Entry Point
 * 
 * Modes:
 *   tui       — Start the Ink/React TUI (parent process)
 *   worker    — Spawned by tui, handles LLM + tools
 *   (no args) — Starts TUI, spawns worker internally
 */
import { spawn } from 'child_process';

const mode = process.argv[2];

if (mode === 'worker') {
  // Worker mode: reads JSON-RPC from stdin, writes to stdout
  import('./worker/index.js').then(m => m.runWorker());
} else if (mode === 'tui' || !mode) {
  // TUI mode: spawn worker as child process, run Ink TUI
  const { startTui } = await import('./tui/index.js');
  await startTui();
}
