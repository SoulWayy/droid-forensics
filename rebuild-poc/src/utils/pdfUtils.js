// Stub module: PDF filename/page extraction for the rebuild-poc POC.
export function pGetPDFFilename(_path) {
  return "";
}

export function pGetPDFPageText(_path, _page) {
  return "";
}

export function isPDFSupported() {
  // POC: assume a PDF backend is available.
  return true;
}

export function parsePDFPageRange(_range) {
  return null;
}

export function isPDFExtension(filePath) {
  return typeof filePath === "string" && filePath.toLowerCase().endsWith(".pdf");
}
