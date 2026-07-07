#!/usr/bin/env python3
"""Parse droid-log-single.log and extract:
  - Plugin loads (name, status, latency)
  - Marketplace updates (auto-update events, missing count)
  - i18next Locize promo timestamps + reinit count (if any)
  - Settings sources + changes (init, latencies, errors, refreshes)
  - Skills loaded (skill_loaded_count, conflict warnings, registration errors)
Output: subagent-plugins-settings.md (read-only extraction, no modification)
"""

import argparse
import os
import re
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def default_log():
    return os.environ.get("DROID_LOG", str(REPO / "fixtures" / "sample-droid-log.log"))


def parse_args():
    p = argparse.ArgumentParser(description="Extract plugin/settings/skills events from a droid log.")
    p.add_argument("--log", default=default_log(), help="Path to droid log file")
    p.add_argument("--out", default=str(REPO / "reports" / "subagent-plugins-settings.md"),
                   help="Output markdown path")
    return p.parse_args()


LOG_PATH = default_log()
OUT_PATH = str(REPO / "reports" / "subagent-plugins-settings.md")

# ---- helpers ----

def parse_iso(ts: str) -> str:
    """Format ISO timestamp to readable datetime."""
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ts

def try_parse_json(line: str):
    """Extract JSON Context dict from a log line that contains '| Context: '"""
    m = re.search(r'\| Context:\s*(\{.*\})\s*$', line)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            return None
    return None

def extract_ts(line: str):
    """Extract ISO timestamp from start of log line."""
    m = re.match(r'\[([^\]]+)\]\s+(INFO|WARN|ERROR):', line)
    if m:
        return m.group(1)
    return None

# ---- main extraction ----

def main():
    with open(LOG_PATH, "r", errors="replace") as f:
        lines = f.readlines()

    # Accumulators
    plugin_loads = []               # (ts, name, status, latency_ms, details)
    marketplace_auto_updates = []   # (ts, count)
    marketplace_missing = []        # (ts, count)
    auto_installed_plugins = []     # (ts, name, state)
    i18next_events = []             # (ts, msg) -- empty expected
    settings_init = []              # (ts, outcome, duration_ms)
    settings_init_details = []      # (ts, msg)
    settings_errors = []            # (ts, error)
    settings_refreshes = []         # (ts)
    settings_latencies = defaultdict(list)  # metric_name -> [(ts, value)]
    skill_loaded_counts = []        # (ts, context, count)
    skill_conflicts = []            # (ts, name)
    skill_errors = []               # (ts, error)
    mcp_tools_registered = []       # (ts, tool_id)

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        ts = extract_ts(line)
        ctx = try_parse_json(line)

        # --- Plugin loads ---
        if "metrics_log_plugin_configured_sync_latency_ms" in line and ctx:
            plugin_loads.append((
                ts, "plugin_configured_sync", ctx.get("status"),
                ctx.get("value"), ctx
            ))
        elif "metrics_log_plugin_ensure_installed_for_cwd_latency_ms" in line and ctx:
            plugin_loads.append((
                ts, "plugin_ensure_installed", ctx.get("status"),
                ctx.get("value"),
                {"installedMarketplaceCount": ctx.get("installedMarketplaceCount"),
                 "installedPluginCount": ctx.get("installedPluginCount"),
                 "installType": ctx.get("installType")}
            ))
        elif "Auto-installed plugin" in line and ctx:
            auto_installed_plugins.append((
                ts, ctx.get("name"), ctx.get("state")
            ))

        # --- Marketplace updates ---
        if "PluginMarketplaceManager] Auto-updating marketplaces" in line and ctx:
            marketplace_auto_updates.append((ts, ctx.get("count")))
        elif "PluginMarketplaceManager] Missing marketplaces" in line and ctx:
            marketplace_missing.append((ts, ctx.get("count")))

        # --- i18next / Locize ---
        m_i18n = re.search(r'(?i)(i18next|locize|i18n)', line)
        if m_i18n:
            i18next_events.append((ts, line[:200]))

        # --- Settings ---
        if "[SettingsService] Initialized with hierarchical settings" in line:
            settings_init_details.append((ts, "Initialized with hierarchical settings"))
        elif "[tui-startup] Settings init completed" in line and ctx:
            settings_init.append((ts, "success", ctx.get("durationMs")))
        elif "cli_startup_settings_init_latency" in line and ctx:
            settings_init.append((ts, ctx.get("outcome"), ctx.get("value")))
        elif "cli_startup_settings_dynamic_config_latency" in line and ctx:
            settings_latencies["dynamic_config"].append((ts, ctx.get("value")))
        elif "cli_startup_settings_org_latency" in line and ctx:
            settings_latencies["org_latency"].append((ts, ctx.get("value")))
        elif "[SettingsService] Hooks and custom models refreshed" in line:
            settings_refreshes.append(ts)
        elif "Failed to persist settings" in line:
            # error lines follow
            err_ctx = try_parse_json(line)
            if err_ctx:
                settings_errors.append((ts, err_ctx.get("error", str(err_ctx))))
        elif "Refusing to overwrite malformed settings.json" in line and ctx:
            settings_errors.append((ts, f"Malformed settings.json at {ctx.get('path','?')}"))

        # --- Skills ---
        if "metrics_log_skill_loaded_count" in line and ctx:
            skill_loaded_counts.append((
                ts, ctx.get("context"), ctx.get("value")
            ))
        if "Skill conflicts with existing command, skipping registration" in line and ctx:
            skill_conflicts.append((ts, ctx.get("name")))
        if "getUserInvocableSkills" in line or "SkillCommandsLoader" in line:
            err_ctx = try_parse_json(line)
            if err_ctx and "cause" in err_ctx:
                cause = err_ctx["cause"]
                skill_errors.append((ts, cause.get("message", str(cause)[:200])))
        # MCP tool registration lines
        if "Registered MCP tool" in line and ctx:
            tid = ctx.get("toolId")
            if tid:
                mcp_tools_registered.append((ts, tid))

    # ---- Build Markdown report ----
    md = []
    md.append("# Droid Log Analysis: Plugins, Marketplace, i18next, Settings, Skills\n")
    md.append(f"_Extracted from: `{LOG_PATH}`_\n")
    md.append(f"_Lines parsed: {len(lines)}_\n\n")

    # ==========================================
    # 1. Plugin Loads
    # ==========================================
    md.append("## 1. Plugin Loads\n")
    md.append("### Plugin configured sync latency\n")
    syncs = [p for p in plugin_loads if p[1] == "plugin_configured_sync"]
    if syncs:
        md.append("| Timestamp | Status | Latency (ms) |\n")
        md.append("|----------|--------|-------------|\n")
        for ts, name, status, val, _ in syncs:
            md.append(f"| {parse_iso(ts) if ts else '?'} | {status or '?'} | {val or '?'} |\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    md.append("### Plugin ensure_installed for CWD latency\n")
    ensures = [p for p in plugin_loads if p[1] == "plugin_ensure_installed"]
    if ensures:
        md.append("| Timestamp | Status | Latency (ms) | Mktpl Count | Plugin Count |\n")
        md.append("|----------|--------|-------------|-------------|--------------|\n")
        for ts, name, status, val, extra in ensures:
            mkt = extra.get("installedMarketplaceCount", "?") if extra else "?"
            plg = extra.get("installedPluginCount", "?") if extra else "?"
            md.append(f"| {parse_iso(ts) if ts else '?'} | {status or '?'} | {val or '?'} | {mkt} | {plg} |\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    md.append("### Auto-installed Plugins\n")
    if auto_installed_plugins:
        md.append("| Timestamp | Name | State |\n")
        md.append("|----------|------|-------|\n")
        for ts, name, state in auto_installed_plugins:
            md.append(f"| {parse_iso(ts) if ts else '?'} | `{name}` | {state} |\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    md.append("### Plugin Loader Errors (YAMLException)\n")
    plugin_errors = []
    for i, line in enumerate(lines):
        if "PluginLoader.ts" in line and "YAMLException" in line:
            ts = extract_ts(line)
            ctx = try_parse_json(line)
            if ctx and "cause" in ctx:
                plugin_errors.append((ts, ctx["cause"].get("message", "")[:150]))
    if plugin_errors:
        md.append(f"Total: {len(plugin_errors)} occurrences\n")
        md.append("| Sample Timestamp | Error Snippet |\n")
        md.append("|-----------------|---------------|\n")
        for ts, msg in plugin_errors[:5]:
            md.append(f"| {parse_iso(ts) if ts else '?'} | `{msg}` |\n")
        if len(plugin_errors) > 5:
            md.append(f"_... and {len(plugin_errors)-5} more occurrences_\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    # ==========================================
    # 2. Marketplace Updates
    # ==========================================
    md.append("## 2. Marketplace Updates\n")
    md.append(f"### Auto-update events: {len(marketplace_auto_updates)}\n")
    if marketplace_auto_updates:
        md.append("| Timestamp | Count |\n")
        md.append("|----------|-------|\n")
        for ts, count in marketplace_auto_updates:
            md.append(f"| {parse_iso(ts) if ts else '?'} | {count} |\n")
    md.append("\n")

    md.append(f"### Missing marketplace checks: {len(marketplace_missing)}\n")
    zero = sum(1 for _, c in marketplace_missing if c == 0)
    nonzero = sum(1 for _, c in marketplace_missing if c != 0)
    md.append(f"- Zero missing (all OK): {zero}\n")
    md.append(f"- Missing found: {nonzero}\n")
    if marketplace_missing:
        md.append("\nFirst and last:\n")
        md.append(f"- First: {parse_iso(marketplace_missing[0][0])} (count={marketplace_missing[0][1]})\n")
        md.append(f"- Last:  {parse_iso(marketplace_missing[-1][0])} (count={marketplace_missing[-1][1]})\n")
    md.append("\n")

    # ==========================================
    # 3. i18next / Locize
    # ==========================================
    md.append("## 3. i18next / Locize Promo\n")
    if i18next_events:
        md.append(f"Found {len(i18next_events)} i18n-related lines:\n")
        md.append("| Timestamp | Snippet |\n")
        md.append("|----------|--------|\n")
        for ts, snippet in i18next_events[:10]:
            md.append(f"| {parse_iso(ts) if ts else '?'} | `{snippet}` |\n")
        if len(i18next_events) > 10:
            md.append(f"_... and {len(i18next_events)-10} more_\n")
    else:
        md.append("**No i18next / Locize references found in the log.**\n")
        md.append("The log does not contain any `i18next`, `locize`, or `i18n` mentions.\n")
    md.append("\n")

    # ==========================================
    # 4. Settings Sources + Changes
    # ==========================================
    md.append("## 4. Settings Sources & Changes\n")

    md.append("### Settings Initialization\n")
    md.append(f"- Hierarchical settings init: {len(settings_init_details)} time(s)\n")
    md.append(f"- Setting init completion events: {len(settings_init)}\n")
    if settings_init:
        md.append("| Timestamp | Outcome | Duration |\n")
        md.append("|----------|--------|----------|\n")
        for ts, outcome, dur in settings_init:
            md.append(f"| {parse_iso(ts) if ts else '?'} | {outcome} | {dur} ms |\n")
    md.append("\n")

    md.append("### Settings Hooks / Custom Models Refreshes\n")
    md.append(f"Total: {len(settings_refreshes)}\n")
    if settings_refreshes:
        for ts in settings_refreshes[:10]:
            md.append(f"- {parse_iso(ts)}\n")
        if len(settings_refreshes) > 10:
            md.append(f"_... and {len(settings_refreshes)-10} more_\n")
    md.append("\n")

    md.append("### Settings Latency Metrics\n")
    for metric, entries in sorted(settings_latencies.items()):
        md.append(f"- **{metric}**: {len(entries)} measurements")
        if entries:
            vals = [e[1] for e in entries if e[1] is not None]
            if vals:
                md.append(f" (min={min(vals):.1f}ms, max={max(vals):.1f}ms, avg={sum(vals)/len(vals):.1f}ms)")
        md.append("\n")
    md.append("\n")

    md.append("### Settings Persistence Errors\n")
    if settings_errors:
        md.append(f"Total: {len(settings_errors)}\n")
        md.append("| Timestamp | Error |\n")
        md.append("|----------|-------|\n")
        for ts, err in settings_errors:
            md.append(f"| {parse_iso(ts) if ts else '?'} | `{err}` |\n")
    else:
        md.append("_(no persistence errors)_\n")
    md.append("\n")

    md.append("### Session Settings Saves\n")
    session_saves = []
    for line in lines:
        if "Session] Saving session settings" in line:
            ts = extract_ts(line)
            ctx = try_parse_json(line)
            if ctx:
                session_saves.append((ts, ctx.get("path", ""), ctx.get("sessionId", "")))
    if session_saves:
        md.append(f"Total: {len(session_saves)}\n")
        md.append("| Timestamp | Path | Session ID |\n")
        md.append("|----------|------|------------|\n")
        for ts, path, sid in session_saves[:5]:
            md.append(f"| {parse_iso(ts) if ts else '?'} | `{path}` | `{sid}` |\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    # ==========================================
    # 5. Skills Loaded
    # ==========================================
    md.append("## 5. Skills Loaded\n")

    md.append("### Skill Loaded Count Metrics\n")
    if skill_loaded_counts:
        md.append(f"Total measurements: {len(skill_loaded_counts)}\n")
        # Group by context
        by_ctx = defaultdict(list)
        for ts, ctx, val in skill_loaded_counts:
            by_ctx[ctx].append(val)
        for ctx, vals in sorted(by_ctx.items()):
            unique = set(vals)
            md.append(f"- Context `{ctx}`: count={unique.pop() if len(unique)==1 else unique}, measured {len(vals)} times\n")
    else:
        md.append("_(no skill_loaded_count metrics found)_\n")
    md.append("\n")

    md.append("### Skill Conflicts (Skipped Registrations)\n")
    if skill_conflicts:
        md.append(f"Total: {len(skill_conflicts)}\n")
        md.append("| Timestamp | Skill Name |\n")
        md.append("|----------|------------|\n")
        for ts, name in skill_conflicts:
            md.append(f"| {parse_iso(ts) if ts else '?'} | `{name}` |\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    md.append("### Skill Registration Errors\n")
    if skill_errors:
        md.append(f"Total: {len(skill_errors)}\n")
        md.append("| Timestamp | Error |\n")
        md.append("|----------|-------|\n")
        for ts, err in skill_errors[:5]:
            md.append(f"| {parse_iso(ts) if ts else '?'} | `{err}` |\n")
        if len(skill_errors) > 5:
            md.append(f"_... and {len(skill_errors)-5} more_\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    md.append("### MCP Tools Registered\n")
    # Summarize by server prefix
    server_tools = defaultdict(list)
    for ts, tid in mcp_tools_registered:
        server = tid.split("___")[0] if "___" in tid else tid.split("_")[1] if tid.startswith("mcp_") else "other"
        server_tools[server].append(tid)
    if server_tools:
        for server, tools in sorted(server_tools.items()):
            tool_names = sorted(set((tid.split('___')[1] if '___' in tid else tid) for tid in tools))
            md.append(f"- **{server}**: {len(tools)} tools ({', '.join(tool_names[:5])}...)\n")
        md.append(f"\nTotal registered: {len(mcp_tools_registered)} tool registrations\n")
    else:
        md.append("_(none found)_\n")
    md.append("\n")

    md.append("---\n")
    md.append(f"_Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_\n")

    with open(OUT_PATH, "w") as f:
        f.writelines(md)

    print(f"Written to {OUT_PATH} ({len(md)} lines)")

if __name__ == "__main__":
    args = parse_args()
    LOG_PATH = args.log
    OUT_PATH = args.out
    os.makedirs(os.path.dirname(OUT_PATH) or ".", exist_ok=True)
    main()
