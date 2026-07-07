// Stub module: model resolution for the rebuild-poc POC.
export function getCanonicalName(model) {
  return typeof model === "string" ? model : "unknown";
}

export function getMainLoopModel() {
  return process.env.DROID_LLM_MODEL ?? "unknown";
}
