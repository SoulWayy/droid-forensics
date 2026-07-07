# rebuild-poc

Proof-of-concept that **validates the render-death-spiral hypothesis** of Droid
v0.164.x under bounded load (bounded IPC queue + backpressure-by-eviction,
schema-validated RPC, config-driven provider). It is NOT a Droid reimplementation:
it demonstrates the render-block principle with a minimal worker/IPC/TUI split.

To install dependencies:

```bash
bun install
```

Run the bounded-queue benchmark:

```bash
bun run src/bench-render.ts
```

Run the bounded-queue tests:

```bash
bun test src/bench-render.test.ts
```

> **Note on tests:** the legacy tool-layer tests under `src/tools/**` reference a
> larger Droid utility tree (`src/utils/*`, `src/services/analytics/*`, `src/skills/*`)
> that is not part of this POC. Those are a pre-existing incomplete scaffold and are
> intentionally out of scope. The bounded-queue tests + bench above are self-contained.

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
