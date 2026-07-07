// Stub module: diff/patch helpers for the rebuild-poc POC.
// Re-exports the real `structuredPatch` from the `diff` package and provides
// minimal safe implementations for the POC's edit-tool path.
import { structuredPatch as _structuredPatch } from "diff";

export const structuredPatch = _structuredPatch;
export const CONTEXT_LINES = 3;
export const DIFF_TIMEOUT_MS = 5000;

export function normalizeLineEndings(text, _ending = "\n") {
  if (typeof text !== "string") return text;
  return text.replace(/\r\n|\r/g, "\n");
}

export function countLinesChanged(_original, _updated) {
  // POC: cannot compute a real diff; report 0 changed lines.
  return 0;
}

export function getPatchForDisplay(_patch) {
  return "";
}

export function adjustHunkLineNumbers(patch) {
  return patch;
}

export function applyPatchWithFallback(original, _patch) {
  // POC: no real patch application; return the original unchanged.
  return original;
}

export function getWordWrapWidth(_width) {
  return _width;
}

export function getPatchFromContents(original, updated, _opts) {
  const patch = structuredPatch("file", "file", original, updated, "", "", CONTEXT_LINES);
  return patch;
}
