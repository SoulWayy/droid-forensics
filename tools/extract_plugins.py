#!/usr/bin/env python3
"""Extract plugin, settings, and skills events from droid-log-single.log"""

import argparse
import json
import re
import os
from collections import defaultdict, Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def default_logfile():
    return os.environ.get("DROID_LOG", str(REPO / "fixtures" / "sample-droid-log.log"))


LOGFILE = default_logfile()
OUTFILE = str(REPO / "reports" / "subagent-plugins-settings.md")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_log_line(line: str):
    """
    Lines look like:
      [2026-07-07T05:08:45.407Z] INFO: [SettingsService] Initialized ...
    or error lines without timestamp, or stacktrace lines.
    We return (timestamp, level, component, message, context_dict) or None for non-matching.
    """
    # Standard log line: [timestamp] LEVEL: [Component] message | Context: {...}
    m = re.match(
        r'^\[([^\]]+)\]\s+(\w+):\s+(?:\[([^\]]*)\]\s+)?(.*?)(?:\s*\|\s*Context:\s*(\{.*\}))?\s*$',
        line
    )
    if m:
        ts, level, comp, msg, ctx_str = m.groups()
        ctx = {}
        if ctx_str:
            try:
                ctx = json.loads(ctx_str)
            except json.JSONDecodeError:
                pass
        return ts, level, comp or "", msg, ctx
    return None


def fmt_val(val, digits=2):
    """Format a number nicely."""
    if isinstance(val, float):
        return f"{val:.{digits}f}"
    return str(val)


# ---------------------------------------------------------------------------
# Main extraction
# ---------------------------------------------------------------------------

def extract(logfile=LOGFILE, outfile=OUTFILE):
    records = {
        "plugin": {
            "auto_updates": [],          # PluginMarketplaceManager Auto-updating marketplaces
            "missing_marketplaces": [],  # PluginMarketplaceManager Missing marketplaces
            "latencies": {
                "plugin_configured_sync_latency_ms": [],
                "plugin_ensure_installed_for_cwd_latency_ms": [],
            },
            "ensure_counts": {
                "installedMarketplaceCount": [],
                "installedPluginCount": [],
                "missingMarketplaceCount": [],
                "missingPluginCount": [],
            },
            "plugin_loader_errors": 0,
        },
        "settings": {
            "credentials_sources": [],   # Credentials source resolved
            "init_events": [],           # SettingsService Initialized
            "hooks_refresh": 0,          # SettingsService Hooks and custom models refreshed
            "latencies": {
                "cli_startup_settings_init_latency": [],
                "cli_startup_settings_dynamic_config_latency": [],
                "cli_startup_settings_org_latency": [],
            },
            "persist_failures": [],      # Failed to persist settings
            "changes": [],              # SessionController Settings changed
            "session_saves": [],         # Session Saving session settings
            "tui_startup": [],           # tui-startup Settings init completed
        },
        "skills": {
            "skill_loaded_counts": [],
            "custom_droid_loaded_counts": [],
            "conflicted_skills": [],     # Skill conflicts with existing command
            "mcp_registrations": [],     # Registered MCP tool
            "skill_invoked": [],
            "mcp_tools_change": [],      # McpHub Sending toolsChange notification
        },
    }

    line_count = 0
    with open(logfile, "r", errors="replace") as f:
        for line in f:
            line_count += 1
            # PluginLoader errors appear on raw stacktrace lines (no timestamp)
            if 'PluginLoader.ts' in line and 'YAMLException' in line:
                records['plugin']['plugin_loader_errors'] += 1

            # Persist failure error details on stacktrace lines
            if 'Refusing to overwrite malformed settings.json' in line and ': {"path"' in line:
                # This is a stacktrace line with the context JSON
                ctx_match = re.search(r'\| Context: (\{.*\})\s*$', line)
                if ctx_match:
                    try:
                        err_ctx = json.loads(ctx_match.group(1))
                        # Link to the most recent persist failure without error
                        for pf in reversed(records['settings']['persist_failures']):
                            if pf['error'] is None:
                                pf['path'] = err_ctx.get('path')
                                pf['error'] = err_ctx.get('error')
                                break
                    except json.JSONDecodeError:
                        pass

            parsed = parse_log_line(line)
            if not parsed:
                continue
            ts, level, comp, msg, ctx = parsed

            # ---------------------------------------------------------------
            # PLUGIN
            # ---------------------------------------------------------------
            if comp == "PluginMarketplaceManager":
                if "Auto-updating marketplaces" in msg:
                    records["plugin"]["auto_updates"].append({"ts": ts, "ctx": ctx})
                elif "Missing marketplaces" in msg:
                    records["plugin"]["missing_marketplaces"].append({"ts": ts, "ctx": ctx})

            # Plugin latency metrics (metric name is in 'comp' due to regex grouping)
            if comp == "metrics_log_plugin_configured_sync_latency_ms":
                rec = {"ts": ts, "value": ctx.get("value"), "status": ctx.get("status")}
                records["plugin"]["latencies"]["plugin_configured_sync_latency_ms"].append(rec)
                for k in ("installedMarketplaceCount", "installedPluginCount",
                          "missingMarketplaceCount", "missingPluginCount"):
                    if k in ctx:
                        records["plugin"]["ensure_counts"][k].append(ctx[k])

            if comp == "metrics_log_plugin_ensure_installed_for_cwd_latency_ms":
                rec = {"ts": ts, "value": ctx.get("value"), "status": ctx.get("status"),
                       "installType": ctx.get("installType")}
                records["plugin"]["latencies"]["plugin_ensure_installed_for_cwd_latency_ms"].append(rec)
                for k in ("installedMarketplaceCount", "installedPluginCount",
                          "missingMarketplaceCount", "missingPluginCount"):
                    if k in ctx:
                        records["plugin"]["ensure_counts"][k].append(ctx[k])



            # ---------------------------------------------------------------
            # SETTINGS
            # ---------------------------------------------------------------
            if comp == "SettingsService":
                if "Initialized with hierarchical settings" in msg:
                    records["settings"]["init_events"].append({"ts": ts})
                elif "Hooks and custom models refreshed" in msg:
                    records["settings"]["hooks_refresh"] += 1

            if comp == "metrics_log_cli_startup_settings_init_latency":
                records["settings"]["latencies"]["cli_startup_settings_init_latency"].append(
                    {"ts": ts, "value": ctx.get("value"), "outcome": ctx.get("outcome")}
                )

            if comp == "metrics_log_cli_startup_settings_dynamic_config_latency":
                records["settings"]["latencies"]["cli_startup_settings_dynamic_config_latency"].append(
                    {"ts": ts, "value": ctx.get("value")}
                )

            if comp == "metrics_log_cli_startup_settings_org_latency":
                records["settings"]["latencies"]["cli_startup_settings_org_latency"].append(
                    {"ts": ts, "value": ctx.get("value")}
                )

            if "Credentials source resolved" in msg:
                records["settings"]["credentials_sources"].append(ctx.get("source"))

            if 'Failed to persist settings' in msg:
                pf = {'ts': ts, 'path': ctx.get('path'), 'error': None}
                ctx_error = ctx.get('error')
                if ctx_error:
                    pf['error'] = ctx_error
                records['settings']['persist_failures'].append(pf)

            if comp == "SessionController" and "Settings changed" in msg:
                records["settings"]["changes"].append({
                    "ts": ts,
                    "value": ctx.get("value", {}),
                })

            if "Saving session settings" in msg:
                records["settings"]["session_saves"].append({
                    "ts": ts,
                    "path": ctx.get("path"),
                })

            if comp == "tui-startup" and "Settings init completed" in msg:
                records["settings"]["tui_startup"].append({
                    "ts": ts,
                    "durationMs": ctx.get("durationMs"),
                })

            # ---------------------------------------------------------------
            # SKILLS
            # ---------------------------------------------------------------
            if comp == "metrics_log_skill_loaded_count":
                records["skills"]["skill_loaded_counts"].append({
                    "ts": ts,
                    "value": ctx.get("value"),
                    "context": ctx.get("context"),
                })

            if comp == "metrics_log_custom_droid_loaded_count":
                records["skills"]["custom_droid_loaded_counts"].append({
                    "ts": ts,
                    "value": ctx.get("value"),
                })

            if comp == "metrics_log_skill_invoked_count":
                records["skills"]["skill_invoked"].append({
                    "ts": ts,
                    "skillName": ctx.get("skillName"),
                    "location": ctx.get("location"),
                    "activationSource": ctx.get("activationSource"),
                })

            if "Skill conflicts with existing command, skipping registration" in msg:
                records["skills"]["conflicted_skills"].append({
                    "ts": ts,
                    "name": ctx.get("name"),
                })

            if msg == "Registered MCP tool" or "Registered MCP tool" in msg:
                tool_id = ctx.get("toolId", "")
                # Extract prefix (mcp_xxx...)
                # Extract prefix like mcp_linear, mcp_notion, mcp_playwright
                parts = tool_id.split("_")
                prefix = "_".join(parts[:2]) if len(parts) >= 2 else tool_id
                records["skills"]["mcp_registrations"].append({
                    "ts": ts,
                    "toolId": tool_id,
                    "prefix": prefix,
                })

            if comp == "McpHub" and "Sending toolsChange notification" in msg:
                records["skills"]["mcp_tools_change"].append({
                    "ts": ts,
                    "toolCount": ctx.get("toolCount"),
                    "toolNames": ctx.get("toolNames", []),
                })

    return records, line_count


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def write_report(records, line_count, logfile=LOGFILE, outfile=OUTFILE):
    lines = []
    w = lines.append

    w("# Droid Log Extract: Plugins, Settings, Skills\n")
    w(f"\nParsed {line_count} lines from `{logfile}`.\n")

    # ===================================================================
    # 1. PLUGINS
    # ===================================================================
    w("\n## 1. Plugins\n")

    p = records["plugin"]

    # Auto-updates
    w(f"\n### PluginMarketplaceManager Auto-updates\n")
    w(f"- Count: {len(p['auto_updates'])}\n")
    if p["auto_updates"]:
        w(f"- First: `{p['auto_updates'][0]['ts']}`\n")
        w(f"- Last:  `{p['auto_updates'][-1]['ts']}`\n")
        cnts = [c['ctx'].get("count") for c in p["auto_updates"] if c['ctx'].get("count") is not None]
        if cnts:
            w(f"- Count values: {cnts}\n")

    # Missing marketplaces
    w(f"\n### PluginMarketplaceManager Missing Marketplaces\n")
    w(f"- Count: {len(p['missing_marketplaces'])}\n")
    if p["missing_marketplaces"]:
        mc = [m['ctx'].get("count") for m in p["missing_marketplaces"] if m['ctx'].get("count") is not None]
        if mc:
            w(f"- Missing count values: {mc}\n")

    # PluginLoader errors
    w(f"\n### PluginLoader Errors (YAML parse failures)\n")
    w(f"- Total: {p['plugin_loader_errors']}\n")

    # Latencies
    w(f"\n### Latency Metrics\n")
    for metric_name, items in p["latencies"].items():
        w(f"\n#### `{metric_name}`\n")
        w(f"- Occurrences: {len(items)}\n")
        if items:
            vals = [i["value"] for i in items if i.get("value") is not None]
            if vals:
                w(f"- Values (ms): min={fmt_val(min(vals))}, max={fmt_val(max(vals))}, "
                  f"avg={fmt_val(sum(vals)/len(vals))}\n")
                w(f"- Raw values: {[fmt_val(v) for v in vals]}\n")

    # Ensure counts
    w(f"\n### Plugin Ensure-Installed Counts\n")
    for k, vals in p["ensure_counts"].items():
        w(f"- `{k}` occurrences: {len(vals)}, values: {vals}\n")

    # ===================================================================
    # 2. SETTINGS
    # ===================================================================
    w("\n## 2. Settings\n")

    s = records["settings"]

    w(f"\n### Credentials Source Resolved\n")
    src_counter = Counter(s["credentials_sources"])
    w(f"- Total: {len(s['credentials_sources'])}\n")
    for src, cnt in src_counter.most_common():
        w(f"  - `{src}`: {cnt}\n")

    w(f"\n### SettingsService Initialization\n")
    w(f"- Count: {len(s['init_events'])}\n")
    for ev in s["init_events"]:
        w(f"  - `{ev['ts']}`\n")

    w(f"\n### SettingsService Hooks Refresh\n")
    w(f"- Count: {s['hooks_refresh']}\n")

    w(f"\n### Settings Init Latency (`cli_startup_settings_init_latency`)\n")
    items = s["latencies"]["cli_startup_settings_init_latency"]
    w(f"- Occurrences: {len(items)}\n")
    if items:
        vals = [i["value"] for i in items if i.get("value") is not None]
        if vals:
            w(f"- Values (ms): min={fmt_val(min(vals))}, max={fmt_val(max(vals))}, "
              f"avg={fmt_val(sum(vals)/len(vals))}\n")

    w(f"\n### Dynamic Config Latency (`cli_startup_settings_dynamic_config_latency`)\n")
    items = s["latencies"]["cli_startup_settings_dynamic_config_latency"]
    w(f"- Occurrences: {len(items)}\n")
    if items:
        vals = [i["value"] for i in items if i.get("value") is not None]
        if vals:
            w(f"- Values (ms): min={fmt_val(min(vals))}, max={fmt_val(max(vals))}, "
              f"avg={fmt_val(sum(vals)/len(vals))}\n")

    w(f"\n### Org Latency (`cli_startup_settings_org_latency`)\n")
    items = s["latencies"]["cli_startup_settings_org_latency"]
    w(f"- Occurrences: {len(items)}\n")
    if items:
        vals = [i["value"] for i in items if i.get("value") is not None]
        if vals:
            w(f"- Values (ms): min={fmt_val(min(vals))}, max={fmt_val(max(vals))}, "
              f"avg={fmt_val(sum(vals)/len(vals))}\n")

    # Persist failures
    w(f"\n### Settings Persist Failures\n")
    w(f"- Total: {len(s['persist_failures'])}\n")
    if s["persist_failures"]:
        w(f"- First: `{s['persist_failures'][0]['ts']}`\n")
        w(f"- Last:  `{s['persist_failures'][-1]['ts']}`\n")
        w(f"- Error message: `{s['persist_failures'][0].get('error','')}`\n")
        paths = set(f.get("path","") for f in s["persist_failures"])
        w(f"- Paths affected: {len(paths)} unique\n")
        for pth in sorted(paths):
            w(f"  - `{pth}`\n")

    # TUI startup
    w(f"\n### TUI Startup Settings Init\n")
    for ev in s["tui_startup"]:
        w(f"- `{ev['ts']}` duration={ev.get('durationMs')}ms\n")

    # Settings changes
    w(f"\n### SessionController Settings Changes\n")
    w(f"- Total: {len(s['changes'])}\n")
    # Group by changed keys
    change_keys = Counter()
    for ch in s["changes"]:
        val = ch.get("value", {})
        for k in val.keys():
            change_keys[k] += 1
    if change_keys:
        w(f"- Changed keys distribution:\n")
        for k, cnt in change_keys.most_common():
            w(f"  - `{k}`: {cnt} times\n")
    # Show unique value patterns
    w(f"\n#### Settings Change Detail (first 10)\n")
    for ch in s["changes"][:10]:
        w(f"- `{ch['ts']}`: `{ch['value']}`\n")
    if len(s["changes"]) > 10:
        w(f"- ... and {len(s['changes']) - 10} more\n")

    # Session saves
    w(f"\n### Session Settings Saves\n")
    w(f"- Total: {len(s['session_saves'])}\n")
    if s["session_saves"]:
        paths = set(ss.get("path","") for ss in s["session_saves"])
        w(f"- Unique paths: {len(paths)}\n")

    # ===================================================================
    # 3. SKILLS
    # ===================================================================
    w("\n## 3. Skills\n")

    sk = records["skills"]

    w(f"\n### Skill Loaded Count\n")
    cnts = [c["value"] for c in sk["skill_loaded_counts"] if c.get("value") is not None]
    w(f"- Occurrences: {len(cnts)}\n")
    if cnts:
        w(f"- Values: {set(cnts)}\n")
        w(f"- All: {cnts}\n")

    w(f"\n### Custom Droid Loaded Count\n")
    dc = [c["value"] for c in sk["custom_droid_loaded_counts"] if c.get("value") is not None]
    w(f"- Occurrences: {len(dc)}\n")
    if dc:
        w(f"- Values: {set(dc)}\n")
        w(f"- All: {dc}\n")

    w(f"\n### Conflicted Skills (skipped registration)\n")
    w(f"- Total: {len(sk['conflicted_skills'])}\n")
    conflict_names = Counter(c["name"] for c in sk["conflicted_skills"] if c.get("name"))
    if conflict_names:
        w(f"- By name:\n")
        for name, cnt in conflict_names.most_common():
            w(f"  - `{name}`: {cnt}\n")

    w(f"\n### MCP Tool Registrations\n")
    w(f"- Total: {len(sk['mcp_registrations'])}\n")
    # Group by prefix
    prefix_counter = Counter(r["prefix"] for r in sk["mcp_registrations"])
    w(f"- By skill/MCP prefix:\n")
    for pref, cnt in prefix_counter.most_common():
        w(f"  - `{pref}`: {cnt} tools\n")

    # Show unique tool IDs
    unique_tools = sorted(set(r["toolId"] for r in sk["mcp_registrations"]))
    w(f"- Unique tool IDs ({len(unique_tools)}):\n")
    for tid in unique_tools:
        w(f"  - `{tid}`\n")

    w(f"\n### Skill Invocations\n")
    w(f"- Total: {len(sk['skill_invoked'])}\n")
    if sk["skill_invoked"]:
        inv_names = Counter(ir["skillName"] for ir in sk["skill_invoked"] if ir.get("skillName"))
        for name, cnt in inv_names.most_common():
            w(f"  - `{name}`: {cnt}\n")

    w(f"\n### McpHub ToolsChange Notifications\n")
    for tc in sk["mcp_tools_change"]:
        w(f"- `{tc['ts']}`: {tc.get('toolCount')} tools\n")
    w(f"- Total notifications: {len(sk['mcp_tools_change'])}\n")

    # Write file
    os.makedirs(os.path.dirname(outfile) or ".", exist_ok=True)
    with open(outfile, "w") as f:
        f.writelines(lines)
    print(f"Report written to {outfile}")
    print(f"  Lines parsed: {line_count}")

    # Print summary to stdout
    print(f"\n--- Quick Summary ---")
    print(f"Plugins: {len(p['auto_updates'])} auto-updates, {p['plugin_loader_errors']} loader errors")
    print(f"  configured_sync_latency: {len(p['latencies']['plugin_configured_sync_latency_ms'])} samples")
    print(f"  ensure_installed_latency: {len(p['latencies']['plugin_ensure_installed_for_cwd_latency_ms'])} samples")
    print(f"Settings: {len(s['init_events'])} inits, {len(s['persist_failures'])} persist failures, {len(s['changes'])} changes")
    print(f"Skills: {len(cnts)} skill_loaded (value={set(cnts) if cnts else 'N/A'}), {len(sk['conflicted_skills'])} conflicts")
    print(f"  MCP registrations: {len(sk['mcp_registrations'])} from {len(prefix_counter)} prefixes")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Extract plugin/settings/skills events from a droid log.")
    ap.add_argument("--log", default=LOGFILE, help="Path to droid log file")
    ap.add_argument("--out", default=OUTFILE, help="Output markdown path")
    a = ap.parse_args()
    records, line_count = extract(logfile=a.log)
    write_report(records, line_count, logfile=a.log, outfile=a.out)
