// Stub module: token estimation for the rebuild-poc POC.
// Cheap heuristic (4 chars/token); the real Droid calls a tokenizer endpoint.
export function roughTokenCountEstimationForFileType(content, _fileType) {
  if (typeof content !== "string") return 0;
  return Math.ceil(content.length / 4);
}

export async function countTokensWithAPI(content, _opts) {
  return roughTokenCountEstimationForFileType(content);
}
