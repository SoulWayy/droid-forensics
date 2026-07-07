# Droid Session Analysis

Generated from: `/home/jan/.factory/logs/droid-log-single.log`
Total lines scanned: 103,994
Unique sessions found: 42

## Summary Statistics

### Subcommands
- `exec`: 38
- `unknown`: 1
- `doctor`: 1
- `config`: 1
- `claude-haiku-4-5`: 1

### Model Providers
- `custom:GLM-5.2-0`: 11
- `custom:OpenCodeGo-Kimi-K2.7-Code-0`: 9
- `unknown`: 5
- `custom:GLM-5.2-anthropic-0`: 5
- `custom:OpenCodeGo-DeepSeek-V4-Flash-0`: 4
- `custom:ClinePass-DeepSeek-V4-Flash-0`: 3
- `custom:OpenCodeGo-MiMo-V2.5-0`: 2
- `custom:OpenCodeGo-MiniMax-M2.7-0`: 1
- `custom:OpenCodeGo-DeepSeek-V4-Pro-0`: 1
- `custom:OpenCodeGo-MiniMax-M3-0`: 1

### Error Type Occurrence (across all sessions)
- `429`: 38 sessions

### End Status Distribution
- `unknown`: 19
- `clean_shutdown`: 14
- `errored`: 9

---

## Per-Session Details

| # | Session ID | Start | End | Duration | Subcommand | Notif Count | Error Types | Model | BYOK | MCP Servers | End Status |
|---|-----------|-------|-----|----------|-----------|-------------|-------------|-------|------|-------------|------------|
| 1 | `7eb79ae6` | 2026-07-06T22:43:48.534Z | 2026-07-06T22:44:17.592Z | 29s | `exec` | 0 | 429 | `unknown` | no | linear, notion, playwright | clean_shutdown |
| 2 | `d5d547ad` | 2026-07-07T05:08:58.884Z | 2026-07-07T05:09:01.762Z | 2s | `unknown` | 0 | none | `unknown` | no | none | errored |
| 3 | `b1b34116` | 2026-07-07T05:26:37.966Z | 2026-07-07T06:06:37.060Z | 39m59s | `doctor` | 2193 | 429 | `unknown` | no | none | unknown |
| 4 | `3bbc864a` | 2026-07-07T05:26:43.612Z | 2026-07-07T05:29:20.529Z | 2m36s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | none | unknown |
| 5 | `5c719f77` | 2026-07-07T07:09:58.902Z | 2026-07-07T11:49:43.959Z | 4h39m | `exec` | 12729 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | clean_shutdown |
| 6 | `99c2040a` | 2026-07-07T08:03:49.915Z | 2026-07-07T08:05:34.479Z | 1m44s | `exec` | 0 | 429 | `custom:ClinePass-DeepSeek-V4-Flash-0` | yes | linear, notion, playwright | errored |
| 7 | `575661e6` | 2026-07-07T08:05:54.528Z | 2026-07-07T08:06:05.209Z | 10s | `exec` | 0 | 429 | `custom:ClinePass-DeepSeek-V4-Flash-0` | yes | none | errored |
| 8 | `31bcc154` | 2026-07-07T08:06:57.959Z | 2026-07-07T08:06:59.065Z | 1s | `exec` | 0 | none | `custom:GLM-5.2-0` | yes | none | unknown |
| 9 | `007c9c16` | 2026-07-07T08:07:34.258Z | 2026-07-07T08:07:36.075Z | 1s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | clean_shutdown |
| 10 | `0733aaae` | 2026-07-07T08:07:55.660Z | 2026-07-07T08:08:01.598Z | 5s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | clean_shutdown |
| 11 | `f805e744` | 2026-07-07T08:08:35.935Z | 2026-07-07T08:08:51.144Z | 15s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | unknown |
| 12 | `fc161daa` | 2026-07-07T08:09:11.314Z | 2026-07-07T08:09:56.975Z | 45s | `exec` | 0 | 429 | `custom:ClinePass-DeepSeek-V4-Flash-0` | yes | linear, notion, playwright | clean_shutdown |
| 13 | `00d08671` | 2026-07-07T08:11:37.135Z | 2026-07-07T08:11:39.565Z | 2s | `exec` | 0 | 429 | `custom:OpenCodeGo-DeepSeek-V4-Flash-0` | yes | linear, notion, playwright | errored |
| 14 | `af3839b6` | 2026-07-07T08:12:22.505Z | 2026-07-07T08:12:28.024Z | 5s | `exec` | 0 | 429 | `custom:OpenCodeGo-DeepSeek-V4-Flash-0` | yes | linear, notion, playwright | unknown |
| 15 | `e898e630` | 2026-07-07T08:12:53.161Z | 2026-07-07T08:13:44.273Z | 51s | `exec` | 0 | 429 | `custom:OpenCodeGo-DeepSeek-V4-Flash-0` | yes | linear, notion, playwright | unknown |
| 16 | `f62dad8f` | 2026-07-07T08:14:08.783Z | 2026-07-07T08:14:50.440Z | 41s | `exec` | 0 | 429 | `custom:GLM-5.2-anthropic-0` | yes | linear, notion, playwright | errored |
| 17 | `044a11bf` | 2026-07-07T08:15:21.990Z | 2026-07-07T08:18:00.815Z | 2m38s | `exec` | 0 | 429 | `custom:GLM-5.2-anthropic-0` | yes | linear, notion, playwright | clean_shutdown |
| 18 | `8e5198bb` | 2026-07-07T08:18:30.433Z | 2026-07-07T08:19:50.398Z | 1m19s | `exec` | 0 | 429 | `custom:OpenCodeGo-MiMo-V2.5-0` | yes | linear, notion, playwright | unknown |
| 19 | `4a7b5949` | 2026-07-07T08:21:20.738Z | 2026-07-07T08:25:02.834Z | 3m42s | `exec` | 0 | 429 | `custom:GLM-5.2-anthropic-0` | yes | linear, notion, playwright | clean_shutdown |
| 20 | `ae97b9a1` | 2026-07-07T08:22:27.685Z | 2026-07-07T08:39:45.795Z | 17m18s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | unknown |
| 21 | `4618f689` | 2026-07-07T08:22:28.644Z | 2026-07-07T08:28:00.032Z | 5m31s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | unknown |
| 22 | `7cbcd792` | 2026-07-07T08:22:28.700Z | 2026-07-07T08:47:44.257Z | 25m15s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | clean_shutdown |
| 23 | `9ee29577` | 2026-07-07T08:25:44.527Z | 2026-07-07T08:30:14.050Z | 4m29s | `exec` | 0 | 429 | `custom:GLM-5.2-anthropic-0` | yes | linear, notion, playwright | clean_shutdown |
| 24 | `9abf53f7` | 2026-07-07T08:31:18.318Z | 2026-07-07T08:34:22.039Z | 3m3s | `exec` | 0 | 429 | `custom:OpenCodeGo-MiniMax-M2.7-0` | yes | linear, notion, playwright | unknown |
| 25 | `0b3e423a` | 2026-07-07T08:31:19.191Z | 2026-07-07T08:32:58.208Z | 1m39s | `exec` | 0 | 429 | `custom:OpenCodeGo-DeepSeek-V4-Flash-0` | yes | linear, notion, playwright | unknown |
| 26 | `90ad69d1` | 2026-07-07T08:31:20.583Z | 2026-07-07T08:34:16.492Z | 2m55s | `exec` | 0 | 429 | `custom:OpenCodeGo-MiMo-V2.5-0` | yes | linear, notion, playwright | unknown |
| 27 | `64b74d9a` | 2026-07-07T08:34:57.604Z | 2026-07-07T08:38:40.593Z | 3m42s | `exec` | 0 | 429 | `custom:GLM-5.2-anthropic-0` | yes | linear, notion, playwright | clean_shutdown |
| 28 | `4ea46a22` | 2026-07-07T08:39:05.518Z | 2026-07-07T08:40:20.377Z | 1m14s | `exec` | 0 | 429 | `custom:OpenCodeGo-DeepSeek-V4-Pro-0` | yes | linear, notion, playwright | unknown |
| 29 | `fc22d517` | 2026-07-07T09:05:26.761Z | 2026-07-07T09:18:49.313Z | 13m22s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | clean_shutdown |
| 30 | `84e5341d` | 2026-07-07T09:23:26.812Z | 2026-07-07T09:30:49.639Z | 7m22s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | unknown |
| 31 | `8880cc2b` | 2026-07-07T11:18:45.409Z | 2026-07-07T11:24:40.972Z | 5m55s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | unknown |
| 32 | `ce5cf9c3` | 2026-07-07T11:18:45.667Z | 2026-07-07T11:29:44.807Z | 10m59s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | errored |
| 33 | `04f7c773` | 2026-07-07T11:18:46.306Z | 2026-07-07T11:29:38.385Z | 10m52s | `exec` | 0 | 429 | `custom:OpenCodeGo-Kimi-K2.7-Code-0` | yes | linear, notion, playwright | errored |
| 34 | `16f12abc` | 2026-07-07T11:50:18.915Z | 2026-07-07T13:34:58.781Z | 1h44m | `exec` | 9207 | 429 | `custom:OpenCodeGo-MiniMax-M3-0` | yes | linear, notion, playwright | clean_shutdown |
| 35 | `dc6c3462` | 2026-07-07T11:57:35.875Z | 2026-07-07T11:58:28.977Z | 53s | `config` | 304 | none | `unknown` | no | none | unknown |
| 36 | `4dc07934` | 2026-07-07T11:57:43.006Z | 2026-07-07T11:58:29.235Z | 46s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | clean_shutdown |
| 37 | `f86f678d` | 2026-07-07T12:27:59.866Z | 2026-07-07T12:28:27.390Z | 27s | `claude-haiku-4-5` | 229 | none | `unknown` | no | none | unknown |
| 38 | `a06e46c0` | 2026-07-07T12:28:05.741Z | 2026-07-07T12:28:20.921Z | 15s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | clean_shutdown |
| 39 | `e5eb7c4c` | 2026-07-07T12:49:26.515Z | 2026-07-07T13:30:06.506Z | 40m39s | `exec` | 7332 | 429 | `custom:GLM-5.2-0` | yes | none | errored |
| 40 | `30b21612` | 2026-07-07T12:58:08.597Z | 2026-07-07T13:22:54.197Z | 24m45s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | errored |
| 41 | `ae84e790` | 2026-07-07T12:58:09.850Z | 2026-07-07T13:00:47.743Z | 2m37s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | unknown |
| 42 | `a2e92460` | 2026-07-07T12:58:11.138Z | 2026-07-07T13:04:33.091Z | 6m21s | `exec` | 0 | 429 | `custom:GLM-5.2-0` | yes | linear, notion, playwright | unknown |

### Error Details

- **Session `5c719f77`** (exec):
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 10h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 10h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 10h, please try again later.
  - ... and 2 more
- **Session `99c2040a`** (exec):
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - ... and 2 more
- **Session `575661e6`** (exec):
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - ... and 1 more
- **Session `fc161daa`** (exec):
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 13h, please try again later.
  - ... and 2 more
- **Session `ce5cf9c3`** (exec):
  - 429 5-hour usage limit reached. Resets in 55min. To continue using this model now, enable usage from your available balance: https://opencode.ai/workspace/wrk_01KWQC83NRQ65079XW4XH7CTBE/go
  - 429 5-hour usage limit reached. Resets in 55min. To continue using this model now, enable usage from your available balance: https://opencode.ai/workspace/wrk_01KWQC83NRQ65079XW4XH7CTBE/go
  - 429 5-hour usage limit reached. Resets in 55min. To continue using this model now, enable usage from your available balance: https://opencode.ai/workspace/wrk_01KWQC83NRQ65079XW4XH7CTBE/go
  - ... and 2 more
- **Session `04f7c773`** (exec):
  - 429 5-hour usage limit reached. Resets in 56min. To continue using this model now, enable usage from your available balance: https://opencode.ai/workspace/wrk_01KWQC83NRQ65079XW4XH7CTBE/go
  - 429 5-hour usage limit reached. Resets in 56min. To continue using this model now, enable usage from your available balance: https://opencode.ai/workspace/wrk_01KWQC83NRQ65079XW4XH7CTBE/go
  - 429 5-hour usage limit reached. Resets in 55min. To continue using this model now, enable usage from your available balance: https://opencode.ai/workspace/wrk_01KWQC83NRQ65079XW4XH7CTBE/go
  - ... and 2 more
- **Session `16f12abc`** (exec):
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 9h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 9h, please try again later.
  - 429 Error 429: You have reached your weekly Clinepass limit. The limit resets in 4d 9h, please try again later.
  - ... and 2 more
- **Session `e5eb7c4c`** (exec):
  - 429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10
  - 429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10
  - 429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10
  - ... and 2 more
- **Session `30b21612`** (exec):
  - 429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10
  - 429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10
  - 429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10
  - ... and 2 more
