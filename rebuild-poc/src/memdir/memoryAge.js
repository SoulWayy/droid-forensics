// Stub module: memory freshness note for the rebuild-poc POC.
// Returns a human-readable note describing how stale a mtime is.
export function memoryFreshnessNote(mtimeMs) {
  if (typeof mtimeMs !== "number" || Number.isNaN(mtimeMs)) {
    return "unknown freshness";
  }
  const ageMs = Date.now() - mtimeMs;
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 1) return "fresh (<1m)";
  if (minutes < 60) return `edited ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `edited ${hours}h ago`;
  return `edited ${Math.floor(hours / 24)}d ago`;
}
