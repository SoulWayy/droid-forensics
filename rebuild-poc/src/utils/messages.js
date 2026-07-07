// Stub module: tag extraction for the rebuild-poc POC.
// Pulls the content between <tag>...</tag> out of a string/streamed result.
export function extractTag(input, tag) {
  if (input == null) return null;
  const text = typeof input === "string" ? input : String(input);
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = text.indexOf(open);
  if (start === -1) return null;
  const end = text.indexOf(close, start);
  if (end === -1) return text.slice(start + open.length);
  return text.slice(start + open.length, end);
}

export function createUserMessage(content) {
  return { role: "user", content };
}
