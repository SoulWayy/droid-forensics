import argparse
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SOURCE_FILE = str(REPO / "droid-full-source.js")
OUT_DIR = str(REPO / "extracted-source" / "full-breakdown")


def main():
    ap = argparse.ArgumentParser(description="Split Droid bundle into readable chunks.")
    ap.add_argument("--source", default=SOURCE_FILE, help="Path to droid-full-source.js")
    ap.add_argument("--out-dir", default=OUT_DIR, help="Output directory for chunks")
    args = ap.parse_args()

    source_file = args.source
    out_dir = args.out_dir
    os.makedirs(out_dir, exist_ok=True)

    print(f"Loading {source_file}...")
    with open(source_file, 'rb') as f:
        content = f.read().decode('utf-8', errors='ignore')

    print(f"Total size: {len(content) / 1024 / 1024:.2f} MB")

    # We will break the file into 2MB chunks, but we will try to break on safe boundaries (like 'var ' or 'function ')
    chunk_size = 2 * 1024 * 1024
    total_length = len(content)
    current_pos = 0
    chunk_idx = 0

    print("Splitting into readable chunks...")

    while current_pos < total_length:
        end_pos = min(current_pos + chunk_size, total_length)

        # Try to find a safe breaking point (a semicolon followed by var, let, const, or function)
        if end_pos < total_length:
            safe_break = content.find(';var ', end_pos - 50000, end_pos + 50000)
            if safe_break == -1:
                safe_break = content.find(';function ', end_pos - 50000, end_pos + 50000)

            if safe_break != -1:
                end_pos = safe_break + 1

        chunk = content[current_pos:end_pos]

        # Fast regex-based beautification (basic formatting)
        # Add newlines after { and } and ; to make it readable
        chunk = re.sub(r'([{};])', r'\1\n', chunk)
        # Fix double newlines
        chunk = re.sub(r'\n+', '\n', chunk)

        out_file = os.path.join(out_dir, f"bundle_part_{chunk_idx:03d}.js")
        with open(out_file, 'w', encoding='utf-8') as out:
            out.write(chunk)

        print(f"Wrote {out_file} ({(end_pos - current_pos) / 1024 / 1024:.2f} MB)")
        current_pos = end_pos
        chunk_idx += 1

    print("Complete splitting and basic formatting.")


if __name__ == "__main__":
    main()
