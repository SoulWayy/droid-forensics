// Stub module: error helpers for the rebuild-poc POC.
export function errorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function isENOENT(err) {
  return err instanceof Error && err.code === "ENOENT";
}

export function getErrnoCode(err) {
  return err instanceof Error ? err.code ?? null : null;
}
