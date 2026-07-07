#!/usr/bin/env python3
"""
Extract comprehensive GLM 5.2 metrics from Droid logs for Z.ai bug report.
Processes all available droid-log-single.log files (current + archived).
"""

import argparse
import gzip
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def default_logs():
    env = os.environ.get("DROID_LOG")
    if env:
        return [env]
    return [str(REPO / "fixtures" / "sample-droid-log.log")]


def parse_args():
    p = argparse.ArgumentParser(description="Extract GLM 5.2 metrics from droid logs.")
    p.add_argument("--log", action="append", default=None,
                   help="Path to a droid log (repeatable). Defaults to fixtures/sample-droid-log.log")
    p.add_argument("--out", default=str(REPO / "glm-extracted"),
                   help="Output directory for extracted JSONL + report")
    return p.parse_args()


LOG_FILES = default_logs()

ZAI_MODELS = {"custom:GLM-5.2-0", "custom:GLM-5.2-anthropic-0"}
RAW_GLM = {"glm-5.2"}


def open_log(path):
    if path.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return open(path, "r", encoding="utf-8", errors="replace")


def classify_line(line):
    """Return (group, model) where group is 'zai_glm' or 'raw_glm' or None."""
    # Try to parse Context JSON first
    m = re.search(r"\] .*?Context: ({.*})", line)
    if m:
        try:
            ctx = json.loads(m.group(1))
            for key in ["modelId", "model", "providerModelId"]:
                val = ctx.get(key)
                if val in ZAI_MODELS:
                    return ("zai_glm", val)
                if val in RAW_GLM:
                    return ("raw_glm", val)
        except Exception:
            pass
    # Fallback string search
    if "custom:GLM-5.2-0" in line:
        return ("zai_glm", "custom:GLM-5.2-0")
    if "custom:GLM-5.2-anthropic-0" in line:
        return ("zai_glm", "custom:GLM-5.2-anthropic-0")
    if '"modelId":"glm-5.2"' in line:
        return ("raw_glm", "glm-5.2")
    return (None, None)


def parse_ts(ts_str):
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return None


def stats(values):
    if not values:
        return None
    s = sorted(values)
    n = len(s)
    return {
        "n": n,
        "min": s[0],
        "avg": sum(s) / n,
        "p50": s[n // 2],
        "p90": s[int(n * 0.90)] if n >= 10 else s[-1],
        "p95": s[int(n * 0.95)] if n >= 20 else s[-1],
        "p99": s[int(n * 0.99)] if n >= 100 else s[-1],
        "max": s[-1],
    }


def main(log_files=None):
    # Data structures
    zai_events = []  # list of context dicts with _ts, _model, _source
    raw_events = []
    all_errors = []

    for path in (log_files or LOG_FILES):
        p = Path(path)
        if not p.exists():
            print(f"SKIP (not found): {path}")
            continue
        print(f"Processing: {path}")
        try:
            with open_log(path) as f:
                for line in f:
                    line = line.rstrip("\n")
                    if not line:
                        continue
                    group, model = classify_line(line)
                    if not group:
                        continue
                    ts_match = re.match(r"\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\]", line)
                    ts = ts_match.group(1) if ts_match else None
                    ctx_match = re.search(r"\] .*?Context: ({.*})", line)
                    ctx = {}
                    if ctx_match:
                        try:
                            ctx = json.loads(ctx_match.group(1))
                        except Exception:
                            pass
                    ctx["_ts"] = ts
                    ctx["_model"] = model
                    ctx["_source"] = path
                    ctx["_raw"] = line
                    if group == "zai_glm":
                        zai_events.append(ctx)
                    else:
                        raw_events.append(ctx)

                    # Capture errors for GLM sessions
                    if "ERROR" in line or ("WARN" in line and any(x in line.lower() for x in ["error", "fail", "429", "throttl", "limit", "connection"])):
                        err_ctx = {"_ts": ts, "_model": model, "_source": path, "_line": line}
                        all_errors.append(err_ctx)
        except Exception as e:
            print(f"ERROR reading {path}: {e}")

    print(f"\nZAI GLM events: {len(zai_events)}")
    print(f"Raw GLM events: {len(raw_events)}")
    print(f"GLM-related errors/warnings: {len(all_errors)}")

    # Save raw events for further analysis
    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(exist_ok=True)

    with open(output_dir / "zai_glm_events.jsonl", "w") as f:
        for ev in zai_events:
            f.write(json.dumps(ev, default=str) + "\n")
    with open(output_dir / "raw_glm_events.jsonl", "w") as f:
        for ev in raw_events:
            f.write(json.dumps(ev, default=str) + "\n")

    # ===== ZAI GLM ANALYSIS =====
    print("\n" + "=" * 60)
    print("ZAI GLM (custom:GLM-5.2-0 + custom:GLM-5.2-anthropic-0)")
    print("=" * 60)

    # Per model counts
    zai_model_counts = Counter(e.get("_model") for e in zai_events)
    print("\nPer-model event counts:")
    for m, c in zai_model_counts.most_common():
        print(f"  {m}: {c}")

    # Metrics summary
    zai_metrics = defaultdict(list)
    for e in zai_events:
        metric = e.get("metric")
        if metric and "value" in e:
            try:
                zai_metrics[metric].append(float(e["value"]))
            except Exception:
                pass

    print("\nZAI GLM metrics summary:")
    for metric, vals in sorted(zai_metrics.items()):
        s = stats(vals)
        if s and len(vals) >= 2:
            print(f"  {metric}: n={s['n']} avg={s['avg']:.2f} p50={s['p50']:.2f} p95={s['p95']:.2f} max={s['max']:.2f}")

    # Numeric field summary
    numeric_fields = [
        "inputTokens", "outputTokens", "reasoningTokens", "totalInputTokens",
        "cacheReadInputTokens", "cachedTokensRead", "cachedTokensWritten",
        "tokens", "totalEstimatedTokens"
    ]
    print("\nZAI GLM token/cache fields:")
    for field in numeric_fields:
        vals = []
        for e in zai_events:
            if field in e and e[field] is not None:
                try:
                    vals.append(float(e[field]))
                except Exception:
                    pass
        if vals:
            s = stats(vals)
            print(f"  {field}: n={s['n']} avg={s['avg']:.0f} p50={s['p50']:.0f} p95={s['p95']:.0f} p99={s['p99']:.0f} max={s['max']:.0f}")

    # TTFT
    ttft = [float(e["value"]) for e in zai_events if e.get("metric") == "chat_client_time_to_first_token"]
    print(f"\nZAI GLM TTFT: n={len(ttft)}")
    if ttft:
        s = stats(ttft)
        print(f"  min={s['min']:.2f}s avg={s['avg']:.2f}s p50={s['p50']:.2f}s p90={s['p90']:.2f}s p95={s['p95']:.2f}s p99={s['p99']:.2f}s max={s['max']:.2f}s")

    # Sessions
    zai_sessions = defaultdict(list)
    for e in zai_events:
        sid = e.get("sessionId")
        if sid:
            zai_sessions[sid].append(e)
    print(f"\nZAI GLM unique sessions: {len(zai_sessions)}")
    for sid, evs in sorted(zai_sessions.items(), key=lambda x: min(e["_ts"] or "" for e in x[1]))[:20]:
        times = [e["_ts"] for e in evs if e["_ts"]]
        if times:
            print(f"  {sid}: {len(evs)} events, {min(times)} -> {max(times)}")

    # ===== RAW GLM ANALYSIS =====
    print("\n" + "=" * 60)
    print("Raw GLM (glm-5.2)")
    print("=" * 60)

    raw_metrics = defaultdict(list)
    for e in raw_events:
        metric = e.get("metric")
        if metric and "value" in e:
            try:
                raw_metrics[metric].append(float(e["value"]))
            except Exception:
                pass

    print("\nRaw GLM metrics summary:")
    for metric, vals in sorted(raw_metrics.items()):
        s = stats(vals)
        if s and len(vals) >= 2:
            print(f"  {metric}: n={s['n']} avg={s['avg']:.2f} p50={s['p50']:.2f} p95={s['p95']:.2f} max={s['max']:.2f}")

    raw_numeric = [
        "estimatedNetToolContextTokens", "estimatedTokensSaved", "deferredReminderTokens",
        "mcp_tool_search_context_tokens", "mcp_tool_search_estimated_token_savings"
    ]
    print("\nRaw GLM token/cache fields:")
    for field in raw_numeric:
        vals = []
        for e in raw_events:
            if field in e and e[field] is not None:
                try:
                    vals.append(float(e[field]))
                except Exception:
                    pass
        if vals:
            s = stats(vals)
            print(f"  {field}: n={s['n']} avg={s['avg']:.0f} p50={s['p50']:.0f} p95={s['p95']:.0f} p99={s['p99']:.0f} max={s['max']:.0f}")

    ttft_raw = [float(e["value"]) for e in raw_events if e.get("metric") == "chat_client_time_to_first_token"]
    print(f"\nRaw GLM TTFT: n={len(ttft_raw)}")
    if ttft_raw:
        s = stats(ttft_raw)
        print(f"  min={s['min']:.2f}s avg={s['avg']:.2f}s p50={s['p50']:.2f}s p90={s['p90']:.2f}s p95={s['p95']:.2f}s p99={s['p99']:.2f}s max={s['max']:.2f}s")

    raw_sessions = defaultdict(list)
    for e in raw_events:
        sid = e.get("sessionId")
        if sid:
            raw_sessions[sid].append(e)
    print(f"\nRaw GLM unique sessions: {len(raw_sessions)}")

    # ===== ERRORS =====
    print("\n" + "=" * 60)
    print("GLM-related errors/warnings")
    print("=" * 60)
    print(f"Total: {len(all_errors)}")
    for err in all_errors[:50]:
        ts = err.get("_ts", "?")
        model = err.get("_model", "?")
        line = err.get("_line", "")[:250]
        print(f"  [{ts}] [{model}] {line}")


if __name__ == "__main__":
    args = parse_args()
    OUTPUT_DIR = args.out
    logs = args.log if args.log else LOG_FILES
    main(log_files=logs)
