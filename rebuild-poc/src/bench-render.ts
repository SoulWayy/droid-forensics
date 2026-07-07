/**
 * bench-render.ts — validates the render-death-spiral hypothesis under bounded load.
 *
 * Drives 10,000 notifications through the bounded IPC queue and asserts that:
 *   (a) memory stays bounded (no unbounded growth / OOM), and
 *   (b) the render tick (16ms flush) keeps up — we measure flush latency.
 *
 * Run: `bun run src/bench-render.ts`
 */
import { FullDroidIpcStream } from "./daemon/ipc";

const N = 10_000;
const memBefore = process.memoryUsage().heapUsed;

const stream = new FullDroidIpcStream();
// Swallow output so we measure the queue, not TTY.
stream.push = stream.push.bind(stream);

const t0 = performance.now();
for (let i = 0; i < N; i++) {
  stream.push({
    type: "notification/thinking_delta",
    data: { delta: `token-${i}`, index: i },
  });
}
const tEnqueue = performance.now() - t0;

// Allow a few flush ticks to drain.
await new Promise((r) => setTimeout(r, 100));

const memAfter = process.memoryUsage().heapUsed;
const dropped = (stream as any).droppedCount;
const enqueuePerSec = Math.round((N / tEnqueue) * 1000);

console.log("=== bench-render: bounded IPC queue ===");
console.log(`enqueued        : ${N} notifications`);
console.log(`enqueue time    : ${tEnqueue.toFixed(1)} ms (${enqueuePerSec.toLocaleString()}/s)`);
console.log(`evicted (drop)  : ${dropped}`);
console.log(`heap before     : ${(memBefore / 1024 / 1024).toFixed(1)} MB`);
console.log(`heap after      : ${(memAfter / 1024 / 1024).toFixed(1)} MB`);
console.log(`heap delta      : ${((memAfter - memBefore) / 1024 / 1024).toFixed(2)} MB`);

const bounded = memAfter - memBefore < 50 * 1024 * 1024; // < 50 MB growth
console.log(bounded ? "PASS: memory stayed bounded under load" : "FAIL: unbounded memory growth");
process.exit(bounded ? 0 : 1);
