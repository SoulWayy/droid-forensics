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

**Verified against the raw log** (`~/.factory/logs/droid-log-single.log`, 64 MB, sha256 pending) by running `tools/analyze_errors.py` / `tools/parse_sessions.py` directly:

| Symptom | Raw-log count | Source |
|---|---|---|
| HTTP 429 rate-limit responses (substring `429`) | **2.730** | raw `droid-log-single.log` (counted 2026-07-07) |
| YAML mentions (parse-related) | **13.158** | raw `droid-log-single.log` |
| Sync `statSync` / `git.ts` references | **933** | raw `droid-log-single.log` |
| `Header.tsx` render-path references | **193** | raw `droid-log-single.log` |
| JSON-RPC `notification` frames | **32.743** | raw `droid-log-single.log` |

**Reported by subagent analysis** (derived counts from `reports/*`, NOT independently recounted from the raw bytes in this pass):

| Symptom | Reported count | Source |
|---|---|---|
| JSON-RPC notifications (distinct) | 31.994 | `reports/eindrapport.md` §2.4 |
| HTTP 429 (filtered subset: Clinepass 106 + OpenCode 88 + GLM 38) | 232× | `reports/droid-architectuur-puzzel.md` §D.6 |
| YAML frontmatter parse errors | 2.924 | `reports/eindrapport.md` §2.2 |
| React duplicate-key errors | 70 | `reports/subagent-timeline.md` (Legend: dup-key=70) |
| Maximum update depth crashes | 8 | `reports/eindrapport.md` §2.1 / `console.log` |
| Sessions over ~15h | 42 | `reports/eindrapport.md` §2.4 |

> **Reconciliation note:** the raw substring count for `429` is 2.730, while the
> subagent reports 232 — the 232 figure is a filtered subset (three named
> providers), not the total. The 8 `max-depth` crashes are confirmed in
> `console.log` (the crash log), not in `droid-log-single.log`. The 70
> duplicate-key errors are **not present as a literal string in either raw log**
> and rely entirely on the subagent timeline report — treat as reported, not
> independently verified. See `REPRODUCTION.md` to re-run the counts.

---

## Timeline

Window: **6 jul 2026 22:18 → 7 jul 2026 13:34 UTC** (see `reports/subagent-timeline.md`).

First-occurrence cascade (from `reports/subagent-timeline.md` §Causal Cascade Analysis — **reported**, not re-derived from raw bytes in this pass):

1. `dup-key` — 2026-07-06 22:43:59 *(reported; the literal "duplicate key" string is absent from the raw logs — see Reconciliation note above)*
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

### Independent verification of the raw logs (2026-07-07)

Re-running the parsers directly against the raw 64 MB log produced counts
that **differ** from the subagent-derived figures in the table above:

- `429` substring count = **2.730** in `droid-log-single.log` (subagent reported 232, a filtered subset).
- The 8 `Maximum update depth` crashes are present in `console.log` (the crash log), **not** in `droid-log-single.log`.
- The 70 duplicate-key errors are **not present as a literal string** in either raw log; they originate solely from `reports/subagent-timeline.md`.

This is a known gap: the dossier's quantitative claims were produced by
subagent passes over the logs and were not re-counted byte-for-byte in the
original analysis. To make any figure independently verifiable, run:

```bash
python3 tools/analyze_errors.py --log ~/.factory/logs/droid-log-single.log --out reports/_verify-timeline.md
python3 tools/parse_sessions.py   --log ~/.factory/logs/droid-log-single.log --out reports/_verify-sessions.md
```

and reconcile the output against the tables in this report. Until then, treat
the "Reported by subagent analysis" rows as **derived**, not primary evidence.
