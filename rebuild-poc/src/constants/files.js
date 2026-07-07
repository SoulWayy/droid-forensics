// Stub module: binary-extension detection for the rebuild-poc POC.
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "bmp", "webp", "ico", "pdf",
  "zip", "gz", "tar", "7z", "rar", "exe", "dll", "so", "bin",
  "mp3", "mp4", "wav", "avi", "mov", "mkv", "doc", "docx",
  "xls", "xlsx", "ppt", "pptx", "ttf", "otf", "woff", "woff2",
]);

export function hasBinaryExtension(filePath) {
  if (!filePath) return false;
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTENSIONS.has(ext);
}
