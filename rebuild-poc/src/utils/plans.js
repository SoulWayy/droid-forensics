// Stub module: plan-mode state for the rebuild-poc POC.
export function getPlanModeState() {
  return { inPlanMode: false };
}

export function getPlansDirectory() {
  return process.env.CLAUDE_PLANS_DIR ?? "/home/jan/.claude/plans";
}
