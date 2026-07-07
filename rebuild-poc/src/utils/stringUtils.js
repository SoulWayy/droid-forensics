// Stub module: string helpers for the rebuild-poc POC.
export function countCharInString(haystack, needle, afterIndex = 0) {
  if (typeof haystack !== "string") return 0;
  let count = 0;
  for (let i = afterIndex; i < haystack.length; i++) {
    if (haystack[i] === needle) count++;
  }
  return count;
}
