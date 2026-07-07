// Stub module: file-sizing constants for the rebuild-poc POC.
import fs from "node:fs";

export const MAX_OUTPUT_SIZE = 25 * 1024 * 1024; // 25 MB
export const FILE_NOT_FOUND_CWD_NOTE = "File not found relative to the current working directory.";

const _cache = new Map();
export function readFileSyncCached(filePath) {
  const cached = _cache.get(filePath);
  if (cached) return cached;
  const content = fs.readFileSync(filePath, "utf-8");
  _cache.set(filePath, content);
  return content;
}

export function convertLeadingTabsToSpaces(content, tabWidth = 2) {
  if (typeof content !== "string") return content;
  const spaces = " ".repeat(tabWidth);
  return content.replace(/^\t+/gm, (tabs) => spaces.repeat(tabs.length));
}

export function addLineNumbers(content, startLine = 1) {
  if (typeof content !== "string") return content;
  return content
    .split("\n")
    .map((line, i) => `${startLine + i}	${line}`)
    .join("\n");
}

export function getDisplayPath(filePath, cwd) {
  if (typeof filePath !== "string") return filePath;
  const base = cwd ?? process.cwd();
  if (filePath.startsWith(base)) {
    const rel = filePath.slice(base.length).replace(/^\//, "");
    return rel.length ? `./${rel}` : ".";
  }
  return filePath;
}

export function suggestPathUnderCwd(_input, _cwd) {
  return null;
}

export function findSimilarFile(_input, _cwd) {
  return null;
}

export async function getFileModificationTimeAsync(filePath) {
  try {
    const stat = await import("node:fs/promises").then((fs) => fs.stat(filePath));
    return stat.mtimeMs;
  } catch {
    return null;
  }
}

