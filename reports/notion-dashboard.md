# 🚨 Droid GLM-5.2 Forensics Dashboard

> Comprehensive forensics report: Z.ai native GLM-5.2 vs OpenCodeGo custom wrappers.  
> Logs: `/home/jan/.factory/logs/droid-log-single.log*` (July 5–7, 2026)

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total GLM-5.2 events analyzed** | 45,789 |
| **Direct Z.ai calls (`glm-5.2`)** | 12,875 events |
| **OpenCodeGo custom wrappers** | 31,894 events |
| **TTFT samples (direct Z.ai)** | 1,421 |
| **Avg TTFT direct Z.ai** | **7.30s** |
| **Worst TTFT outlier** | **104.99s** |
| **Connection errors** | **28** |
| **Rate-limit 429s (our usage)** | 133 |

---

## 🎯 Key Finding: TTFT Degradation Over Time

| Date | Requests | Avg TTFT | p95 TTFT | Max TTFT |
|------|----------|----------|----------|----------|
| 2026-07-05 | 428 | **5.92s** | 10.09s | 27.45s |
| 2026-07-06 | 813 | **7.44s** | 11.94s | 35.10s |
| 2026-07-07 | 180 | **9.95s** | 24.06s | **104.99s** |

**Trend:** Average TTFT increased **+68%** in 48 hours. p95 increased **+138%**.

---

## 🔌 Z.ai Endpoint Comparison

| Endpoint | Samples | Avg TTFT | p50 | p95 | p99 | Max |
|----------|---------|----------|-----|-----|-----|-----|
| `api/coding/paas/v4` (OpenAI) | 1,129 | **6.93s** | 6.24s | 11.11s | 25.14s | **104.99s** |
| `api/anthropic` | 292 | **8.72s** | 7.99s | 14.88s | 24.95s | 37.60s |

**Conclusion:** Anthropic endpoint is ~25% slower on average. OpenAI endpoint has the most extreme outliers.

---

## ⚠️ Reliability Issues

### Connection Errors

| SDK | Count |
|-----|-------|
| OpenAI SDK | 24 |
| Anthropic SDK | 4 |
| **Total** | **28** |

**Pattern:** Distributed across all three days and both endpoints → provider-side network/ingress instability.

### Retry Distribution

| Attempt | Count |
|---------|-------|
| 1 | 28 |
| 2 | 5 |
| 3 | 2 |
| 4 | 2 |
| 5 | 1 |

**Retry rate:** 2.7% over 1,425 successful requests.

---

## 💰 Token & Cache Overhead

### MCP Tool Search Context (per request)

| Metric | Value |
|--------|-------|
| Avg context tokens | **23,310** |
| Median | 15,652 |
| p95 | 52,439 |
| Max | 52,439 |

### Cache Hit Rate

| Metric | Value |
|--------|-------|
| Avg | **95.4%** |
| Median | 99.3% |
| p95 | 99.9% |

### Estimated Token Savings

| Metric | Avg | p50 | p95 |
|--------|-----|-----|-----|
| Net tool context | 22,003 | 20,351 | 25,159 |
| Tokens saved | 27,231 | 27,400 | 27,842 |

---

## 🆚 GLM-5.2 vs Other Models

| Model | Avg TTFT | Max TTFT |
|-------|----------|----------|
| **Z.ai GLM-5.2** | **7.30s** | **104.99s** |
| DeepSeek-V4-Flash | 2.28s | 10.68s |
| MiniMax-M3 | 2.71s | 6.13s |
| DeepSeek-V4-Pro | 2.77s | 9.81s |
| Kimi-K2.7-Code | 3.42s | 30.72s |
| MiMo-V2.5 | 3.48s | 7.26s |

**GLM-5.2 is 2–3× slower on average than alternatives.**

---

## 📦 OpenCodeGo Custom Wrappers

| Model | Events | Input Tokens Avg | Output Tokens Avg | Reasoning Tokens |
|-------|--------|------------------|-------------------|------------------|
| `custom:GLM-5.2-0` | 29,914 | 21,872 | 2,020 | 0 |
| `custom:GLM-5.2-anthropic-0` | 1,980 | 5,061 | 138 | 61 |

**Notes:**
- `custom:GLM-5.2-0` is used ~15× more than the Anthropic variant
- Context windows grow up to ~247K tokens in long sessions
- **No TTFT telemetry available** for custom wrappers
- Cache read tokens up to 69M (likely lifetime counters)

---

## 📈 Worst TTFT Outliers

| Timestamp | TTFT | Endpoint |
|-----------|------|----------|
| 2026-07-07T13:17:27Z | **104.99s** | OpenAI |
| 2026-07-07T08:26:33Z | 37.60s | Anthropic |
| 2026-07-06T16:23:31Z | 35.10s | OpenAI |
| 2026-07-07T08:24:01Z | 31.52s | Anthropic |
| 2026-07-07T12:58:41Z | 29.55s | OpenAI |

---

## 🔍 Session Impact Highlights

| Session | Duration | Requests | Avg TTFT | 429s |
|---------|----------|----------|----------|------|
| 8a86a1e8… | 241 min | 447 | ~7.0s | 48 |
| 4e508363… | 170 min | 160 | ~5.9s | 0 |
| e4dfb169… | 37 min | 167 | ~7.5s | 12 |
| 30b21612… | 24 min | 33 | ~10.0s | 2 |

---

## ✅ Actions for Z.ai

1. Investigate TTFT degradation (5.9s → 9.9s in 48h)
2. Root-cause 28 connection errors across both endpoints
3. Explain Anthropic endpoint being 25% slower than OpenAI endpoint
4. Investigate 104.99s TTFT outlier on 2026-07-07T13:17:27Z
5. Provide GLM-5.2 rate limits and recommended burst handling

---

## 📎 Source Files

- [Z.ai GLM-5.2 Bug Report](https://github.com/SoulWayy/droid-forensics/blob/master/zai-glm52-bug-report.md)
- [OpenCodeGo Custom Wrapper Report](https://github.com/SoulWayy/droid-forensics/blob/master/opencodego-glm52-custom-report.md)
- [Full Commit](https://github.com/SoulWayy/droid-forensics/commit/ec87694)
