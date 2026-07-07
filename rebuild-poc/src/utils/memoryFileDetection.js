// Stub module: auto-memory file detection for the rebuild-poc POC.
export function isAutoMemFile(filePath) {
  if (typeof filePath !== "string") return false;
  return filePath.includes("MEMORY.md") || filePath.includes("/.claude/");
}
