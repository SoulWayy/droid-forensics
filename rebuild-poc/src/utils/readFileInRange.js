// Stub module: read a file slice by line range for the rebuild-poc POC.
import fs from "node:fs";

export function readFileInRange(path, start, end) {
  const lines = fs.readFileSync(path, "utf-8").split("\n");
  const sliced = lines.slice(start - 1, end ?? lines.length);
  return sliced.join("\n");
}
