// Stub module: analytics file metadata for the rebuild-poc POC.
export function getFileExtensionForAnalytics(filePath) {
  if (typeof filePath !== "string") return "unknown";
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return ext || "unknown";
}

// Marker type used by FileReadTool; mirrored as a runtime no-op value.
export const AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = Symbol(
  "AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS",
);
