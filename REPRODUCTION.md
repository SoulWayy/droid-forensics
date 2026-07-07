# Reproduction & Verification Guide

How to re-run the forensic analysis offline. All scripts live in `tools/` and operate on a log file — prefer `fixtures/sample-droid-log.log` over live system paths.

---

## Binary & Log Hashes

| Artifact | Path | sha256 |
|---|---|---|
| Droid binary | `~/.local/bin/droid` | `615c2a4ce17766115ccad5d2025d4f5583fd87de6ee580dc9661fdbbef5e06c8` |
| Original full log | `~/.factory/logs/droid-log-single.log` (local only) | `PENDING` |
| Sample fixture | `fixtures/sample-droid-log.log` | compute with `sha256sum fixtures/sample-droid-log.log` |

The original 64 MB log lives only on the analyst machine; the `fixtures/` copy is a redacted sample for reproducible runs.

---

## Droid Version

- v0.164.0 / v0.164.1 (Rust core + JavaScriptCore, Bun 1.3.14)
- Host: Linux 6.1.0-50-amd64

---

## Commands

Run each script from the repo root. Replace `--log` with `fixtures/sample-droid-log.log` unless you have the original log.

```bash
# Error timeline + cascade analysis
python3 tools/analyze_errors.py --log fixtures/sample-droid-log.log --out reports/subagent-timeline.md

# Session parser (42 sessions, durations, errors/session)
python3 tools/parse_sessions.py --log fixtures/sample-droid-log.log --out reports/subagent-sessies.md

# MCP network + endpoint extraction
python3 tools/extract_mcp_network.py --log fixtures/sample-droid-log.log --out reports/subagent-mcp-netwerk.md

# Plugin / settings / skills extraction
python3 tools/extract_plugins.py --log fixtures/sample-droid-log.log --out reports/subagent-plugins-settings.md

# GLM-5.2 streaming metrics (Z.ai endpoints)
python3 tools/extract_glm_metrics.py --log fixtures/sample-droid-log.log --out reports/glm5.2-metrics-rapport.md
python3 tools/analyze_glm_streaming.py --log fixtures/sample-droid-log.log --out reports/zai-glm52-bug-report.md

# Generic string/structure extraction from the binary
python3 tools/deep-extract.py ~/.local/bin/droid
python3 tools/smart-extract.py ~/.local/bin/droid
```

---

## Verify against the REAL log (independent check)

When the original log is available on the analyst machine, re-derive the
ground-truth counts and compare to `BUG_REPORT.md`:

```bash
python3 tools/analyze_errors.py \
  --log ~/.factory/logs/droid-log-single.log \
  --out reports/_verify-timeline.md
python3 tools/parse_sessions.py \
  --log ~/.factory/logs/droid-log-single.log \
  --out reports/_verify-sessions.md

# raw substring counts (independent of the parser):
grep -c 429      ~/.factory/logs/droid-log-single.log   # expect 2730
grep -ci yaml   ~/.factory/logs/droid-log-single.log   # expect 13158
grep -ci statSync ~/.factory/logs/droid-log-single.log # expect 933
grep -c  'maximum update depth' ~/.factory/logs/console.log  # expect 8
```

> **Reconciliation:** the raw `429` substring count (2730) is larger than the
> subagent-derived 232 (a filtered subset). The 8 `max-depth` crashes live in
> `console.log` (the crash log), not in `droid-log-single.log`. The 70
> duplicate-key errors are **not** a literal string in either raw log and rely
> on `reports/subagent-timeline.md` — treat as reported, not independently
> verified. See `BUG_REPORT.md` §Evidence for the full split.

Run the fixture-based regression suite (also covers a real-log extract):

```bash
python3 -m unittest tests.test_parsers -v
```

---

## Expected Output

- `analyze_errors.py` → error legend (429-rate-limit, max-update-depth, duplicate/parse) and a per-minute timeline. On the real log this surfaces the genuine 429 storm; on the redacted fixture the synthetic counts per the test asserts.
- `parse_sessions.py` → session table with unique session IDs and per-session 429 counts.
- `extract_mcp_network.py` → tool-call and MCP-registration tallies.
- `extract_plugins.py` → skills/settings/YAML-error counts.
- `extract_glm_metrics.py` / `analyze_glm_streaming.py` → TTFT percentiles and 429/connection-error counts for GLM-5.2.

---

## Using Fixtures

Always pass `fixtures/sample-droid-log.log` instead of `~/.factory/logs/droid-log-single.log` for reproducible runs. `fixtures/sample-real-extract.log` is a small **anonymised slice of the real 64 MB log** (carrying the genuine 429 storm + Header.tsx/statSync render-path + react-reconciler max-depth stack trace) — it backs the `RealLogVerificationTests` and proves the root-cause chain against actual data. Generated `--out` artifacts belong under `reports/`.

For the UI render-path simulation (not a log analysis): `rebuild-poc/full-droid-tui.tsx` approximates the Header render loop and can be exercised with `bun rebuild-poc/cli.ts`.
