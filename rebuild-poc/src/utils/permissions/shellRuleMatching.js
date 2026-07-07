// Stub module: shell permission rule matching for the rebuild-poc POC.
export function checkShellPermission(_command) {
  return { granted: true, reason: "poc-stub" };
}

export function permissionRuleIsShorthandForCommand(_rule) {
  return false;
}

export function roleCanBypass(_role) {
  return false;
}

export function matchWildcardPattern(pattern, input) {
  if (typeof pattern !== "string" || typeof input !== "string") return false;
  const re = new RegExp(
    "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
  );
  return re.test(input);
}
