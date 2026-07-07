/**
 * FullDroid IPC — a bounded async stream between the main loop and the TUI.
 *
 * The core piece of the render-death-spiral hypothesis: when the producer
 * (LLM stream + tool events) outruns the consumer (TUI render), an *unbounded*
 * buffer grows without limit and OOM-kills the process. This implementation
 * bounds the buffer (MAX=1000) and drops the oldest queued item under pressure
 * (backpressure-by-eviction) instead of growing forever. The flush is *coalesced*:
 * a push() marks the stream dirty and schedules a single flush on the next
 * event-loop tick (requestAnimationFrame-like), so an idle stream never wastes a
 * timer firing and a saturated stream still drains at most once per tick.
 */
import { Writable } from 'node:stream';

const MAX_BUFFER = 1000;

export interface IpcMessage {
  type: string;
  data: unknown;
}

export class FullDroidIpcStream extends Writable {
  private buffer: string[] = [];
  private flushScheduled = false;
  private flushHandle: ReturnType<typeof setTimeout> | null = null;
  private dropped = 0;

  constructor(private target?: { write: (s: string) => void }) {
    super({ objectMode: true });
    // Coalesced flush: scheduled lazily on dirty, not a fixed 16ms poll.
  }

  /**
   * Enqueue a message. When the buffer is full, drop the oldest queued item
   * rather than growing without bound (backpressure-by-eviction).
   */
  push(message: IpcMessage): void {
    const line = JSON.stringify(message) + '\n';
    if (this.buffer.length >= MAX_BUFFER) {
      this.buffer.shift(); // drop oldest
      this.dropped++;
    }
    this.buffer.push(line);
    this.scheduleFlush();
  }

  /** Coalesce: at most one flush scheduled per event-loop tick. */
  private scheduleFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    this.flushHandle = setTimeout(() => {
      this.flushScheduled = false;
      this.flushHandle = null;
      this.flush();
    }, 0);
    this.flushHandle?.unref?.();
  }

  /** Drain the buffer to the target + TUI process.stdout. */
  flush(): void {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    const out = batch.join('');
    if (this.target) this.target.write(out);
    if (typeof process !== 'undefined' && process.stdout) process.stdout.write(out);
  }

  /** Number of items evicted under backpressure (for diagnostics/bench). */
  get droppedCount(): number {
    return this.dropped;
  }

  get size(): number {
    return this.buffer.length;
  }

  _write(chunk: any, _enc: string, cb: (err?: Error | null) => void): void {
    try {
      const msg = typeof chunk === 'string' ? { type: 'raw', data: chunk } : (chunk as IpcMessage);
      this.push(msg);
      cb();
    } catch (err) {
      cb(err as Error);
    }
  }

  close(): void {
    if (this.flushHandle) {
      clearTimeout(this.flushHandle);
      this.flushHandle = null;
    }
    this.flushScheduled = false;
    this.flush(); // drain anything pending
  }
}
