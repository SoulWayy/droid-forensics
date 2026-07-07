import os
import re

SOURCE_FILE = "/home/jan/Droid-onderzoek-triage/droid-full-source.js"
OUT_DIR = "/home/jan/Droid-onderzoek-triage/extracted-source/smart-recovery"

os.makedirs(OUT_DIR, exist_ok=True)

print(f"Loading {SOURCE_FILE} into memory for smart extraction...")
with open(SOURCE_FILE, 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Factory AI UI components often use React.createElement or typical JSX transpilation
# We look for large React components, hooks, and classes, mapping them to their guessed filenames.

# Regex to find React components or hooks (e.g., const McpManager = (...) => { ... })
pattern = re.compile(r'(const|let|var|function)\s+([A-Z][a-zA-Z0-9_]+|use[A-Z][a-zA-Z0-9_]+)\s*(=|\()')

print("Scanning for React components and critical functions...")
matches = list(pattern.finditer(content))

extracted_count = 0
for match in matches:
    name = match.group(2)
    start_pos = match.start()
    
    # Extract 10KB around the function to capture its body
    # We use a heuristic since full AST parsing crashes
    extract_start = max(0, start_pos - 1000)
    extract_end = min(len(content), start_pos + 15000)
    
    chunk = content[extract_start:extract_end]
    
    # Only save if it looks like actual Factory AI code (contains typical keywords)
    if 'createElement' in chunk or 'useState' in chunk or 'useMemo' in chunk or 'stream-jsonrpc' in chunk or 'McpServer' in chunk:
        out_file = os.path.join(OUT_DIR, f"{name}.js")
        
        # Prevent overwriting with generic names, append count if needed
        if os.path.exists(out_file):
            continue
            
        with open(out_file, 'w', encoding='utf-8') as out:
            out.write(f"// INFERRED COMPONENT: {name}\n")
            out.write(f"// APPROXIMATE OFFSET: {start_pos}\n\n")
            
            # Basic formatting
            formatted = re.sub(r'([{};])', r'\1\n', chunk)
            formatted = re.sub(r'\n+', '\n', formatted)
            out.write(formatted)
            
        extracted_count += 1

print(f"\nSmart recovery complete. Extracted {extracted_count} named components/functions to {OUT_DIR}")
