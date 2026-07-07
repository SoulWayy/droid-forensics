import { expect, test } from "bun:test";
import { FullDroidIpcStream } from "./daemon/ipc";

test("bounded queue never grows unboundedly under a 429-style notification storm", async () => {
  const stream = new FullDroidIpcStream();
  const memBefore = process.memoryUsage().heapUsed;

  // Simulate the retry-notification spam loop the report describes.
  const N = 10_000;
  for (let i = 0; i < N; i++) {
    stream.push({
      type: "notification/retry",
      data: { attempt: i % 5, error: "rate_limit" },
    });
  }

  // Buffer must be capped at MAX_BUFFER (1000) at any point, not N.
  expect(stream.size).toBeLessThanOrEqual(1000);

  // Drain.
  await new Promise((r) => setTimeout(r, 100));
  const memAfter = process.memoryUsage().heapUsed;

  // Memory growth must stay bounded (< 50 MB) — the core fix vs. death spiral.
  expect(memAfter - memBefore).toBeLessThan(50 * 1024 * 1024);
});

test("bounded queue evicts oldest under pressure (backpressure-by-eviction)", () => {
  const stream = new FullDroidIpcStream();
  for (let i = 0; i < 1500; i++) {
    stream.push({ type: "thinking_delta", data: { i } });
  }
  // 1500 pushed, MAX=1000 -> at least 500 evicted.
  expect((stream as any).droppedCount).toBeGreaterThanOrEqual(500);
  expect(stream.size).toBeLessThanOrEqual(1000);
});
