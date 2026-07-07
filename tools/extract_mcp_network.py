#!/usr/bin/env python3
"""Extract MCP tool calls, network endpoints, status changes, and token usage from droid-log-single.log.

Produces a structured markdown report. Read-only: never modifies the log file.
"""

import json
import re
import sys
from collections import defaultdict, Counter
from datetime import datetime, timezone
from pathlib import Path

LOG_PATH = Path("/home/jan/.factory/logs/droid-log-single.log")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_timestamp(line: str) -> str | None:
    m = re.search(r"^\[([\d\-T:.]+Z)", line)
    return m.group(1) if m else None


def extract_json_context(line: str) -> dict | None:
    """Return the JSON object after 'Context: ' at end of line."""
    m = re.search(r"\| Context:\s*(\{.*\})\s*$", line)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        # Some contexts span multiple lines; try partial
        return None


def extract_json_objects(text: str) -> list[dict]:
    """Extract all top-level JSON objects embedded in the text."""
    results = []
    depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                try:
                    results.append(json.loads(text[start : i + 1]))
                except json.JSONDecodeError:
                    pass
                start = -1
    return results


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------

def parse_agent_streaming(line: str, ctx: dict) -> dict | None:
    """Parse [Agent] Streaming result lines for token usage."""
    if "Agent] Streaming result" not in line:
        return None
    return {
        "inputTokens": ctx.get("inputTokens", 0),
        "cacheReadInputTokens": ctx.get("cacheReadInputTokens", 0),
        "totalInputTokens": ctx.get("totalInputTokens", 0),
        "outputTokens": ctx.get("outputTokens", 0),
        "reason": ctx.get("reason", ""),
        "modelId": ctx.get("tags", {}).get("modelId", ""),
    }


def parse_mcp_status(line: str, ctx: dict) -> dict | None:
    """Parse mcp_status_changed events."""
    if ctx.get("type") != "mcp_status_changed":
        return None
    return {
        "sessionId": ctx.get("tags", {}).get("sessionId", ""),
        "timestamp": parse_timestamp(line),
    }


def parse_tool_call(line: str, ctx: dict) -> dict | None:
    """Parse tool_call notification events."""
    if ctx.get("type") != "tool_call":
        return None
    return {
        "sessionId": ctx.get("tags", {}).get("sessionId", ""),
        "timestamp": parse_timestamp(line),
    }


def parse_tool_result(line: str, ctx: dict) -> dict | None:
    """Parse tool_result notification events."""
    if ctx.get("type") != "tool_result":
        return None
    return {
        "sessionId": ctx.get("tags", {}).get("sessionId", ""),
        "timestamp": parse_timestamp(line),
    }


def parse_session_token_usage(line: str, ctx: dict) -> dict | None:
    """Parse session_token_usage_changed events (just the event, not the token numbers)."""
    if ctx.get("type") != "session_token_usage_changed":
        return None
    return {
        "sessionId": ctx.get("tags", {}).get("sessionId", ""),
        "timestamp": parse_timestamp(line),
    }


def parse_registered_mcp_tool(line: str, ctx: dict) -> str | None:
    """Return the toolId from 'Registered MCP tool' lines."""
    if "Registered MCP tool" not in line:
        return None
    return ctx.get("toolId", "")


def parse_mcp_server_connected(line: str, ctx: dict) -> dict | None:
    """Parse MCP server connected events."""
    if "MCP server connected" not in line:
        return None
    return {
        "name": ctx.get("name", ""),
        "url": ctx.get("url", ""),
        "type": ctx.get("type", ""),
        "serverIdentity": ctx.get("serverIdentity", ""),
        "version": ctx.get("version", ""),
        "serverImplementation": ctx.get("serverImplementation", ""),
        "protocolVersion": ctx.get("protocolVersion", ""),
        "sessionId": ctx.get("tags", {}).get("sessionId", ""),
        "timestamp": parse_timestamp(line),
    }


def parse_mcp_server_closed(line: str, ctx: dict) -> dict | None:
    """Parse MCP server closed events."""
    if "MCP server closed" not in line:
        return None
    return {
        "name": ctx.get("name", ""),
        "url": ctx.get("url", ""),
        "type": ctx.get("type", ""),
        "serverIdentity": ctx.get("serverIdentity", ""),
        "sessionId": ctx.get("tags", {}).get("sessionId", ""),
        "timestamp": parse_timestamp(line),
    }


def parse_network_endpoints_from_ctx(ctx: dict) -> list[str]:
    """Extract URLs/IPs from a context dict."""
    urls = []
    for key in ("url", "baseUrl", "value", "metric"):
        val = ctx.get(key)
        if isinstance(val, str):
            m = re.findall(r"https?://[^\",\s}\]]+", val)
            urls.extend(m)
    # Also check nested tags
    tags = ctx.get("tags", {})
    if isinstance(tags, dict):
        for v in tags.values():
            if isinstance(v, str):
                m = re.findall(r"https?://[^\",\s}\]]+", v)
                urls.extend(m)
    return urls


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not LOG_PATH.exists():
        print(f"ERROR: log file not found at {LOG_PATH}", file=sys.stderr)
        sys.exit(1)

    tool_calls = []
    tool_results = []
    mcp_status_changes = []
    session_token_usage_events = []
    registered_tools = Counter()
    streaming_results = []
    mcp_connected = []
    mcp_closed = []
    network_urls = set()
    lines_with_urls = []
    tool_ids_in_calls = Counter()
    all_contexts = []
    mcp_tool_calls_by_session = defaultdict(list)
    tool_result_ids = []
    sessions = set()

    with open(LOG_PATH, "r", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue

            ts = parse_timestamp(line)
            ctx = extract_json_context(line)

            # Collect high-level event types
            if ctx:
                all_contexts.append(ctx)

                # Tool calls (notification)
                tc = parse_tool_call(line, ctx)
                if tc:
                    tool_calls.append(tc)
                    sid = tc["sessionId"]
                    sessions.add(sid)
                    mcp_tool_calls_by_session[sid].append(ts)

                # Tool results (notification)
                tr = parse_tool_result(line, ctx)
                if tr:
                    tool_results.append(tr)
                    sessions.add(tr["sessionId"])

                # MCP status changed
                ms = parse_mcp_status(line, ctx)
                if ms:
                    mcp_status_changes.append(ms)

                # Token usage notifications
                st = parse_session_token_usage(line, ctx)
                if st:
                    session_token_usage_events.append(st)

                # Registered MCP tools
                rt = parse_registered_mcp_tool(line, ctx)
                if rt:
                    registered_tools[rt] += 1

                # Agent streaming results (actual token counts)
                sr = parse_agent_streaming(line, ctx)
                if sr:
                    streaming_results.append(sr)

                # MCP server connect/disconnect
                conn = parse_mcp_server_connected(line, ctx)
                if conn:
                    mcp_connected.append(conn)
                closed = parse_mcp_server_closed(line, ctx)
                if closed:
                    mcp_closed.append(closed)

                # Network endpoints
                urls = parse_network_endpoints_from_ctx(ctx)
                for u in urls:
                    network_urls.add(u)

            # Also extract toolId mentions inline (for lines without Context)
            for tid in re.findall(r'toolId":"([^"]*)"', line):
                tool_ids_in_calls[tid] += 1

            # Extract URLs also from the raw line
            for u in re.findall(r'https?://[^\",\s}\]]+', line):
                network_urls.add(u)
                lines_with_urls.append((ts, u, line[:200]))

    # -----------------------------------------------------------------------
    # Build report
    # -----------------------------------------------------------------------
    report = []
    report.append("# MCP & Network Analysis: droid-log-single.log")
    report.append("")
    report.append(f"> **Log period**: {lines_ts_range(tool_calls, streaming_results, mcp_connected)}")
    report.append(f"> **Total lines**: {sum(1 for _ in open(LOG_PATH, 'rb'))}")
    report.append(f"> **Sessions**: {len(sessions)}")
    report.append("")

    # -- Overview counts --
    report.append("## 1. Overview Counts")
    report.append("")
    report.append("| Metric | Count |")
    report.append("|--------|------:|")
    report.append(f"| `tool_call` events (JSON-RPC notifications) | {len(tool_calls)} |")
    report.append(f"| `tool_result` events (JSON-RPC notifications) | {len(tool_results)} |")
    report.append(f"| `mcp_status_changed` events | {len(mcp_status_changes)} |")
    report.append(f"| `session_token_usage_changed` events | {len(session_token_usage_events)} |")
    report.append(f"| Registered MCP tools | {sum(registered_tools.values())} (unique: {len(registered_tools)}) |")
    report.append(f"| `[Agent] Streaming result` (token usage records) | {len(streaming_results)} |")
    report.append(f"| MCP server connects | {len(mcp_connected)} |")
    report.append(f"| MCP server closes | {len(mcp_closed)} |")
    report.append(f"| Unique network endpoints/URLs | {len(network_urls)} |")
    report.append("")

    # -- Tool calls by session --
    report.append("## 2. Tool Calls per Session")
    report.append("")
    report.append("| Session ID | Tool Calls |")
    report.append("|------------|-----------:|")
    for sid, calls in sorted(mcp_tool_calls_by_session.items(), key=lambda x: -len(x[1])):
        report.append(f"| `{sid[:8]}...` | {len(calls)} |")
    report.append("")

    # -- Registered MCP tools (top) --
    report.append("## 3. Registered MCP Tools (Top 30)")
    report.append("")
    report.append("| Tool ID | Registration Count |")
    report.append("|---------|-------------------:|")
    for tid, cnt in registered_tools.most_common(30):
        report.append(f"| `{tid}` | {cnt} |")
    report.append("")

    # -- Tool IDs from inline toolId mentions (actual tool names used) --
    report.append("## 4. Tool IDs Used (from all `toolId` mentions)")
    report.append("")
    report.append("| Tool ID | Occurrences |")
    report.append("|---------|------------:|")
    for tid, cnt in tool_ids_in_calls.most_common(30):
        report.append(f"| `{tid}` | {cnt} |")
    report.append("")

    # -- MCP Server events --
    report.append("## 5. MCP Server Lifecycle")
    report.append("")
    if mcp_connected:
        report.append("### Connects")
        report.append("")
        report.append("| Timestamp | Server URL | Version | Implementation | Session |")
        report.append("|-----------|-----------|---------|----------------|---------|")
        for c in mcp_connected[:20]:
            sid_short = c["sessionId"][:8] if c["sessionId"] else "-"
            report.append(f"| {c['timestamp']} | `{c['url']}` | {c.get('version','')} | {c.get('serverImplementation','')} | `{sid_short}...` |")
        if len(mcp_connected) > 20:
            report.append(f"| _... and {len(mcp_connected) - 20} more_ |")
        report.append("")
    if mcp_closed:
        report.append("### Disconnects")
        report.append("")
        report.append("| Timestamp | Server URL | Session |")
        report.append("|-----------|-----------|---------|")
        for c in mcp_closed[:20]:
            sid_short = c["sessionId"][:8] if c["sessionId"] else "-"
            report.append(f"| {c['timestamp']} | `{c['url']}` | `{sid_short}...` |")
        if len(mcp_closed) > 20:
            report.append(f"| _... and {len(mcp_closed) - 20} more_ |")
        report.append("")

    # -- mcp_status_changed events --
    report.append("## 6. `mcp_status_changed` Events")
    report.append("")
    report.append("| # | Timestamp | Session |")
    report.append("|---|-----------|---------|")
    for i, ev in enumerate(mcp_status_changes[:30], 1):
        sid_short = ev["sessionId"][:8] if ev["sessionId"] else "-"
        report.append(f"| {i} | {ev['timestamp']} | `{sid_short}...` |")
    if len(mcp_status_changes) > 30:
        report.append(f"| ... | _and {len(mcp_status_changes) - 30} more_ |")
    report.append("")

    # -- Token usage --
    report.append("## 7. Token Usage (from Agent Streaming results)")
    report.append("")
    if streaming_results:
        total_input = sum(s["inputTokens"] for s in streaming_results)
        total_output = sum(s["outputTokens"] for s in streaming_results)
        total_cache_read = sum(s["cacheReadInputTokens"] for s in streaming_results)
        total_all_input = sum(s["totalInputTokens"] for s in streaming_results)
        # group by model
        model_tokens = defaultdict(lambda: {"input": 0, "output": 0, "count": 0, "cache_read": 0})
        for s in streaming_results:
            mid = s["modelId"] or "unknown"
            model_tokens[mid]["input"] += s["inputTokens"]
            model_tokens[mid]["output"] += s["outputTokens"]
            model_tokens[mid]["cache_read"] += s["cacheReadInputTokens"]
            model_tokens[mid]["count"] += 1

        report.append("### Per Model")
        report.append("")
        report.append("| Model | Calls | Input Tokens | Cache Read | Total Input | Output Tokens |")
        report.append("|-------|------:|------------:|-----------:|------------:|-------------:|")
        for mid, vals in sorted(model_tokens.items(), key=lambda x: -x[1]["count"]):
            report.append(f"| `{mid}` | {vals['count']} | {vals['input']:,} | {vals['cache_read']:,} | {vals['input'] + vals['cache_read']:,} | {vals['output']:,} |")
        report.append("")
        report.append(f"**Grand total**: {sum(v['count'] for v in model_tokens.values())} calls, "
                      f"{total_input:,} input tokens, {total_cache_read:,} cache-read tokens, "
                      f"{total_all_input:,} total input (incl. cache), "
                      f"{total_output:,} output tokens")
        report.append("")

        # Token usage over time (sample each session)
        report.append("### Top Token-Consuming Calls")
        report.append("")
        report.append("| # | Timestamp | Input | Cache Read | Total Input | Output | Reason | Model |")
        report.append("|---|-----------|------:|-----------:|------------:|-------:|--------|-------|")
        # We need timestamps, but streaming_results don't carry them directly
        # Re-read lines to correlate
        idx = 0
        with open(LOG_PATH, "r", errors="replace") as f:
            for line in f:
                if "Agent] Streaming result" in line:
                    ctx = extract_json_context(line)
                    if ctx and idx < len(streaming_results):
                        sr = streaming_results[idx]
                        ts = parse_timestamp(line) or ""
                        report.append(f"| {idx+1} | {ts} | {sr['inputTokens']:,} | {sr['cacheReadInputTokens']:,} | {sr['totalInputTokens']:,} | {sr['outputTokens']:,} | {sr['reason']} | `{sr['modelId'][:30]}` |")
                        idx += 1
                        if idx >= 20:
                            break
        if len(streaming_results) > 20:
            report.append(f"| ... | _and {len(streaming_results) - 20} more_ |")
        report.append("")

    # -- Network endpoints --
    report.append("## 8. Network Endpoints & IPs")
    report.append("")
    sorted_urls = sorted(network_urls)
    report.append("| # | URL / Endpoint |")
    report.append("|---|----------------|")
    for i, url in enumerate(sorted_urls, 1):
        report.append(f"| {i} | `{url}` |")
    report.append("")

    # -- Session overview --
    report.append("## 9. Sessions in Log")
    report.append("")
    sorted_sessions = sorted(sessions)
    report.append(f"Total unique sessions: {len(sorted_sessions)}")
    report.append("")
    for sid in sorted_sessions:
        tc_count = len(mcp_tool_calls_by_session.get(sid, []))
        report.append(f"- `{sid}` — {tc_count} tool calls")
    report.append("")

    # -- Streaming result reasons --
    reasons = Counter(s["reason"] for s in streaming_results)
    report.append("## 10. Streaming Result Reasons")
    report.append("")
    report.append("| Reason | Count |")
    report.append("|--------|------:|")
    for reason, cnt in reasons.most_common():
        report.append(f"| `{reason}` | {cnt} |")
    report.append("")

    report.append("---")
    report.append("_Generated by `extract_mcp_network.py` — read-only analysis of the log file._")

    return "\n".join(report)


def lines_ts_range(tool_calls, streaming_results, mcp_connected):
    """Approximate time range from available timestamps."""
    all_ts = []
    for t in tool_calls:
        if t.get("timestamp"):
            all_ts.append(t["timestamp"])
    for t in mcp_connected:
        if t.get("timestamp"):
            all_ts.append(t["timestamp"])
    # Also scan log for first/last lines
    try:
        with open(LOG_PATH, "r", errors="replace") as f:
            first = f.readline().strip()
            f.seek(0, 2)
            size = f.tell()
            # Read last 500 bytes
            if size > 500:
                f.seek(size - 500)
            else:
                f.seek(0)
            last_line = ""
            for line in f:
                if line.strip():
                    last_line = line.strip()
        if first:
            m = re.search(r"\[([\d\-T:.]+Z)", first)
            if m:
                all_ts.append(m.group(1))
        if last_line:
            m = re.search(r"\[([\d\-T:.]+Z)", last_line)
            if m:
                all_ts.append(m.group(1))
    except Exception:
        pass

    if not all_ts:
        return "N/A"
    all_ts.sort()
    return f"{all_ts[0]} — {all_ts[-1]}"


if __name__ == "__main__":
    output = main()
    print(output)
