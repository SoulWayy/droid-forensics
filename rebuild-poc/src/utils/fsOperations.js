// Stub module: filesystem abstraction for the rebuild-poc POC.
// Returns node:fs so the tool layer can run in tests; the real Droid swaps in a
// sandbox/overlay implementation behind this interface.
import fs from "node:fs";

export function getFsImplementation() {
  return fs;
}
