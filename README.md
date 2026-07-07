# Droid Performance Forensics

Forensic post-mortem reconstructed from logs, binary inspection, and process inspection of Droid v0.164.x — covering extreme CPU (56–60%), input lag, and TUI render death spirals. No source code was modified; no live profiler run was possible after the process stopped.

## Dossier Index

1. [`BUG_REPORT.md`](BUG_REPORT.md) — **primaire ingang**: environment, symptoms, timeline, root cause, fixes, evidence caveats.
2. [`REPRODUCTION.md`](REPRODUCTION.md) — offline re-run guide: binary/log hashes, commands, expected output, fixtures.
3. [`reports/`](reports/) — alle bevindingen (eindrapport, onderzoeksmatrix, subagent-analyses, GLM-5.2/Z.ai bug report, architectuur-puzzel).
4. [`visualizations/`](visualizations/) — HTML dashboards (ethereal, editorial, cascade, canvas, architectuur-visualisatie).
5. [`tools/`](tools/) — analyse-scripts (error/session/MCP/plugin/GLM extractors, binary deep-extract).
6. [`rebuild-poc/`](rebuild-poc/) — POC die de Header render-loop simuleert.
7. [`extracted-source/`](extracted-source/) — uit binary geëxtraheerde JS-bundles.
8. [`droid-forensics/`](droid-forensics/) — SPA audit-dashboard (React).
9. [`remotion-death-spiral/`](remotion-death-spiral/) — video-POC van de render death spiral.

> Evidence caveat: dit is een log/binary-based post-mortem, **geen** full live-profiler case. Zie sectie `## Evidence Caveat` in `BUG_REPORT.md`.
