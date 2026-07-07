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

## Expected Output

- `analyze_errors.py` → error legend (dup-key=70, bad-setstate=8, max-update-depth=8, 429-rate-limit) and a per-minute timeline.
- `parse_sessions.py` → session table with 42 unique session IDs and per-session 429 counts.
- `extract_mcp_network.py` → tool-call and MCP-registration tallies.
- `extract_plugins.py` → skills/settings/YAML-error counts (≈2.924 YAML parse errors surface here).
- `extract_glm_metrics.py` / `analyze_glm_streaming.py` → TTFT percentiles and 429/connection-error counts for GLM-5.2.

---

## Using Fixtures

Always pass `fixtures/sample-droid-log.log` instead of `~/.factory/logs/droid-log-single.log`. This keeps runs reproducible without access to the original 64 MB log and avoids depending on a live Droid process. Add `--out` targets under `reports/` so generated artifacts stay in the audit dossier.

For the UI render-path simulation (not a log analysis): `rebuild-poc/full-droid-tui.tsx` approximates the Header render loop and can be exercised with `bun rebuild-poc/cli.ts`.
