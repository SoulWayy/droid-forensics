#!/usr/bin/env bun
/**
 * Full rebuild entry — same as `bun run src/index.ts tui`
 */
import { startTui } from './src/tui/index.js';
await startTui();
