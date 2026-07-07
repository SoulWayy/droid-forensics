// Stub module: image resizing for the rebuild-poc POC.
// Minimal pass-through implementations; the real Droid decodes/resize images.

export class ImageResizeError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageResizeError";
  }
}

export const ImageDimensions = {
  width: 0,
  height: 0,
};

export function detectImageFormatFromBuffer(_buffer) {
  return "png";
}

export function createImageMetadataText(_buffer) {
  return "";
}

export function maybeResizeAndDownsampleImageBuffer(buffer) {
  // No resize in the POC: return buffer unchanged.
  return buffer;
}

export function compressImageBufferWithTokenLimit(buffer) {
  // No compression in the POC: return buffer unchanged.
  return buffer;
}
