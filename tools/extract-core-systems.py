import argparse
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def parse_args():
    p = argparse.ArgumentParser(description="Extract core-system chunks from a full droid source bundle.")
    p.add_argument("--source", default=str(REPO / "droid-full-source.js"),
                   help="Path to the full droid source bundle")
    p.add_argument("--out", default=str(REPO / "extracted-source" / "core-systems"),
                   help="Output directory for extracted chunks")
    return p.parse_args()


def extract_chunk(source_file, out_dir, name, offset, size, context=""):
    out_path = os.path.join(out_dir, f"{name}.js")
    with open(source_file, 'rb') as f:
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


def main():
    args = parse_args()
    os.makedirs(args.out, exist_ok=True)

    # We extracted these offsets in previous steps:
    extract_chunk(args.source, args.out, "1_feature_flags_registry", 445457, 5000, "Feature flags default values (incremental rendering, composable daemon)")
    extract_chunk(args.source, args.out, "2_feature_flags_loader", 753700, 5000, "Logic that fetches flags from .factory/cache/feature-flags.json and API")
    extract_chunk(args.source, args.out, "3_tui_incremental_mount", 17552300, 5000, "Main App Root mounting, Ink initialization, and incremental render checks")
    extract_chunk(args.source, args.out, "4_daemon_core_lv0", 17332600, 3000, "lv0 function: calculates if incremental rendering should be forced or disabled")

    print("Extraction complete. Bypassed subagents successfully.")


if __name__ == "__main__":
    main()
