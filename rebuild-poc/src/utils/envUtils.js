// Stub module: environment helpers for the rebuild-poc POC.
import { homedir } from "node:os";
import path from "node:path";

export function isEnvTruthy(name) {
  const v = process.env[name];
  return v === "1" || v === "true" || v === "yes";
}

export function getClaudeConfigHomeDir() {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ? path.join(xdg, "claude") : path.join(homedir(), ".claude");
  return base;
}
