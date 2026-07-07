// Stub module: lightweight error logging for the rebuild-poc POC.
export function logError(err) {
  // In the POC we surface to stderr without crashing the tool layer.
  if (err instanceof Error) {
    console.error(`[error] ${err.message}`);
  } else {
    console.error(`[error] ${String(err)}`);
  }
}
