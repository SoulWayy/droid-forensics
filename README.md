# 🧩 Droid Performance Forensics

> Complete reverse engineering of a coding agent (Droid v0.164.1) suffering from extreme CPU (56%), input lag, and render death spirals. Reconstructed from 103,994 log lines, binary analysis, and process inspection — without modifying a single line of Droid source code.

## 📋 What's Inside

### 📊 Visualizations (open in browser)
| File | Style | Description |
|------|-------|-------------|
| [`index.html`](index.html) | Master | Landing page linking to all artifacts |
| [`droid-ethereal.html`](droid-ethereal.html) | Ethereal Glass | OLED black, glass cards, bento grid |
| [`droid-editorial.html`](droid-editorial.html) | Editorial Luxury | Cream, serif, film grain, editorial split |
| [`droid-cascade.html`](droid-cascade.html) | Soft Structuralism | White, bold grotesk, z-axis cascade |
| [`droid-canvas.html`](droid-canvas.html) | Forensic Case File | Konva canvas, red string detective board |
| [`droid-architectuur-visualisatie.html`](droid-architectuur-visualisatie.html) | Tabbed Explorer | 7 tabs with Mermaid + data tables |
| [`bevindingen-canvas.html`](bevindingen-canvas.html) | Findings Canvas | Earlier findings visualization |

### 📖 Key Documents
- [`droid-architectuur-puzzel.md`](droid-architectuur-puzzel.md) — 52KB, 1714 lines. Complete reverse-engineered architecture with 9 appendices
- [`eindrapport.md`](eindrapport.md) — Final report with root causes and fixes
- [`onderzoeksmatrix.md`](onderzoeksmatrix.md) — Gap analysis of what was covered vs missing

### 🔬 Subagent Analysis (distilled from 64MB logs)
- [`subagent-sessies.md`](subagent-sessies.md) — 42 sessions, durations, errors per session
- [`subagent-timeline.md`](subagent-timeline.md) — 113 errors, cascade timeline, causal chain
- [`subagent-mcp-netwerk.md`](subagent-mcp-netwerk.md) — 1250 tool calls, 4080 MCP registrations
- [`subagent-plugins-settings.md`](subagent-plugins-settings.md) — 2627 skills, 360 YAML errors, settings audit

### 🔧 Analysis Scripts
- [`parse_sessions.py`](parse_sessions.py) — Session parser for droid-log-single.log
- [`analyze_errors.py`](analyze_errors.py) — Error timeline analyzer
- [`extract_mcp_network.py`](extract_mcp_network.py) — MCP + network endpoint extractor
- [`extract_plugins.py`](extract_plugins.py) — Plugin/settings/skills extractor
- [`scripts/extract_bun_bundle.py`](scripts/extract_bun_bundle.py) — BunFS .bun section extractor

## 🔍 Key Findings

| Metric | Value |
|--------|-------|
| CPU (main thread) | **56%** |
| JSON-RPC notifications | **31,994** |
| 429 rate limit errors | **232** |
| YAML parse errors | **2,924** |
| React duplicate keys | **70** |
| Max update depth crashes | **8** |
| Sessions in 15 hours | **42** |

## 💀 Root Cause: Render Death Spiral

```
429 Rate Limit (232×)
    → error notification to TUI
    → Header.tsx re-renders (useMemo)
    → getReadinessHint → statSync (477×)
    → event loop blocked → CPU 56%
    → React duplicate keys (70×) → full re-render
    → maximum update depth (8×) → crash
    → worker retry without backoff → back to start
```

**Verdict:** Sync I/O (`statSync`) in the React render path (`useMemo`) is the root cause. Rate limits are an external trigger, not the bug.

## 🛠️ How to Reproduce

```bash
# Serve the visualizations locally
python3 -m http.server 8899
# Open http://localhost:8899/

# Or extract the .bun section from the binary
python3 scripts/extract_bun_bundle.py /home/jan/.local/bin/droid

# Parse sessions from the log
python3 parse_sessions.py ~/.factory/logs/droid-log-single.log
```

## 📁 Project Structure

```
.
├── index.html                          # Master landing page
├── droid-*.html                        # Visualization artifacts
├── droid-architectuur-puzzel.md        # Full architecture document
├── eindrapport.md                      # Final report
├── subagent-*.md                       # Distilled log analysis
├── *.py                                # Analysis scripts
├── scripts/                            # RE tooling
├── rebuild-poc/                        # Proof-of-concept rebuild
└── droid-forensics/                    # React+shadcn project (WIP)
```

## ⚠️ Disclaimer

This is a read-only forensic analysis. No Droid source code was modified. All data was extracted from logs, binary inspection, and process observation. The 429 rate limits are user-caused (quota exhaustion), not a Droid bug.

---

*Reverse engineered with Pi coding agent • 2026-07-07*
