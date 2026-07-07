import os
import re

SOURCE_FILE = "/home/jan/Droid-onderzoek-triage/droid-full-source.js"
OUT_DIR = "/home/jan/Droid-onderzoek-triage/extracted-source/deep-extraction"

os.makedirs(OUT_DIR, exist_ok=True)

# Define the targets to search for. We will grab 15KB around the first match, 
# or multiple 5KB chunks for all matches.
TARGETS = {
    "llm_streaming_engine": [b"stream-jsonrpc", b"useLLMStreaming", b"factory_app_jsonrpc"],
    "mcp_tools_protocol": [b"McpServer", b"executeTool", b"mcp_tool"],
    "daemon_worker_process": [b"composableDaemon", b"isStreamJsonRpcWorker", b"spawn(", b"fork("],
    "session_telemetry": [b"sessionStatus", b"recordMetric", b"S3Logging"],
    "react_reconciler_ink": [b"Maximum update depth exceeded", b"Cannot update a component"],
    "rate_limiting_retry": [b"RateLimit", b"exponentialBackoff", b"CircuitBreaker"],
}

print(f"Starting deep extraction on {SOURCE_FILE} ({os.path.getsize(SOURCE_FILE) / 1024 / 1024:.2f} MB)")

with open(SOURCE_FILE, 'rb') as f:
    content = f.read()

for name, patterns in TARGETS.items():
    print(f"\nExtracting subsystem: {name}")
    out_path = os.path.join(OUT_DIR, f"{name}.js")
    
    extracted_chunks = []
    
    for pattern in patterns:
        # Find all occurrences
        for match in re.finditer(re.escape(pattern), content):
            start = max(0, match.start() - 5000)
            end = min(len(content), match.end() + 10000)
            
            chunk = content[start:end].decode('utf-8', errors='replace')
            extracted_chunks.append(f"// --- MATCH FOUND FOR: {pattern.decode()} ---\n{chunk}\n")
            
            # Limit to max 3 chunks per pattern to avoid massive files
            if len(extracted_chunks) >= 3:
                break
                
    if extracted_chunks:
        with open(out_path, 'w', encoding='utf-8') as out:
            out.write(f"// ==========================================\n")
            out.write(f"// DEEP EXTRACTION: {name}\n")
            out.write(f"// ==========================================\n\n")
            out.write("\n\n".join(extracted_chunks))
        print(f"  -> Saved {len(extracted_chunks)} code blocks to {name}.js")
    else:
        print(f"  -> No matches found for {name}")

print("\nDeep extraction complete.")
