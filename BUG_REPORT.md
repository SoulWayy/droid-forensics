# Bug Report — Droid v0.164.x TUI Performance / Render Death Spiral

**Status:** Forensic post-mortem (closed for live debugging — process stopped)
**Severity:** High (interactive usability unusable during incident window)
**This is the PRIMARY entry point for the audit dossier.** See `REPRODUCTION.md` for how to re-run the analysis.

---

## Environment

- **OS:** Linux 6.1.0-50-amd64
- **Droid version:** v0.164.0 / v0.164.1 (Rust core + JavaScriptCore, Bun-bundled)
- **Binary path:** `~/.local/bin/droid`
- **Binary sha256:** `615c2a4ce17766115ccad5d2025d4f5583fd87de6ee580dc9661fdbbef5e06c8`
- **Bun runtime version:** 1.3.14
- **Process:** PID 2663905, stopped (live process/network capture no longer possible without restart)

---

## Symptoms

Observed during the 6 jul 22:18 → 7 jul 13:34 window (~15h, 42 sessions):

- **CPU 56–60%** sustained on the main TUI thread (see `reports/eindrapport.md`).
- **Input lag** — keystrokes queued behind the blocked event loop.
- **Render death spiral** — React/Ink re-render cascade ending in hard crashes.

Quantified evidence:

| Symptom | Count | Source |
|---|---|---|
| JSON-RPC notifications logged | 31.994 | `reports/eindrapport.md` §2.4 |
| HTTP 429 rate-limit responses (total across all providers) | 232× | `reports/droid-architectuur-puzzel.md` §D.6 (Clinepass 106 + OpenCode 88 + GLM 38) |
| YAML frontmatter parse errors | 2.924 | `reports/eindrapport.md` §2.2 |
| React duplicate-key errors | 70 | `reports/subagent-timeline.md` (Legend: dup-key=70) |
| Maximum update depth crashes | 8 | `reports/eindrapport.md` §2.1 |
| Sessions over ~15h | 42 | `reports/eindrapport.md` §2.4 |
| Sync `statSync` calls on `.git` (git.ts) | 477 | `reports/eindrapport.md` §2.2 |
| `Header.tsx` render-path hot hits | 209 | `reports/eindrapport.md` §2.2 |

---

## Timeline

Window: **6 jul 2026 22:18 → 7 jul 2026 13:34 UTC** (see `reports/subagent-timeline.md`).

First-occurrence cascade (from `reports/subagent-timeline.md` §Causal Cascade Analysis):

1. `dup-key` — 2026-07-06 22:43:59 (precedes the 429 storm; a pre-existing UI bug)
2. `persist` — 2026-07-07 05:08:58
3. `session-create` — 2026-07-07 05:09:01
4. `bad-setstate` (`jnM`) — 2026-07-07 05:26:38
5. `cmd-error` — 2026-07-07 08:05:33
6. `max-update-depth` — 2026-07-07 08:49:13 (8× within ~1 min, 08:49–08:50)
7. `429-rate-limit` — 2026-07-07 11:30:42 (external trigger arrives later)
8. `mcp-tools` — 2026-07-07 13:29:31

Representative stack trace (from `reports/eindrapport.md` §3.1, via binary source maps):

```
at <anonymous> (src/components/Header.tsx:386:18)
at gz (react-reconciler.development.js:6427:23)
at useMemo (react-reconciler.development.js:17913:18)
at hJn (src/components/Header.tsx:385:37)
```

Sync I/O frame (from `reports/droid-architectuur-puzzel.md` §Appendix traces):

```
at statSync (unknown)
at RP (packages/runtime/shell/src/git.ts:18:23)
```

---

## Minimal Reproduction

A live-process reproduction was **not** possible (Droid was stopped and restarting triggers the same 429 loop). A faithful simulation is available:

- `rebuild-poc/` — approximate TUI rebuild (`full-droid-tui.tsx`, `cli.ts`) that exercises the Header render path.
- `fixtures/sample-droid-log.log` — a redacted sample of `droid-log-single.log` for offline analysis.

The incident is reproducible by combining: (a) a sync-filesystem call inside a `useMemo` render path (Header → `getReadinessHint` → `git.ts:statSync`), and (b) a notification-spam trigger (repeated 429 retries pushing status updates to the TUI).

---

## Expected vs Actual Behavior

| | Behavior |
|---|---|
| **Expected** | Header renders cheaply; git-root lookup is cached/async; stable React keys; 429 produces one clear message and stops retrying. |
| **Actual** | Header runs `statSync` over the whole parent-dir tree on every render; duplicate `header-*` keys force re-reconciliation; 429 retries flood the TUI with notifications, driving a re-render loop that blocks the event loop (56–60% CPU, input lag) and crashes via `Maximum update depth exceeded` (8×). |

---

## Suspected Root Cause

Chain rooted in `src/components/Header.tsx`:

1. `Header.tsx` → `useMemo` (lines 376–386) → `getReadinessHint` → `packages/runtime/shell/src/git.ts:18` `statSync` (synchronous filesystem I/O) inside the React/Ink **render phase** (see `reports/eindrapport.md` §3.1, `reports/droid-architectuur-puzzel.md` §8.1).
2. **Duplicate React keys** (`header-configs`, `header-session`, `header-built_in_commands`, `header-custom_skills`) — 70 errors — force needless reconciliation (see `reports/eindrapport.md` §3.2).
3. **429-retry notification spam loop** — external quota exhaustion drives repeated worker retries that emit status notifications to the TUI, amplifying the render loop (see `reports/eindrapport.md` §3.4). The 429 storm is a *trigger*, not the bug.

---

## Workaround

(none observed)

---

## Proposed Fix

1. Remove sync I/O from the render path — move `getReadinessHint` out of `useMemo`; use `useEffect` or cache the git root; replace tree-wide `statSync` with async `fs.stat` / `find-up` (see `reports/eindrapport.md` §5.1).
2. Stabilize React keys in `Header.tsx` (dedupe `header-${category}` or use index+category).
3. Fix `setState`-during-render in component `jnM` (move to effects/handlers).
4. Add 429 graceful degradation: stop retrying after N attempts, distinguish quota vs transient, coalesce notifications (see `reports/eindrapport.md` §5.2, §5.3).

---

## Evidence Caveat

**Dit is een log/binary-based forensic POST-MORTEM, geen full live-profiler case.** The following have NOT been verified:

- Live thread stack traces (gdb) at time of 60% CPU — process was stopped.
- Network capture (tshark/tcpdump) of the JSON-RPC IPC loopback traffic.
- Core dump (~400 MB) of the running process.
- Memory-leak / RSS-growth tracking over time.
- A deterministic reproduction independent of the 429 trigger (would require a working API key).
- Exact minified bundle identifier for component `jnM` (source maps give `Header.tsx` context only).

All counts above are derived from historical logs (`~/.factory/logs/droid-log-single.log`, `console.log`) and static binary inspection. See `reports/onderzoeksmatrix.md` for the full covered/missing gap analysis.
