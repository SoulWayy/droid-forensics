#!/usr/bin/env python3
"""Extract MCP, tool execution, sandbox, permission, and related code from droid-full-source.js"""
import argparse
import os
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

SOURCE = str(REPO / "droid-full-source.js")
OUTPUT = str(REPO / "extracted-source" / "mcp-tools-sandbox.js")
CHUNK = 5120  # 5KB on each side = ~10KB per region

# Curated offsets grouped by topic, selecting the most interesting clusters
REGIONS = {
    # ===== MCP TOOL DEFINITIONS =====
    "MCP Tool Types & McpTool definition": [159889],
    "MCP Tool registration (mcp_tool + mcp_server cluster)": [206396, 207378, 207770, 208444],
    "MCP config / mcp string refs": [418077, 422546],
    "MCP Tool + Sandbox + Mission combined type defs": [448684, 448742, 448784, 449664],

    # ===== McpServer IMPLEMENTATION =====
    "McpServer class definition (early)": [985237],
    "McpServer class methods": [1155094],
    "McpServer handler / connection": [1378046],
    "McpServer lifecycle": [1696115],
    "McpServer transport": [1961245],
    "McpServer integration cluster": [2378140, 2379199, 2380007, 2381432, 2382602, 2383164],
    "McpServer late-stage (12M region)": [12116058, 12119517, 12172614, 12174199],
    "McpServer final cluster (16M)": [16929607, 16932044, 16933316, 16934016, 16935991],
    "McpServer 17M cluster": [17281535],
    "McpServer 25M (final?)": [25437820],

    # ===== mcp_server + mcp_tool (800K region) =====
    "mcp_server/mcp_tool 800K cluster": [800428, 800798, 800937, 801028],
    "mcp_server/mcp_tool 810K cluster": [810636, 811050, 811398, 811639],
    "McpTool 1.1M": [1112610],

    # ===== SANDBOX =====
    "Sandbox type definition": [159910],
    "Sandbox config/setup (431K)": [431975],
    "Sandbox + runner (438-439K)": [438782, 439409],
    "Sandbox class (449K)": [449664, 449746],
    "Sandbox (1028K cluster)": [1028869],
    "Sandbox (2356K cluster)": [2354987, 2356800],
    "Sandbox (2501K)": [2501229, 2501690],
    "Sandbox (2542K)": [2542044],
    "Sandbox (2866K cluster)": [2866770, 2867161, 2867920],

    # ===== TOOL EXECUTION =====
    "executeTool (1063K)": [1063958],
    "toolExecution (1082K)": [1082149],
    "toolExecution (1113K)": [1113696],
    "executeTool (1245K)": [1245493],
    "toolExecution (1266K)": [1266719],
    "toolExecution (1303K)": [1303117],
    "executeTool (1532K)": [1532158],
    "toolExecution (1567K)": [1567630],
    "toolExecution (8560K)": [8560882],
    "toolExecution (8860K cluster)": [8860540, 8862243, 8862521, 8863838],
    "toolExecution (8866K cluster)": [8866977, 8868668, 8870935, 8874045],
    "toolExecution (11811K cluster)": [11811583, 11812643, 11816138, 11817712],
    "toolExecution (11818K cluster)": [11818530, 11819889, 11820728, 11821817],
    "toolExecution (11871K)": [11871666],
    "toolExecution (11916K cluster)": [11916401, 11918793, 11920848],
    "toolExecution (11970K)": [11970656, 11972844],
    "toolExecution (16529K)": [16529032, 16531652],

    # ===== PERMISSIONS / ALLOW-DENY LIST =====
    "DenyList type def (160K)": [160092],
    "Permission handling (967K cluster)": [966458, 967747, 967932, 968018],
    "Permission (977K)": [977591],
    "Permission (987K)": [987312],
    "Permission (1007K)": [1007148],
    "Permission (1009K)": [1009903],
    "AllowList/DenyList (1038K)": [1038879],
    "allowedTools (1092K)": [1092998],
    "Permission cluster (1103-1106K)": [1103245, 1104263, 1105616, 1105905, 1106233],
    "Permission cluster (1109K)": [1109274, 1109563, 1109802, 1110068],
    "AllowList/DenyList (8509K cluster)": [8509135, 8509389, 8509763, 8510231],

    # ===== COMPUTER / SNAPSHOT =====
    "Computer tool (164-167K)": [164413, 165165, 165471, 166667, 167282],
    "Computer tool (196K)": [196214, 196399],
    "Computer + snapshot (445K)": [445153, 445578, 445704],
    "Computer + snapshot (449K)": [449897],
    "Computer (812K)": [812284, 812670, 812843],
    "Computer (818K)": [818782, 818999, 819268],
    "Computer (955K cluster)": [955220, 955377, 955615, 956209],

    # ===== MISSION =====
    "Mission type def (159K)": [159796],
    "Mission cluster (162K)": [162449],
    "Mission (184K)": [184992],
    "Mission (194K)": [194290],
    "Mission (200K)": [200900],
    "Mission (417-424K)": [417584, 423444, 424703],
    "Mission (434-439K)": [434967, 435461, 439246],
    "Mission (834K)": [834342],
    "Mission (862K)": [862631],
    "Mission (978K)": [978164],
    "Mission (984K)": [984085],

    # ===== SLASH COMMANDS =====
    "SlashCommand (2240K)": [2240109],
    "slash_command (7519K)": [7519460],
    "slash_command (7529K)": [7529873],
    "SlashCommand (16725K)": [16725291],
    "SlashCommand (16739K)": [16739531],
    "SlashCommand (16778-16781K)": [16778040, 16779677, 16780515, 16781383],
    "slash_command (16886K)": [16886254],
    "SlashCommand (17334K)": [17334195],
    "SlashCommand (17515K)": [17515800],
    "slashCommand (25322K)": [25322349],

    # ===== PLUGINS =====
    "Plugin (431K)": [431809],
    "Plugin cluster (979K)": [979491, 979646, 979870, 980082],
    "Plugin cluster (1048-1056K)": [1048719, 1049432, 1052567, 1053199, 1053842, 1054655, 1055337, 1055776],
    "Plugin (1092K)": [1092826],
    "Plugin cluster (1148K)": [1148436, 1148870, 1149105],
    "Plugin cluster (1228-1236K)": [1228508, 1232745, 1233434, 1235053, 1235804, 1236306],
    "Plugin (1278K)": [1278889],
    "Plugin cluster (1365K)": [1365074, 1365232, 1366111, 1366617],
}

def extract(source=SOURCE, output=OUTPUT):
    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    filesize = os.path.getsize(source)
    
    # Merge overlapping regions
    all_ranges = []
    for label, offsets in REGIONS.items():
        for off in offsets:
            start = max(0, off - CHUNK)
            end = min(filesize, off + CHUNK)
            all_ranges.append((start, end, label, off))
    
    # Sort by start offset
    all_ranges.sort(key=lambda x: x[0])
    
    # Merge overlapping/adjacent ranges (keep all labels)
    merged = []
    for start, end, label, off in all_ranges:
        if merged and start <= merged[-1][1] + 200:  # merge if within 200 bytes
            prev_start, prev_end, prev_labels = merged[-1]
            merged[-1] = (prev_start, max(prev_end, end), prev_labels | {label})
        else:
            merged.append((start, end, {label}))
    
    print(f"Source file: {filesize:,} bytes")
    print(f"Total regions before merge: {len(all_ranges)}")
    print(f"Merged regions: {len(merged)}")
    
    total_bytes = 0
    with open(source, 'rb') as src, open(output, 'w', encoding='utf-8', errors='replace') as out:
        out.write("// ============================================================\n")
        out.write("// EXTRACTED: MCP, Tool Execution, Sandbox, Permissions, Computer,\n")
        out.write("//            Mission, SlashCommand, Plugin systems\n")
        out.write(f"// Source: {source}\n")
        out.write(f"// Source size: {filesize:,} bytes\n")
        out.write(f"// Regions extracted: {len(merged)} (merged from {len(all_ranges)} raw)\n")
        out.write("// ============================================================\n\n")
        
        for i, (start, end, labels) in enumerate(merged):
            size = end - start
            total_bytes += size
            
            src.seek(start)
            raw = src.read(size)
            text = raw.decode('utf-8', errors='replace')
            
            out.write(f"\n// {'='*80}\n")
            out.write(f"// REGION {i+1}/{len(merged)}: bytes {start:,} - {end:,} ({size:,} bytes)\n")
            for lbl in sorted(labels):
                out.write(f"//   [{lbl}]\n")
            out.write(f"// {'='*80}\n\n")
            out.write(text)
            out.write("\n")
        
        out.write(f"\n// {'='*80}\n")
        out.write(f"// END OF EXTRACTION\n")
        out.write(f"// Total bytes extracted: {total_bytes:,}\n")
        out.write(f"// {'='*80}\n")
    
    output_size = os.path.getsize(output)
    print(f"Total bytes extracted: {total_bytes:,}")
    print(f"Output file: {output} ({output_size:,} bytes)")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Extract MCP/tool/sandbox code from a droid source bundle.")
    ap.add_argument("--source", default=SOURCE, help="Path to full droid source bundle")
    ap.add_argument("--out", default=OUTPUT, help="Output path for extracted code")
    a = ap.parse_args()
    extract(source=a.source, output=a.out)
