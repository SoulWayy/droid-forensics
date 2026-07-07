# DEPRECATED — GLM 5.2 Metrics (Mixed Data)

**This file is deprecated.** The earlier analysis mixed two different GLM-5.2 usage paths:

1. **Direct Z.ai API calls** → `glm-5.2` model ID, endpoints:
   - `https://api.z.ai/api/coding/paas/v4` (OpenAI-compatible)
   - `https://api.z.ai/api/anthropic` (Anthropic-compatible)

2. **OpenCodeGo custom wrappers** → model IDs:
   - `custom:GLM-5.2-0`
   - `custom:GLM-5.2-anthropic-0`

These have very different telemetry characteristics and should be reported separately.

## Use these reports instead:

- **For Z.ai bug report:** [`zai-glm52-bug-report.md`](./zai-glm52-bug-report.md)
  - 1,421 TTFT samples
  - Direct endpoint evidence
  - Connection errors
  - Daily degradation trend
  - Endpoint comparison

- **For OpenCodeGo custom wrapper analysis:** [`opencodego-glm52-custom-report.md`](./opencodego-glm52-custom-report.md)
  - Token usage per wrapper variant
  - Cache read/write behavior
  - Session-level analysis
  - No TTFT telemetry available

---

*This file is kept for reference only. Please use the split reports above.*
