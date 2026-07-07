// Stub module: filesystem read-permission checks for the rebuild-poc POC.
export function checkReadPermissionForTool(_path) {
  return { granted: true, reason: "poc-stub" };
}

export function matchingRuleForInput(_input) {
  return null;
}

export function readPermissionUpdate(_ruleText) {
  return null;
}
