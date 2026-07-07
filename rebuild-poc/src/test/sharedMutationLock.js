// Stub module: shared mutation lock for the rebuild-poc POC.
// Cooperative async lock so file-mutating tools don't race in tests.
const held = new Set();

export async function acquireSharedMutationLock(key) {
  // Simple cooperative guard; in the real Droid this guards cross-tool mutation.
  held.add(key);
  return key;
}

export function releaseSharedMutationLock(key) {
  held.delete(key);
}
