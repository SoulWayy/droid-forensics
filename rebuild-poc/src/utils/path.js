// Stub module: path expansion for the rebuild-poc POC.
// Expands "~" to $HOME and resolves relative to cwd.
import { homedir } from "node:os";
import path from "node:path";

export function expandPath(p) {
  if (typeof p !== "string") return p;
  let out = p;
  if (out === "~" || out.startsWith("~/")) {
    out = path.join(homedir(), out.slice(1));
  }
  return path.resolve(out);
}
