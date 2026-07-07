// Stub module: slow-operation guards for the rebuild-poc POC.
export function shouldUseFastPath(_fileSize, _context) {
  return true;
}

export function calculateTimeout(_opts) {
  return 5000;
}

export async function withTimeout(promise, ms = 5000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function withTimeoutPromise(_fn, ms = 5000) {
  return withTimeout(_fn, ms);
}

export function jsonStringify(value, spaces = 2) {
  return JSON.stringify(value, null, spaces);
}
