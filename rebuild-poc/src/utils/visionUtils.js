// Stub module: vision capability checks for the rebuild-poc POC.
// Faithfully reproduces Droid's vision gate (issue #1421): image reads are
// refused with errorCode 10 when the active model lacks `supportsVision`
// (Xiaomi Mimo V2.5 Pro/Flash, Llama, Mistral, ...). Vision-capable models
// include Claude and OpenAI GPT families.
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

const NON_VISION_PATTERNS = [
  /mimo/i,
  /llama/i,
  /mistral/i,
  /gemma/i,
  /deepseek/i,
  /qwen/i,
];

export function checkVisionCapabilityForFile(filePath, model, _opts = {}) {
  if (typeof filePath !== "string" || !IMAGE_EXT_RE.test(filePath)) {
    // Not an image read; capability gate is irrelevant.
    return { result: true };
  }
  const isNonVision = NON_VISION_PATTERNS.some((re) => re.test(String(model ?? "")));
  if (isNonVision) {
    return {
      result: false,
      errorCode: 10,
      message: `${model} does not support image inputs. Use a vision-capable model (e.g. Claude) or read the image with Bash (\`file\`, \`identify\`, OCR).`,
    };
  }
  return { result: true };
}
