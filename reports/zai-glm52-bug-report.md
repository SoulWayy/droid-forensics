# Bug Report: GLM-5.2 Performance & Reliability Issues on Z.ai Endpoints

**Reported by:** OnlineChef / Jan (Droid TUI user)  
**Date:** July 7, 2026  
**Affected model:** `glm-5.2` (direct Z.ai API calls)  
**Affected endpoints:**
- `https://api.z.ai/api/coding/paas/v4` (OpenAI-compatible)
- `https://api.z.ai/api/anthropic` (Anthropic-compatible)

**Logs analyzed:** `/home/jan/.factory/logs/droid-log-single.log*` (July 5–7, 2026) plus archived logs  
**Total requests analyzed:** 1,425 successful chat completions + 2 failures  
**Total TTFT samples:** 1,421

---

## 1. Executive Summary

We are observing consistent performance degradation and intermittent connection failures when calling `glm-5.2` directly through Z.ai's API endpoints from the Droid TUI CLI. Key findings:

1. **TTFT degrades over time:** average TTFT increased from **5.92s (July 5)** to **9.95s (July 7)** — a **68% increase** in 48 hours.
2. **Severe outliers:** p99 TTFT reached **25.14s** on the OpenAI endpoint and **24.95s** on the Anthropic endpoint. Single worst case: **104.99s**.
3. **Connection errors:** 28 `Connection error` failures across both endpoints, suggesting network/ingress instability rather than client misconfiguration.
4. **Anthropic endpoint is slower on average:** 8.72s vs 6.93s on the OpenAI endpoint.
5. **High per-request tool context overhead:** ~23K tokens are sent to Z.ai per request just for tool/MCP context.

These issues affect real-time interactive coding assistance and appear to be provider-side.

---

## 2. Time to First Token (TTFT) — Detailed Metrics

### 2.1 Overall (both endpoints)

| Metric | Value |
|--------|-------|
| Samples | 1,421 |
| Min | 2.59s |
| Average | **7.30s** |
| Median (p50) | 6.69s |
| p90 | 10.29s |
| p95 | **12.20s** |
| p99 | **24.95s** |
| Max | **104.99s** |

### 2.2 By Z.ai Endpoint

| Endpoint | Samples | Avg | p50 | p95 | p99 | Max |
|----------|---------|-----|-----|-----|-----|-----|
| `api/coding/paas/v4` (OpenAI) | 1,129 | **6.93s** | 6.24s | 11.11s | 25.14s | **104.99s** |
| `api/anthropic` | 292 | **8.72s** | 7.99s | 14.88s | 24.95s | 37.60s |

**Observation:** The Anthropic-compatible endpoint has a higher average and p95 TTFT. The OpenAI endpoint shows the most extreme outlier (104.99s).

### 2.3 Daily Degradation Trend

| Date | Requests | Avg TTFT | p95 TTFT | Max TTFT |
|------|----------|----------|----------|----------|
| 2026-07-05 | 428 | **5.92s** | 10.09s | 27.45s |
| 2026-07-06 | 813 | **7.44s** | 11.94s | 35.10s |
| 2026-07-07 | 180 | **9.95s** | 24.06s | **104.99s** |

**Trend:** Average TTFT increased **+68%** and p95 TTFT increased **+138%** from July 5 to July 7. This pattern is consistent with provider-side capacity/load issues rather than a fixed client problem.

### 2.4 Hourly Breakdown (Peak Hours)

| Hour | Requests | Avg TTFT | p95 | Max |
|------|----------|----------|-----|-----|
| 2026-07-05T16 | 170 | 6.1s | 9.7s | 17.9s |
| 2026-07-05T17 | 177 | 5.3s | 9.1s | 13.2s |
| 2026-07-06T16 | 389 | 6.6s | 10.8s | 35.1s |
| 2026-07-06T17 | 154 | 8.3s | 10.9s | 26.1s |
| 2026-07-07T08 | 74 | 10.2s | 24.1s | 37.6s |
| 2026-07-07T12 | 39 | 9.7s | 29.1s | 29.5s |
| 2026-07-07T13 | 52 | 10.8s | 18.2s | **104.99s** |

**Observation:** Peak load hours (16:00 UTC) do not always correlate with worst TTFT; the degradation on July 7 occurs even at moderate request rates (~50/hour).

### 2.5 Worst 20 TTFT Outliers

| Timestamp | TTFT | Endpoint |
|-----------|------|----------|
| 2026-07-07T13:17:27Z | **104.99s** | `api/coding/paas/v4` |
| 2026-07-07T08:26:33Z | 37.60s | `api/anthropic` |
| 2026-07-06T16:23:31Z | 35.10s | `api/coding/paas/v4` |
| 2026-07-07T08:24:01Z | 31.52s | `api/anthropic` |
| 2026-07-07T12:58:41Z | 29.55s | `api/coding/paas/v4` |
| 2026-07-07T13:12:24Z | 29.46s | `api/coding/paas/v4` |
| 2026-07-07T12:58:40Z | 29.08s | `api/coding/paas/v4` |
| 2026-07-05T20:51:37Z | 27.45s | `api/coding/paas/v4` |
| 2026-07-05T20:27:45Z | 26.32s | `api/coding/paas/v4` |
| 2026-07-06T16:21:07Z | 26.11s | `api/coding/paas/v4` |
| 2026-07-06T17:29:20Z | 26.05s | `api/coding/paas/v4` |
| 2026-07-07T12:58:38Z | 25.61s | `api/coding/paas/v4` |
| 2026-07-06T16:21:06Z | 25.30s | `api/coding/paas/v4` |
| 2026-07-06T17:30:45Z | 25.14s | `api/coding/paas/v4` |
| 2026-07-07T08:27:53Z | 24.95s | `api/anthropic` |
| 2026-07-05T20:52:18Z | 24.53s | `api/coding/paas/v4` |
| 2026-07-06T20:13:14Z | 24.22s | `api/anthropic` |
| 2026-07-07T08:24:52Z | 24.06s | `api/anthropic` |
| 2026-07-06T16:23:31Z | 22.39s | `api/coding/paas/v4` |
| 2026-07-06T16:30:44Z | 21.35s | `api/coding/paas/v4` |

---

## 3. Connection Errors & Reliability

### 3.1 Connection Error Count

| SDK / Endpoint | Count |
|----------------|-------|
| OpenAI SDK (`openai/client.mjs`) | 24 |
| Anthropic SDK (`@anthropic-ai/sdk/client.mjs`) | 4 |
| **Total** | **28** |

### 3.2 Connection Error Timeline

| Timestamp | SDK |
|-----------|-----|
| 2026-07-05T16:16:33Z | openai |
| 2026-07-05T16:16:34Z | openai |
| 2026-07-05T16:45:42Z | openai |
| 2026-07-05T17:06:08Z | openai |
| 2026-07-05T17:06:09Z | openai |
| 2026-07-05T17:14:33Z | openai |
| 2026-07-05T17:23:22Z | openai |
| 2026-07-05T17:31:45Z | openai |
| 2026-07-05T20:22:47Z | openai |
| 2026-07-05T21:05:51Z | openai |
| 2026-07-06T16:20:49Z | openai |
| 2026-07-06T16:20:49Z | openai |
| 2026-07-06T16:20:56Z | openai |
| 2026-07-06T16:29:08Z | openai |
| 2026-07-06T16:30:26Z | openai |
| 2026-07-06T17:18:18Z | openai |
| 2026-07-06T17:28:58Z | openai |
| 2026-07-06T17:29:05Z | openai |
| 2026-07-06T17:30:23Z | openai |
| 2026-07-06T17:30:30Z | openai |
| 2026-07-06T19:03:22Z | anthropic |
| 2026-07-06T19:37:06Z | anthropic |
| 2026-07-06T19:37:59Z | anthropic |
| 2026-07-06T19:56:16Z | anthropic |
| 2026-07-07T08:08:39Z | openai |
| 2026-07-07T08:14:12Z | anthropic |
| 2026-07-07T12:58:14Z | openai |
| 2026-07-07T13:12:11Z | openai |

**Pattern:** Errors occur on both endpoints and both SDKs, spread across all three days. This strongly suggests provider-side network/ingress instability rather than a single client bug.

### 3.3 Retry Pattern

The client automatically retries on failure. Retry attempt distribution:

| Attempt | Count |
|---------|-------|
| 1 (initial failure) | 28 |
| 2 | 5 |
| 3 | 2 |
| 4 | 2 |
| 5 | 1 |

**Total retry events:** 38 (across 1,425 successful requests = **2.7% retry rate**).

---

## 4. Token Usage & Context Overhead

### 4.1 MCP Tool Search Context Tokens (per request)

Z.ai receives a large tool/MCP context block with every request:

| Metric | Value |
|--------|-------|
| Samples | 5,700 |
| Average | **23,310 tokens** |
| Median | 15,652 tokens |
| p95 | 52,439 tokens |
| Max | 52,439 tokens |

### 4.2 Estimated Net Tool Context vs. Savings

| Metric | Avg | p50 | p95 | Max |
|--------|-----|-----|-----|-----|
| `estimatedNetToolContextTokens` | 22,003 | 20,351 | 25,159 | 25,159 |
| `estimatedTokensSaved` | 27,231 | 27,400 | 27,842 | 30,499 |
| `deferredReminderTokens` | 9,366 | 9,387 | 9,507 | 9,507 |

### 4.3 Cache Hit Rate

| Metric | Value |
|--------|-------|
| Samples | 1,425 |
| Average | **95.4%** |
| Median | 99.3% |
| p95 | 99.9% |
| Max | 100% |

**Observation:** Cache hit rate is excellent, but the absolute token volume sent per request is still very high. The large context may contribute to slow TTFT.

---

## 5. Rate Limiting (Context — Not a Z.ai Bug)

We observed 133 `429` rate-limit responses. These are **not reported as a Z.ai bug** because they reflect our own usage volume. However, they are included for context:

| Error Type | Count |
|------------|-------|
| `429 Weekly/Monthly Limit Exhausted` | 11+ explicit messages |
| Other 429 responses | 122 (embedded in metric contexts) |

**Context:** On 2026-07-07 around 13:20 UTC, GLM-5.2 hit a weekly/monthly limit. This indicates our usage reached the plan cap. We are separately addressing usage management.

---

## 6. Comparison with Other Models

For reference, here is how Z.ai GLM-5.2 TTFT compares to other models used in the same Droid deployment:

| Model | Avg TTFT | p50 | Max |
|-------|----------|-----|-----|
| **Z.ai GLM-5.2** | **7.30s** | **6.69s** | **104.99s** |
| DeepSeek-V4-Flash | 2.28s | 1.61s | 10.68s |
| MiniMax-M3 | 2.71s | 2.40s | 6.13s |
| DeepSeek-V4-Pro | 2.77s | 2.26s | 9.81s |
| Kimi-K2.7-Code | 3.42s | 3.12s | 30.72s |
| MiMo-V2.5 | 3.48s | 3.23s | 7.26s |

**Observation:** Z.ai GLM-5.2 is **2–3× slower** on average than other models in our deployment and has by far the worst outlier.

---

## 7. Session-Level Impact

Top sessions using direct Z.ai GLM-5.2:

| Session | Duration | Requests | Avg TTFT | 429s | Conn Errors |
|---------|----------|----------|----------|------|-------------|
| 8a86a1e8... | 241 min | 447 | ~7.0s | 48 | 0 |
| e4dfb169... | 37 min | 167 | ~7.5s | 12 | 0 |
| 4e508363... | 170 min | 160 | ~5.9s | 0 | 0 |
| 6a6bbd87... | 8 min | 76 | ~6.5s | 8 | 0 |
| 30b21612... | 24 min | 33 | ~10.0s | 2 | 0 |

**Observation:** Long-running sessions (4+ hours) consistently hit rate limits, while connection errors are distributed across shorter sessions.

---

## 8. Reproduction Environment

- **Client:** Droid CLI v0.164.1 (Rust core + JavaScriptCore)
- **Host:** Linux 6.1.0-50-amd64
- **Network:** Wired/fiber, no proxy
- **SDKs used:** OpenAI JS SDK, Anthropic JS SDK (both latest bundled versions)
- **Calling pattern:** Streaming chat completions, JSON-RPC worker subprocess
- **Request rate:** typically 30–400 requests/hour depending on session activity

---

## 9. Requested Actions from Z.ai

1. **Investigate TTFT degradation:** Please confirm whether the observed increase in TTFT (5.9s → 9.9s over 48h) corresponds to known capacity/load events on GLM-5.2.
2. **Connection error root cause:** Please check logs for `Connection error` events from our API keys around the timestamps listed in §3.2.
3. **Endpoint performance parity:** The Anthropic-compatible endpoint is ~25% slower on average than the OpenAI-compatible endpoint. Please confirm if this is expected.
4. **Outlier analysis:** The 104.99s TTFT outlier on 2026-07-07T13:17:27Z should not occur under normal conditions. Please investigate.
5. **Rate limit transparency:** If possible, provide current per-model rate limits and recommended burst handling for GLM-5.2.

---

## 10. Attachments

- Raw extracted event stream: `glm-extracted/raw_glm_events.jsonl`
- Message-level streaming correlation: `glm-extracted/glm_message_streaming.json`
- Extraction scripts: `extract_glm_metrics.py`, `analyze_glm_streaming.py`
