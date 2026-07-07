# OpenCodeGo Custom GLM-5.2 Wrapper — Metrics Report

**Date:** July 5–7, 2026  
**Models:** `custom:GLM-5.2-0` and `custom:GLM-5.2-anthropic-0`  
**Context:** These are OpenCodeGo-managed custom model wrappers around Z.ai GLM-5.2 endpoints. They are **not** direct Z.ai API calls; they go through OpenCodeGo's model routing layer.  
**Logs analyzed:** `/home/jan/.factory/logs/droid-log-single.log*` plus archived logs  

---

## 1. Usage Overview

| Model | Events | Distinct Sessions | Notes |
|-------|--------|-------------------|-------|
| `custom:GLM-5.2-0` | 29,914 | 30+ | OpenAI-style wrapper (heaviest usage) |
| `custom:GLM-5.2-anthropic-0` | 1,980 | ~5 | Anthropic-style wrapper (spec/reasoning mode) |
| **Total** | **31,894** | **35** | |

The OpenAI-style wrapper is used ~15× more frequently than the Anthropic-style wrapper.

---

## 2. Token Usage — `custom:GLM-5.2-0`

### 2.1 Input / Output Tokens (per request)

| Field | Samples | Average | p50 | p95 | p99 | Max |
|-------|---------|---------|-----|-----|-----|-----|
| `inputTokens` | 1,194 | 21,872 | 530 | 18,934 | 1,146,990 | **2,132,217** |
| `outputTokens` | 1,194 | 2,020 | 112 | 2,849 | 95,897 | **145,278** |
| `reasoningTokens` | 1,194 | 0 | 0 | 0 | 0 | 0 |
| `totalInputTokens` | 1,127 | 101,152 | 87,104 | 226,782 | 242,120 | **247,888** |
| `cacheReadInputTokens` | 1,127 | 98,702 | 85,056 | 226,688 | 241,792 | 246,848 |
| `tokens` (compaction) | 1,123 | 101,747 | 87,449 | 226,967 | 243,423 | 250,909 |
| `totalEstimatedTokens` | 1,133 | 90,952 | 76,296 | 231,700 | 246,369 | 251,455 |

### 2.2 Cache Read / Write

| Field | Samples | Average | p50 | p95 | Max |
|-------|---------|---------|-----|-----|-----|
| `cachedTokensRead` | 67 | 10,918,946 | 258,048 | 56,952,391 | 69,065,223 |
| `cachedTokensWritten` | 67 | 0 | 0 | 0 | 0 |

**Note:** The `cachedTokensRead` average is skewed by extremely large values (up to 69M tokens). These are likely lifetime/cumulative counters reported by Anthropic's prompt-caching mechanism, not per-request reads. The p50 of 258K is more representative.

### 2.3 Tool Execution Latency

| Metric | Samples | Average | p50 | p95 | p99 | Max |
|--------|---------|---------|-----|-----|-----|-----|
| `droid_mode_tool_execution_latency` | 1,360 | 11ms | 0ms | 22ms | 310ms | **2,307ms** |

Tool execution itself is fast; the 2.3s outlier is likely a slow file/network operation.

---

## 3. Token Usage — `custom:GLM-5.2-anthropic-0`

### 3.1 Input / Output Tokens (per request)

| Field | Samples | Average | p50 | p95 | p99 | Max |
|-------|---------|---------|-----|-----|-----|-----|
| `inputTokens` | 79 | 5,061 | 889 | 25,669 | 76,864 | 76,864 |
| `outputTokens` | 79 | 138 | 74 | 546 | 1,769 | 1,769 |
| `reasoningTokens` | 79 | 61 | 0 | 653 | 1,911 | 1,911 |
| `totalInputTokens` | 73 | 30,043 | 29,663 | 38,504 | 39,133 | 39,133 |
| `cacheReadInputTokens` | 73 | 25,618 | 26,048 | 34,048 | 36,736 | 36,736 |
| `tokens` (compaction) | 72 | 30,247 | 29,848 | 38,843 | 39,286 | 39,286 |
| `totalEstimatedTokens` | 77 | 30,448 | 30,114 | 36,667 | 37,122 | 37,122 |

### 3.2 Cache Read / Write

| Field | Samples | Average | p50 | p95 | Max |
|-------|---------|---------|-----|-----|-----|
| `cachedTokensRead` | 6 | 4,427 | 0 | 26,560 | 26,560 |
| `cachedTokensWritten` | 6 | 0 | 0 | 0 | 0 |

### 3.3 Reasoning Tokens

Unlike the OpenAI-style wrapper, the Anthropic-style wrapper reports **reasoning tokens**:
- Average: 61 tokens/request
- p95: 653 tokens/request
- Max: 1,911 tokens/request

This indicates the Anthropic wrapper is configured with reasoning/thinking enabled.

---

## 4. Comparison: OpenAI-style vs Anthropic-style Wrapper

| Metric | `custom:GLM-5.2-0` | `custom:GLM-5.2-anthropic-0` | Difference |
|--------|--------------------|------------------------------|------------|
| Events | 29,914 | 1,980 | 15× more usage |
| Avg `inputTokens` | 21,872 | 5,061 | 4.3× larger prompts |
| Avg `outputTokens` | 2,020 | 138 | 14.6× more output |
| Avg `totalInputTokens` | 101,152 | 30,043 | 3.4× larger total context |
| Avg `cacheReadInputTokens` | 98,702 | 25,618 | 3.9× larger cache reads |
| Reasoning tokens | 0 | 61 | Only Anthropic wrapper uses reasoning |
| Tool exec latency | 11ms | 1ms | Similar |

**Interpretation:** The OpenAI-style wrapper is used for heavy, long-context coding tasks with large tool contexts. The Anthropic-style wrapper is used for lighter, reasoning-focused tasks.

---

## 5. Session-Level Analysis

### 5.1 Longest Sessions

| Session | Model | Duration | Events | Notes |
|---------|-------|----------|--------|-------|
| 4e508363... | `custom:GLM-5.2-0` | 245 min | 1,228 | Longest observed GLM session |
| 8a86a1e8... | mixed | 157 min | 1,696 | Switched to `cline-pass/deepseek-v4-flash` partway |
| e4dfb169... | `custom:GLM-5.2-0` | 37 min | 1,013 | High event density |

### 5.2 Token Growth Within Sessions

For `custom:GLM-5.2-0`, `totalInputTokens` grows steadily within sessions:
- Starts around 25K–50K tokens
- Reaches 200K–247K tokens by end of session
- Context window appears to be 250K tokens

This growth pattern is normal for long agent conversations but explains why cache read tokens become large.

---

## 6. No TTFT Metrics Available

**Important:** Unlike the direct `glm-5.2` Z.ai endpoint, the OpenCodeGo custom wrappers **do not log `chat_client_time_to_first_token` metrics**. We therefore cannot measure TTFT for these wrappers from the available logs.

This means:
- Any latency issues in the custom wrappers are **not observable** in Droid's current telemetry.
- For Z.ai bug-reporting purposes, the direct `glm-5.2` endpoint data (`zai-glm52-bug-report.md`) is much stronger evidence.

---

## 7. Errors Observed (Custom Wrappers)

Errors in custom GLM sessions are mostly **not caused by the model/provider** but by surrounding infrastructure:

| Error Type | Count | Likely Cause |
|------------|-------|--------------|
| `GitAiCheckpoints] Failed to read checkpoint file` | 68+ | Local git checkpoint file missing/corrupt |
| `YAML parsing failed` | 1,462+ | Local plugin/skill YAML config |
| `Duplicate tool_result detected` | 192 | Message caching deduplication |
| Agent error 429 | 2 | Usage limit on underlying Z.ai endpoint |

These are client-side or usage-limit issues, not OpenCodeGo bugs.

---

## 8. Summary

- The OpenCodeGo custom GLM-5.2 wrappers handle very large contexts (up to ~247K tokens) and generate substantial output.
- The Anthropic-style wrapper uses reasoning tokens; the OpenAI-style wrapper does not.
- Tool execution latency is low (~11ms avg), so performance bottlenecks are likely in LLM latency, not tool execution.
- **No TTFT telemetry** is available for the custom wrappers, making direct latency diagnosis impossible from these logs.
- For provider-side latency/reliability issues, refer to `zai-glm52-bug-report.md` which analyzes direct `glm-5.2` Z.ai endpoint calls.
