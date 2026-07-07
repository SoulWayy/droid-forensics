// Stub module: current-working-directory helper for the rebuild-poc POC.
import process from "node:process";

export function getCwd() {
  return process.cwd();
}
