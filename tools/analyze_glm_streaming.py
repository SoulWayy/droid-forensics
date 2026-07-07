#!/usr/bin/env python3
"""
Deep analysis of GLM 5.2 streaming behavior, TPS, errors, and sessions.
Processes all Droid logs and correlates TTFT metrics with streaming notifications.
"""

import argparse
import gzip
import json
import re
from collections import defaultdict, Counter
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_LOG = str(REPO / "fixtures" / "sample-droid-log.log")

ap = argparse.ArgumentParser(description="Deep analysis of GLM 5.2 streaming behavior, TPS, errors, sessions.")
ap.add_argument("--log", action="append", default=[], help="Log file to process (repeatable). Default: fixtures/sample-droid-log.log")
args = ap.parse_args()
LOG_FILES = args.log if args.log else [DEFAULT_LOG]


def open_log(path):
    if path.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return open(path, "r", encoding="utf-8", errors="replace")


def parse_ts(ts_str):
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return None


def is_glm_line(line):
    return (
        '"modelId":"glm-5.2"' in line or
        '"modelId":"custom:GLM-5.2-0"' in line or
        '"modelId":"custom:GLM-5.2-anthropic-0"' in line or
        "custom:GLM-5.2-0" in line or
        "custom:GLM-5.2-anthropic-0" in line
    )


def extract_context(line):
    m = re.search(r"\] .*?Context: ({.*})", line)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return {}


def classify_model(ctx):
    for key in ["modelId", "model"]:
        val = ctx.get(key)
        if val in {"custom:GLM-5.2-0", "custom:GLM-5.2-anthropic-0"}:
            return ("zai_custom", val)
        if val == "glm-5.2":
            return ("zai_raw", val)
    return (None, None)


def main():
    # Pass 1: collect GLM session IDs and assistant message IDs from metrics
    glm_session_ids = set()
    glm_assistant_ids = set()

    for path in LOG_FILES:
        if not Path(path).exists():
            continue
        print(f"Pass 1: {path}")
        with open_log(path) as f:
            for line in f:
                if not is_glm_line(line):
                    continue
                ctx = extract_context(line)
                group, model = classify_model(ctx)
                if not group:
                    continue
                sid = ctx.get("sessionId")
                am_id = ctx.get("assistantMessageId")
                if sid:
                    glm_session_ids.add(sid)
                if am_id:
                    glm_assistant_ids.add(am_id)

    print(f"Found {len(glm_session_ids)} GLM sessions, {len(glm_assistant_ids)} assistant message IDs")

    # Pass 2: collect all data
    messages = defaultdict(lambda: {
        "model": None,
        "group": None,
        "baseUrl": None,
        "sessionId": None,
        "ttft": None,
        "success": False,
        "failure_reason": None,
        "assistant_deltas": [],
        "thinking_deltas": [],
        "tool_progress": [],
        "first_delta_ts": None,
        "last_delta_ts": None,
        "complete_ts": None,
        "tool_calls": 0,
        "tool_results": 0,
        "errors": [],
    })
    notification_types = Counter()

    for path in LOG_FILES:
        if not Path(path).exists():
            continue
        print(f"Pass 2: {path}")
        with open_log(path) as f:
            for line in f:
                ctx = extract_context(line)
                ts_match = re.match(r"\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\]", line)
                ts = ts_match.group(1) if ts_match else None
                ts_dt = parse_ts(ts) if ts else None

                sid = ctx.get("sessionId")
                am_id = ctx.get("assistantMessageId") or ctx.get("messageId")

                group, model = classify_model(ctx)

                # If this line is GLM-related or belongs to a GLM session
                is_glm = group is not None
                is_glm_session = sid in glm_session_ids

                if not is_glm and not is_glm_session:
                    continue

                mtype = ctx.get("type")
                if mtype:
                    notification_types[mtype] += 1

                if am_id:
                    msg = messages[am_id]
                    msg["model"] = msg["model"] or model
                    msg["group"] = msg["group"] or group
                    msg["sessionId"] = msg["sessionId"] or sid

                    if ctx.get("metric") == "chat_client_time_to_first_token":
                        msg["baseUrl"] = ctx.get("baseUrl")
                        msg["ttft"] = float(ctx["value"])
                    if ctx.get("metric") == "droid_chat_client_success_count":
                        msg["success"] = True
                    if ctx.get("metric") == "droid_chat_client_failure_count":
                        msg["failure_reason"] = ctx.get("reason")

                    if mtype == "assistant_text_delta":
                        msg["assistant_deltas"].append(ts_dt)
                        if not msg["first_delta_ts"]:
                            msg["first_delta_ts"] = ts_dt
                        msg["last_delta_ts"] = ts_dt
                    elif mtype == "thinking_text_delta":
                        msg["thinking_deltas"].append(ts_dt)
                    elif mtype == "assistant_text_complete":
                        msg["complete_ts"] = ts_dt
                    elif mtype == "tool_progress_update":
                        msg["tool_progress"].append(ts_dt)
                    elif mtype == "tool_call":
                        msg["tool_calls"] += 1
                    elif mtype == "tool_result":
                        msg["tool_results"] += 1

                # Errors in GLM sessions
                if (is_glm or is_glm_session) and ("Connection error" in line or "429" in line or "LLM error" in line or "Chat route failure" in line):
                    target_id = am_id
                    if not target_id and sid:
                        # find a message in this session
                        target_id = next((mid for mid, m in messages.items() if m["sessionId"] == sid), None)
                    if target_id:
                        messages[target_id]["errors"].append({"ts": ts, "line": line[:350]})

    print(f"\nTotal tracked assistant messages: {len(messages)}")

    # Calculate TPS estimates
    tps_estimates = []
    streaming_durations = []
    thinking_durations = []
    complete_with_ttft = []

    for mid, msg in messages.items():
        if msg["first_delta_ts"] and msg["complete_ts"]:
            duration = (msg["complete_ts"] - msg["first_delta_ts"]).total_seconds()
            if duration > 0:
                streaming_durations.append(duration)
                tps = len(msg["assistant_deltas"]) / duration
                tps_estimates.append(tps)
                if msg["ttft"]:
                    complete_with_ttft.append({
                        "ttft": msg["ttft"],
                        "stream_duration": duration,
                        "deltas": len(msg["assistant_deltas"]),
                        "tps": tps,
                        "baseUrl": msg["baseUrl"],
                        "model": msg["model"],
                    })
        if len(msg["thinking_deltas"]) > 1:
            tds = [t for t in msg["thinking_deltas"] if t]
            thinking_durations.append((max(tds) - min(tds)).total_seconds())

    def pstats(values):
        if not values:
            return None
        s = sorted(values)
        n = len(s)
        return {"n": n, "avg": sum(s)/n, "p50": s[n//2], "p95": s[int(n*0.95)] if n >= 20 else s[-1], "p99": s[int(n*0.99)] if n >= 100 else s[-1], "max": s[-1], "min": s[0]}

    print("\n=== Streaming Duration (first delta -> complete) ===")
    s = pstats(streaming_durations)
    if s:
        print(f"  n={s['n']} avg={s['avg']:.2f}s p50={s['p50']:.2f}s p95={s['p95']:.2f}s max={s['max']:.2f}s min={s['min']:.3f}s")

    print("\n=== Estimated TPS (assistant deltas / stream duration) ===")
    s = pstats(tps_estimates)
    if s:
        print(f"  n={s['n']} avg={s['avg']:.2f} p50={s['p50']:.2f} p95={s['p95']:.2f} max={s['max']:.2f} min={s['min']:.2f}")

    print("\n=== Thinking Duration ===")
    s = pstats(thinking_durations)
    if s:
        print(f"  n={s['n']} avg={s['avg']:.2f}s p50={s['p50']:.2f}s p95={s['p95']:.2f}s max={s['max']:.2f}s")

    print("\n=== Top notification types in GLM sessions ===")
    for nt, c in notification_types.most_common(15):
        print(f"  {nt}: {c}")

    # Per model group stats
    print("\n=== Per Model Group ===")
    for group_name in ["zai_raw", "zai_custom"]:
        msgs = [m for m in messages.values() if m["group"] == group_name]
        if not msgs:
            continue
        ttfts = [m["ttft"] for m in msgs if m["ttft"] is not None]
        successes = sum(1 for m in msgs if m["success"])
        failures = sum(1 for m in msgs if m["failure_reason"])
        conn_errors = sum(1 for m in msgs for e in m["errors"] if "Connection error" in e["line"])
        rate_errors = sum(1 for m in msgs for e in m["errors"] if "429" in e["line"])

        print(f"\n  {group_name}: {len(msgs)} messages")
        s = pstats(ttfts)
        if s:
            print(f"    TTFT: n={s['n']} avg={s['avg']:.2f}s p50={s['p50']:.2f}s p95={s['p95']:.2f}s max={s['max']:.2f}s")
        print(f"    Success={successes}, Failure={failures}, Conn errors={conn_errors}, 429={rate_errors}")

    # Per baseUrl
    print("\n=== Per BaseUrl ===")
    by_url = defaultdict(list)
    for m in messages.values():
        if m["baseUrl"]:
            by_url[m["baseUrl"]].append(m)
    for url, msgs in by_url.items():
        ttfts = [m["ttft"] for m in msgs if m["ttft"] is not None]
        successes = sum(1 for m in msgs if m["success"])
        failures = sum(1 for m in msgs if m["failure_reason"])
        conn_errors = sum(1 for m in msgs for e in m["errors"] if "Connection error" in e["line"])
        rate_errors = sum(1 for m in msgs for e in m["errors"] if "429" in e["line"])
        print(f"\n  {url}: {len(msgs)} messages")
        s = pstats(ttfts)
        if s:
            print(f"    TTFT: n={s['n']} avg={s['avg']:.2f}s p50={s['p50']:.2f}s p95={s['p95']:.2f}s max={s['max']:.2f}s")
        print(f"    Success={successes}, Failure={failures}, Conn errors={conn_errors}, 429={rate_errors}")

    # Save
    with open("glm-extracted/glm_message_streaming.json", "w") as f:
        serializable = {}
        for mid, msg in messages.items():
            serializable[mid] = {
                **{k: v for k, v in msg.items() if k != "errors"},
                "errors": [{"ts": e["ts"], "line": e["line"]} for e in msg["errors"]],
            }
        json.dump(serializable, f, indent=2, default=str)

    with open("glm-extracted/glm_tps_estimates.json", "w") as f:
        json.dump({
            "streaming_durations": streaming_durations,
            "tps_estimates": tps_estimates,
            "thinking_durations": thinking_durations,
            "complete_with_ttft": complete_with_ttft[:200],
        }, f, indent=2, default=str)

    print("\nSaved glm_message_streaming.json and glm_tps_estimates.json")


if __name__ == "__main__":
    main()
