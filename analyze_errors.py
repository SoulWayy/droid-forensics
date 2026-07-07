#!/usr/bin/env python3
"""Parse droid logs, extract errors, build timeline, identify cascades.

READ ONLY -- does not modify any log files.
Output written to /home/jan/Droid-onderzoek-triage/subagent-timeline.md
"""

import re
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone

# ── file paths ──────────────────────────────────────────────────────
DROID_LOG   = "/home/jan/.factory/logs/droid-log-single.log"
CONSOLE_LOG = "/home/jan/.factory/logs/console.log"
OUTPUT      = "/home/jan/Droid-onderzoek-triage/subagent-timeline.md"

# ── helpers ──────────────────────────────────────────────────────────

TS_RE = re.compile(r"^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]")

def parse_ts(line):
    m = TS_RE.match(line)
    if not m:
        return None
    return datetime.fromisoformat(m.group(1).replace("Z", "+00:00"))

def error_category(msg):
    """Assign a short category key for each ERROR line."""
    if "429" in msg:
        return "429-rate-limit"
    if "same key" in msg or "duplicate" in msg or "dup key" in msg:
        return "dup-key"
    if "Maximum update depth" in msg:
        return "max-update-depth"
    if "Cannot update a component" in msg or "setState" in msg:
        return "bad-setstate"
    if "McpHub" in msg:
        return "mcp-tools"
    if "Error running" in msg:
        return "cmd-error"
    if "Failed to persist" in msg:
        return "persist"
    if "Failed to create session" in msg:
        return "session-create"
    if "Handler threw" in msg:
        return "handler-throw"
    if "Failed to play sound" in msg:
        return "sound-fail"
    if "Failed to" in msg:
        return "generic-fail"
    return "other"

def bucket_minute(dt):
    return dt.replace(second=0, microsecond=0)

# ── parse errors from a file ────────────────────────────────────────

def extract_errors(path, label):
    errors = []
    with open(path, "r") as fh:
        for line in fh:
            if "ERROR" not in line:
                continue
            ts = parse_ts(line)
            if ts is None:
                continue
            # extract the message portion after "ERROR: "
            m = re.search(r"ERROR:\s*(.*)", line)
            msg = m.group(1) if m else line.strip()
            cat = error_category(msg)
            errors.append({
                "ts": ts,
                "cat": cat,
                "msg": msg[:120],
                "file": label,
            })
    return errors

# ── main ────────────────────────────────────────────────────────────

all_errors = []
all_errors.extend(extract_errors(DROID_LOG, "droid-log-single"))
all_errors.extend(extract_errors(CONSOLE_LOG, "console.log"))

all_errors.sort(key=lambda e: e["ts"])

# per-minute counts
minute_buckets = defaultdict(lambda: defaultdict(int))
minute_total   = defaultdict(int)
for e in all_errors:
    mb = bucket_minute(e["ts"])
    minute_buckets[mb][e["cat"]] += 1
    minute_total[mb] += 1

# per-category totals
cat_totals = Counter(e["cat"] for e in all_errors)
sorted_cats = sorted(cat_totals)

# ── build output ────────────────────────────────────────────────────

lines = []
def P(s=""):
    lines.append(s)

P("# Error Timeline Analysis")
P()
P(f"**Source files:** `{DROID_LOG}`, `{CONSOLE_LOG}`")
P(f"**Total ERROR lines found:** {len(all_errors)}")
P(f"  - `droid-log-single.log`: {sum(1 for e in all_errors if e['file']=='droid-log-single')}")
P(f"  - `console.log`: {sum(1 for e in all_errors if e['file']=='console.log')}")
P()

# ── legend ──────────────────────────────────────────────────────────
P("## Legend")
for c in sorted_cats:
    P(f"  `{c:20s}`  {cat_totals[c]} occurrences")
P()

# ── ASCII timeline ──────────────────────────────────────────────────
P("## Timeline (errors per minute)")
P()
P("Each `#` represents 1 error. Annotations mark key events.")
P()

if minute_buckets:
    # find the maximum count for scaling
    max_count = max(minute_total.values())
    scale = max(1, max_count // 60)  # aim for ~60 chars wide at peak

    # track first 429 minute for annotation
    first_429_minute = None
    for e in all_errors:
        if e["cat"] == "429-rate-limit":
            first_429_minute = bucket_minute(e["ts"])
            break

    sorted_mins = sorted(minute_buckets.keys())

    # Build a compact per-category breakdown per minute for the detail lines
    for minute in sorted_mins:
        total = minute_total[minute]
        cats = minute_buckets[minute]
        bar_len = max(1, total // scale) if scale > 0 else total
        bar = "#" * bar_len

        # detail breakdown
        detail = " ".join(f"{k}={v}" for k, v in sorted(cats.items()))

        # annotations for notable events
        annotation = ""
        if cats.get("429-rate-limit", 0) > 0:
            if minute == first_429_minute:
                annotation += "  <-- FIRST 429"
            else:
                annotation += "  <-- 429"
        if cats.get("dup-key", 0) > 0 and not annotation:
            annotation += "  <-- dup-key burst"
        if cats.get("max-update-depth", 0) > 0:
            annotation += "  <-- max-update-depth"
        if cats.get("bad-setstate", 0) > 0:
            annotation += "  <-- setState-in-render"

        ts_str = minute.strftime("%m-%d %H:%M")
        P(f"{ts_str} | {bar:60s} [{total:2d}] {detail}{annotation}")

P()
# ── Causal cascade analysis ─────────────────────────────────────────
P("## Causal Cascade Analysis")
P()

# Find first occurrence of each major category
first_occurrence = {}
for e in all_errors:
    if e["cat"] not in first_occurrence:
        first_occurrence[e["cat"]] = e["ts"]

P("### First occurrence order")
for i, (cat, ts) in enumerate(sorted(first_occurrence.items(), key=lambda x: x[1]), 1):
    P(f"  {i}. `{cat}`  —  {ts.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}Z")
P()

# ── Does 429 come before or after dup keys? ─────────────────────────
P("### 429 vs dup-key ordering")

ts_429 = first_occurrence.get("429-rate-limit")
ts_dup = first_occurrence.get("dup-key")

if ts_429 and ts_dup:
    if ts_429 < ts_dup:
        P(f"  **429 FIRST**: {ts_429.strftime('%H:%M:%S')}Z  BEFORE  dup-key at {ts_dup.strftime('%H:%M:%S')}Z")
        P("  Implication: the rate-limit (429) from OpenCode API hit first, then the React")
        P("  TUI layer started producing duplicate-key warnings. This suggests the 429 error")
        P("  caused a state desync in the Ink/React render tree, which manifested as duplicate")
        P("  keys in the header component (likely re-rendering with inconsistent session state).")
    else:
        P(f"  **dup-key FIRST**: {ts_dup.strftime('%H:%M:%S')}Z  BEFORE  429 at {ts_429.strftime('%H:%M:%S')}Z")
        P("  Implication: the React render issues (dup keys) preceded the API rate-limit.")
        P("  This points to a pre-existing UI bug in the TUI component tree that may have")
        P("  contributed to the cascade, rather than being caused by it.")
elif ts_429:
    P("  Only 429 errors found (no dup-key).")
elif ts_dup:
    P("  Only dup-key errors found (no 429).")
else:
    P("  Neither 429 nor dup-key errors found.")

P()

# ── Cascade narrative ───────────────────────────────────────────────
P("### Narrative")

# Group by time windows
windows = [
    ("2026-07-06 22:00", "2026-07-06 23:00", "Evening session (Jul 6)"),
    ("2026-07-07 05:00", "2026-07-07 06:00", "Early morning"),
    ("2026-07-07 07:00", "2026-07-07 08:00", "Morning"),
    ("2026-07-07 08:00", "2026-07-07 09:00", "Late morning"),
    ("2026-07-07 09:00", "2026-07-07 11:00", "Midday"),
    ("2026-07-07 11:00", "2026-07-07 12:00", "Early afternoon"),
    ("2026-07-07 12:00", "2026-07-07 14:00", "Afternoon"),
]

P("| Time window | Events |")
P("|---|---|")
for ws, we, label in windows:
    ws_dt = datetime.fromisoformat(ws + "+00:00")
    we_dt = datetime.fromisoformat(we + "+00:00")
    window_errors = [e for e in all_errors if ws_dt <= e["ts"] < we_dt]
    if not window_errors:
        P(f"| {label} | _(no errors)_ |")
        continue
    cats_in_window = Counter(e["cat"] for e in window_errors)
    summary = ", ".join(f"{k} x{v}" for k, v in sorted(cats_in_window.items()))
    P(f"| {label} | {summary} |")

P()

# ── Detailed error listing ──────────────────────────────────────────
P("## All Errors (chronological)")
P()
for i, e in enumerate(all_errors, 1):
    ts_str = e["ts"].strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    P(f"{i:4d}. `{ts_str}` [{e['cat']:20s}] {e['msg']}")
    # add source file indicator
    P(f"      src: {e['file']}")

P()
P("---")
P("*Analysis generated by `analyze_errors.py` -- READ ONLY, no files modified.*")

# ── write output ────────────────────────────────────────────────────
with open(OUTPUT, "w") as fh:
    fh.write("\n".join(lines) + "\n")

print(f"Done. Wrote {len(lines)} lines to {OUTPUT}")
print(f"  Total errors found: {len(all_errors)}")
