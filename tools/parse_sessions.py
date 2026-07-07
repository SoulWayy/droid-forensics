#!/usr/bin/env python3
"""Parse 64MB droid-log-single.log and extract per-session metrics."""

import json
import re
import sys
from collections import defaultdict, OrderedDict

LOG_PATH = "/home/jan/.factory/logs/droid-log-single.log"
OUTPUT_PATH = "/home/jan/Droid-onderzoek-triage/subagent-sessies.md"

# Patterns
TS_RE = re.compile(r"^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]")
CTX_RE = re.compile(r" \| Context: (.+)$")
CTX_SINGLE = re.compile(r" Context: (.+)$")
SESSION_RE = re.compile(r'"sessionId":"([^"]+)"')
SUBCMD_RE = re.compile(r'"subcommand":"([^"]+)"')
MODEL_RE = re.compile(r'"modelId":"([^"]+)"')
BYOK_RE = re.compile(r'"isByok":"([^"]+)"')
NOTIF_RE = re.compile(r"\[metrics_log_factory_app_jsonrpc_notification_count\]")
SERVERS_RE = re.compile(r'"servers":\[([^\]]+)\]')
ERROR_LINE_RE = re.compile(r"ERROR:")

# Error patterns we track
ERROR_PATTERNS = {
    "429": re.compile(r"429|rate.limit|rate_limit", re.I),
    "dup_keys": re.compile(r"duplicate.key|two children with the same key|Encountered two children", re.I),
    "max_depth": re.compile(r"max.*depth|maximum.*depth|Maximum update depth", re.I),
    "setState": re.compile(r"setState|set_state|cannot call setState", re.I),
}


def parse_json_ctx(text):
    """Try to parse JSON context from log line."""
    m = CTX_RE.search(text)
    if not m:
        m = CTX_SINGLE.search(text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    return {}


def extract_tags(data):
    """Extract tags dict from parsed JSON context, also check top-level keys."""
    tags = data.get("tags", {})
    if not isinstance(tags, dict):
        tags = {}
    # Some fields are at top level, copy to tags for uniformity
    for key in ("sessionId", "subcommand", "modelId", "isByok"):
        if key in data and key not in tags:
            tags[key] = data[key]
    return tags


def classify_errors_in_line(line, session_id, line_num):
    """Classify error types present in a line."""
    errors = set()
    if "ERROR:" not in line:
        return errors
    for etype, pat in ERROR_PATTERNS.items():
        if pat.search(line):
            errors.add(etype)
    return errors


def main():
    session_data = OrderedDict()
    seen_sessions = OrderedDict()
    all_session_ids = set()

    total_lines = 0
    processed = 0

    # First pass: collect all session IDs and their timestamp boundaries
    print("First pass: scanning for session IDs and timestamps...", file=sys.stderr)
    
    current_line_parts = []
    last_ts = None

    with open(LOG_PATH, "r", errors="replace") as f:
        for raw_line in f:
            total_lines += 1
            line = raw_line.rstrip("\n\r")

            # Check if this line starts a new log entry
            ts_m = TS_RE.match(line)
            if ts_m:
                # Process accumulated previous entry
                if current_line_parts:
                    entry_ts = last_ts
                    entry_text = "\n".join(current_line_parts)
                    _process_entry(entry_ts, entry_text, session_data, all_session_ids)
                    processed += 1
                    current_line_parts = []
                
                last_ts = ts_m.group(1)
                current_line_parts.append(line)
            elif last_ts and line.strip():
                # Continuation of previous log entry (stack trace, etc.)
                current_line_parts.append(line)
            
            if total_lines % 500000 == 0:
                print(f"  scanned {total_lines} lines...", file=sys.stderr)

        # Last entry
        if current_line_parts:
            _process_entry(last_ts, "\n".join(current_line_parts), session_data, all_session_ids)
            processed += 1

    # Second pass: accumulate notification counts per session
    print(f"\nSecond pass: aggregating notification counts across {total_lines} lines...", file=sys.stderr)
    
    # Re-scan for notification count and MCP servers
    notification_counts = defaultdict(int)
    session_servers = defaultdict(set)
    session_error_types = defaultdict(set)
    session_error_msgs = defaultdict(list)
    session_has_clean_shutdown = defaultdict(bool)

    with open(LOG_PATH, "r", errors="replace") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n\r")
            
            sids = SESSION_RE.findall(line)
            if not sids:
                continue
            # Use first session ID in line
            sid = sids[0]
            
            # Notification count
            if NOTIF_RE.search(line):
                ctx = parse_json_ctx(line)
                val = ctx.get("value", 0)
                if isinstance(val, (int, float)):
                    notification_counts[sid] += int(val)

            # MCP servers
            if "McpHub" in line and ("servers" in line):
                servers_m = SERVERS_RE.search(line)
                if servers_m:
                    raw = servers_m.group(1)
                    names = [n.strip().strip('"') for n in raw.split(",")]
                    session_servers[sid].update(n for n in names if n)
            
            # Error classification
            has_429 = bool(re.search(r"429|rate.limit|rate_limit", line, re.I))
            has_dup = bool(re.search(r"duplicate.key|two children with the same key", line, re.I))
            has_maxd = bool(re.search(r"max.*depth|maximum.*depth|Maximum update depth", line, re.I))
            has_setst = bool(re.search(r"setState|set_state|cannot call setState", line, re.I))
            
            if has_429:
                session_error_types[sid].add("429")
                # Extract the actual error message
                msg_m = re.search(r'"message":"([^"]*429[^"]*)"', line)
                if msg_m:
                    session_error_msgs[sid].append(msg_m.group(1))
            if has_dup:
                session_error_types[sid].add("dup_keys")
            if has_maxd:
                session_error_types[sid].add("max_depth")
            if has_setst:
                session_error_types[sid].add("setState")
            
            # Clean shutdown detection
            if "Shutting down" in line or "Shutdown signal received" in line or "Cleaning up" in line:
                session_has_clean_shutdown[sid] = True

    # Now compute per-session summary from first pass data
    print(f"\nCompiling results for {len(session_data)} sessions...", file=sys.stderr)

    # Build final table
    rows = []
    for sid, sd in session_data.items():
        start_ts = sd["first_ts"]
        end_ts = sd["last_ts"]
        subcommands = sd["subcommands"]
        models = sd["models"]
        byok_vals = sd["byok"]
        
        # Determine primary subcommand (most mentioned)
        if subcommands:
            # Exclude ones that look like session IDs
            real_cmds = [c for c in subcommands if not re.match(r'^[0-9a-f-]{36}$', c)]
            if real_cmds:
                primary_cmd = max(set(real_cmds), key=real_cmds.count)
            else:
                primary_cmd = subcommands[0]
        else:
            primary_cmd = "unknown"
        
        primary_model = max(set(models), key=models.count) if models else "unknown"
        is_byok = any("true" in v.lower() for v in byok_vals)
        notif_count = notification_counts.get(sid, 0)
        errors = session_error_types.get(sid, set())
        servers = session_servers.get(sid, set())
        err_msgs = session_error_msgs.get(sid, [])
        
        # Determine end status
        end_status = "unknown"
        err_lines = len(session_data.get(sid, {}).get("error_lines", []))
        if session_has_clean_shutdown.get(sid, False):
            end_status = "clean_shutdown"
        elif err_msgs:
            end_status = "errored"
        elif err_lines > 0:
            end_status = "errored"
        else:
            end_status = "unknown"
        
        # Duration
        duration_str = ""
        try:
            from datetime import datetime
            fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
            t1 = datetime.strptime(start_ts, fmt)
            t2 = datetime.strptime(end_ts, fmt)
            delta = t2 - t1
            total_sec = delta.total_seconds()
            if total_sec >= 3600:
                duration_str = f"{int(total_sec//3600)}h{int((total_sec%3600)//60)}m"
            elif total_sec >= 60:
                duration_str = f"{int(total_sec//60)}m{int(total_sec%60)}s"
            else:
                duration_str = f"{int(total_sec)}s"
        except:
            duration_str = "?"
        
        rows.append({
            "sessionId": sid,
            "start": start_ts,
            "end": end_ts,
            "duration": duration_str,
            "subcommand": primary_cmd,
            "notif_count": notif_count,
            "errors": ", ".join(sorted(errors)) if errors else "none",
            "model": primary_model,
            "byok": "yes" if is_byok else "no",
            "mcp_servers": ", ".join(sorted(servers)) if servers else "none",
            "end_status": end_status,
            "error_msgs": err_msgs[:5],  # first 5
        })

    # Sort by start time
    rows.sort(key=lambda r: r["start"])

    # Write output
    print(f"\nWriting {len(rows)} sessions to {OUTPUT_PATH}...", file=sys.stderr)
    with open(OUTPUT_PATH, "w") as out:
        out.write("# Droid Session Analysis\n\n")
        out.write(f"Generated from: `{LOG_PATH}`\n")
        out.write(f"Total lines scanned: {total_lines:,}\n")
        out.write(f"Unique sessions found: {len(rows)}\n\n")
        
        # Summary stats
        subcmd_counts = defaultdict(int)
        model_counts = defaultdict(int)
        error_type_counts = defaultdict(int)
        status_counts = defaultdict(int)
        for r in rows:
            subcmd_counts[r["subcommand"]] += 1
            model_counts[r["model"]] += 1
            for e in r["errors"].split(", "):
                if e and e != "none":
                    error_type_counts[e] += 1
            status_counts[r["end_status"]] += 1
        
        out.write("## Summary Statistics\n\n")
        out.write("### Subcommands\n")
        for sc, cnt in sorted(subcmd_counts.items(), key=lambda x: -x[1]):
            out.write(f"- `{sc}`: {cnt}\n")
        
        out.write("\n### Model Providers\n")
        for m, cnt in sorted(model_counts.items(), key=lambda x: -x[1]):
            out.write(f"- `{m}`: {cnt}\n")
        
        out.write("\n### Error Type Occurrence (across all sessions)\n")
        for e, cnt in sorted(error_type_counts.items(), key=lambda x: -x[1]):
            out.write(f"- `{e}`: {cnt} sessions\n")
        
        out.write("\n### End Status Distribution\n")
        for s, cnt in sorted(status_counts.items(), key=lambda x: -x[1]):
            out.write(f"- `{s}`: {cnt}\n")
        
        # Table
        out.write("\n---\n\n")
        out.write("## Per-Session Details\n\n")
        out.write("| # | Session ID | Start | End | Duration | Subcommand | Notif Count | Error Types | Model | BYOK | MCP Servers | End Status |\n")
        out.write("|---|-----------|-------|-----|----------|-----------|-------------|-------------|-------|------|-------------|------------|\n")
        for i, r in enumerate(rows, 1):
            sid_short = r["sessionId"][:8]
            out.write(
                f"| {i} | `{sid_short}` | {r['start']} | {r['end']} | {r['duration']} "
                f"| `{r['subcommand']}` | {r['notif_count']} | {r['errors']} "
                f"| `{r['model']}` | {r['byok']} | {r['mcp_servers']} | {r['end_status']} |\n"
            )
        
        # Detailed errors
        out.write("\n### Error Details\n\n")
        for r in rows:
            if r["error_msgs"]:
                out.write(f"- **Session `{r['sessionId'][:8]}`** ({r['subcommand']}):\n")
                for msg in r["error_msgs"][:3]:
                    out.write(f"  - {msg[:200]}\n")
                if len(r["error_msgs"]) > 3:
                    out.write(f"  - ... and {len(r['error_msgs'])-3} more\n")

    print("Done!", file=sys.stderr)


def _process_entry(entry_ts, entry_text, session_data, all_session_ids):
    """Extract session info from a single log entry."""
    if not entry_ts:
        return
    
    sids = SESSION_RE.findall(entry_text)
    if not sids:
        return
    
    sid = sids[0]
    all_session_ids.add(sid)
    
    # Parse context JSON
    ctx = parse_json_ctx(entry_text)
    tags = extract_tags(ctx)
    
    if sid not in session_data:
        session_data[sid] = {
            "first_ts": entry_ts,
            "last_ts": entry_ts,
            "subcommands": [],
            "models": [],
            "byok": [],
            "droid_modes": [],
            "error_lines": [],
        }
    
    sd = session_data[sid]
    sd["last_ts"] = entry_ts
    
    subcmd = tags.get("subcommand") or ctx.get("subcommand")
    if subcmd:
        sd["subcommands"].append(subcmd)
    
    model = tags.get("modelId")
    if model:
        sd["models"].append(model)
    
    byok = tags.get("isByok", "")
    if byok:
        sd["byok"].append(byok)
    
    dmode = tags.get("droidMode") or ctx.get("droidMode")
    if dmode:
        sd.setdefault("droid_modes", []).append(dmode)
    
    if "ERROR:" in entry_text:
        sd["error_lines"].append(entry_text[:200])


if __name__ == "__main__":
    main()
