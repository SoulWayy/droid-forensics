import os
import sys

SOURCE_FILE = "/home/jan/Droid-onderzoek-triage/droid-full-source.js"
OUT_DIR = "/home/jan/Droid-onderzoek-triage/extracted-source/core-systems"

os.makedirs(OUT_DIR, exist_ok=True)

def extract_chunk(name, offset, size, context=""):
    out_path = os.path.join(OUT_DIR, f"{name}.js")
    with open(SOURCE_FILE, 'rb') as f:
        # Go a bit before the offset to catch the start of the function/context
        start = max(0, offset - 2000)
        f.seek(start)
        chunk = f.read(size + 4000)
        text = chunk.decode('utf-8', errors='replace')
        
        with open(out_path, 'w', encoding='utf-8') as out:
            out.write(f"// ==========================================\n")
            out.write(f"// EXTRACTED COMPONENT: {name}\n")
            out.write(f"// CONTEXT: {context}\n")
            out.write(f"// RAW BYTE OFFSET: {offset}\n")
            out.write(f"// ==========================================\n\n")
            out.write(text)
    print(f"Extracted {name}.js ({len(text)} bytes)")

# We extracted these offsets in previous steps:
extract_chunk("1_feature_flags_registry", 445457, 5000, "Feature flags default values (incremental rendering, composable daemon)")
extract_chunk("2_feature_flags_loader", 753700, 5000, "Logic that fetches flags from .factory/cache/feature-flags.json and API")
extract_chunk("3_tui_incremental_mount", 17552300, 5000, "Main App Root mounting, Ink initialization, and incremental render checks")
extract_chunk("4_daemon_core_lv0", 17332600, 3000, "lv0 function: calculates if incremental rendering should be forced or disabled")

print("Extraction complete. Bypassed subagents successfully.")
