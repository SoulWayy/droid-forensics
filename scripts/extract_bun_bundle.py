#!/usr/bin/env python3
import sys
import os

def extract_bun(binary_path, output_path):
    print(f"[*] Analysing Bun executable: {binary_path}")
    
    if not os.path.exists(binary_path):
        print("[-] Binary not found.")
        return

    file_size = os.path.getsize(binary_path)
    
    # We open in binary read mode
    with open(binary_path, "rb") as f:
        data = f.read()

    # Bun bundlers often append an archive or a specific magic string.
    # Searching for known JS bundle signatures or boundary markers.
    # We will search for typical React/JS bundle patterns.
    # A safer, memory-friendly approach than a full core dump!
    
    search_pattern = b"use strict"
    offset = data.find(search_pattern)
    
    if offset == -1:
        print("[-] Could not automatically find bundle start. Heuristics failed.")
        return
        
    print(f"[+] Found possible bundle start at offset: {offset}")
    
    # We'll extract safely, preventing gigantic files.
    # The JS bundle is usually < 10MB. We cap extraction at 25MB max to prevent disk issues.
    MAX_EXTRACT_SIZE = 25 * 1024 * 1024
    extract_size = min(file_size - offset, MAX_EXTRACT_SIZE)
    
    print(f"[*] Extracting {extract_size / (1024*1024):.2f} MB to {output_path}...")
    
    with open(output_path, "wb") as out:
        out.write(data[offset:offset+extract_size])
        
    print("[+] Extraction complete! No gigabyte dumps created.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: ./extract_bun_bundle.py <path_to_droid_binary> <output_js_file>")
        sys.exit(1)
        
    extract_bun(sys.argv[1], sys.argv[2])
