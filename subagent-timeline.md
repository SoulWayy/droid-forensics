# Error Timeline Analysis

**Source files:** `/home/jan/.factory/logs/droid-log-single.log`, `/home/jan/.factory/logs/console.log`
**Total ERROR lines found:** 113
  - `droid-log-single.log`: 27
  - `console.log`: 86

## Legend
  `429-rate-limit      `  4 occurrences
  `bad-setstate        `  8 occurrences
  `cmd-error           `  7 occurrences
  `dup-key             `  70 occurrences
  `handler-throw       `  1 occurrences
  `max-update-depth    `  8 occurrences
  `mcp-tools           `  10 occurrences
  `persist             `  3 occurrences
  `session-create      `  1 occurrences
  `sound-fail          `  1 occurrences

## Timeline (errors per minute)

Each `#` represents 1 error. Annotations mark key events.

07-06 22:43 | #                                                            [ 1] dup-key=1  <-- dup-key burst
07-06 22:44 | #                                                            [ 1] dup-key=1  <-- dup-key burst
07-07 05:08 | ###                                                          [ 3] persist=3
07-07 05:09 | #                                                            [ 1] session-create=1
07-07 05:26 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 06:10 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 07:09 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 07:11 | ##                                                           [ 2] dup-key=2  <-- dup-key burst
07-07 07:22 | ##                                                           [ 2] dup-key=2  <-- dup-key burst
07-07 07:35 | ######                                                       [ 6] dup-key=6  <-- dup-key burst
07-07 07:38 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 08:05 | #                                                            [ 1] cmd-error=1
07-07 08:11 | #                                                            [ 1] cmd-error=1
07-07 08:14 | #                                                            [ 1] cmd-error=1
07-07 08:49 | #####                                                        [ 5] max-update-depth=5  <-- max-update-depth
07-07 08:50 | ###                                                          [ 3] max-update-depth=3  <-- max-update-depth
07-07 09:00 | #                                                            [ 1] sound-fail=1
07-07 09:17 | #                                                            [ 1] dup-key=1  <-- dup-key burst
07-07 11:01 | #                                                            [ 1] dup-key=1  <-- dup-key burst
07-07 11:02 | ##                                                           [ 2] cmd-error=1 handler-throw=1
07-07 11:13 | ##                                                           [ 2] dup-key=2  <-- dup-key burst
07-07 11:29 | ##                                                           [ 2] cmd-error=2
07-07 11:30 | #                                                            [ 1] 429-rate-limit=1  <-- FIRST 429
07-07 11:31 | #####                                                        [ 5] dup-key=5  <-- dup-key burst
07-07 11:40 | ###                                                          [ 3] dup-key=3  <-- dup-key burst
07-07 11:49 | ##                                                           [ 2] dup-key=2  <-- dup-key burst
07-07 11:50 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 11:52 | ####                                                         [ 4] dup-key=4  <-- dup-key burst
07-07 11:53 | ##########                                                   [10] dup-key=10  <-- dup-key burst
07-07 11:55 | #                                                            [ 1] 429-rate-limit=1  <-- 429
07-07 11:56 | ####                                                         [ 4] dup-key=4  <-- dup-key burst
07-07 11:57 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 11:58 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 12:22 | ###                                                          [ 3] dup-key=3  <-- dup-key burst
07-07 12:24 | ####                                                         [ 4] dup-key=4  <-- dup-key burst
07-07 12:28 | #                                                            [ 1] bad-setstate=1  <-- setState-in-render
07-07 12:30 | #######                                                      [ 7] 429-rate-limit=1 dup-key=6  <-- 429
07-07 12:33 | ##                                                           [ 2] dup-key=2  <-- dup-key burst
07-07 12:39 | ####                                                         [ 4] dup-key=4  <-- dup-key burst
07-07 12:50 | ##                                                           [ 2] dup-key=2  <-- dup-key burst
07-07 13:22 | #                                                            [ 1] cmd-error=1
07-07 13:24 | #                                                            [ 1] 429-rate-limit=1  <-- 429
07-07 13:28 | ####                                                         [ 4] dup-key=4  <-- dup-key burst
07-07 13:29 | ##                                                           [ 2] mcp-tools=2
07-07 13:30 | ########                                                     [ 8] mcp-tools=8
07-07 13:34 | #                                                            [ 1] dup-key=1  <-- dup-key burst

## Causal Cascade Analysis

### First occurrence order
  1. `dup-key`  —  2026-07-06 22:43:59.912Z
  2. `persist`  —  2026-07-07 05:08:58.135Z
  3. `session-create`  —  2026-07-07 05:09:01.595Z
  4. `bad-setstate`  —  2026-07-07 05:26:38.096Z
  5. `cmd-error`  —  2026-07-07 08:05:33.791Z
  6. `max-update-depth`  —  2026-07-07 08:49:13.888Z
  7. `sound-fail`  —  2026-07-07 09:00:22.876Z
  8. `handler-throw`  —  2026-07-07 11:02:59.331Z
  9. `429-rate-limit`  —  2026-07-07 11:30:42.238Z
  10. `mcp-tools`  —  2026-07-07 13:29:31.684Z

### 429 vs dup-key ordering
  **dup-key FIRST**: 22:43:59Z  BEFORE  429 at 11:30:42Z
  Implication: the React render issues (dup keys) preceded the API rate-limit.
  This points to a pre-existing UI bug in the TUI component tree that may have
  contributed to the cascade, rather than being caused by it.

### Narrative
| Time window | Events |
|---|---|
| Evening session (Jul 6) | dup-key x2 |
| Early morning | bad-setstate x1, persist x3, session-create x1 |
| Morning | bad-setstate x2, dup-key x10 |
| Late morning | cmd-error x3, max-update-depth x8 |
| Midday | dup-key x1, sound-fail x1 |
| Early afternoon | 429-rate-limit x2, bad-setstate x3, cmd-error x3, dup-key x31, handler-throw x1 |
| Afternoon | 429-rate-limit x2, bad-setstate x1, cmd-error x1, dup-key x26, mcp-tools x10 |

## All Errors (chronological)

   1. `2026-07-06 22:43:59.912` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
   2. `2026-07-06 22:44:00.249` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
   3. `2026-07-07 05:08:58.135` [persist             ] Failed to persist settings
      src: droid-log-single
   4. `2026-07-07 05:08:58.925` [persist             ] Failed to persist settings
      src: droid-log-single
   5. `2026-07-07 05:08:59.106` [persist             ] Failed to persist settings
      src: droid-log-single
   6. `2026-07-07 05:09:01.595` [session-create      ] [useDaemonAgent] Failed to create session
      src: droid-log-single
   7. `2026-07-07 05:26:38.096` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
   8. `2026-07-07 06:10:35.892` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
   9. `2026-07-07 07:09:59.103` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
  10. `2026-07-07 07:11:13.238` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  11. `2026-07-07 07:11:13.424` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  12. `2026-07-07 07:22:29.698` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  13. `2026-07-07 07:22:29.922` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  14. `2026-07-07 07:35:38.353` [dup-key             ] Encountered two children with the same key, `header-built_in_commands`. Keys should be unique so that components maintai
      src: console.log
  15. `2026-07-07 07:35:40.200` [dup-key             ] Encountered two children with the same key, `header-built_in_commands`. Keys should be unique so that components maintai
      src: console.log
  16. `2026-07-07 07:35:41.108` [dup-key             ] Encountered two children with the same key, `header-custom_skills`. Keys should be unique so that components maintain th
      src: console.log
  17. `2026-07-07 07:35:41.379` [dup-key             ] Encountered two children with the same key, `header-custom_skills`. Keys should be unique so that components maintain th
      src: console.log
  18. `2026-07-07 07:35:52.782` [dup-key             ] Encountered two children with the same key, `header-built_in_commands`. Keys should be unique so that components maintai
      src: console.log
  19. `2026-07-07 07:35:53.011` [dup-key             ] Encountered two children with the same key, `header-built_in_commands`. Keys should be unique so that components maintai
      src: console.log
  20. `2026-07-07 07:38:09.400` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
  21. `2026-07-07 08:05:33.791` [cmd-error           ] Error running droid command
      src: droid-log-single
  22. `2026-07-07 08:11:38.580` [cmd-error           ] Error running droid command
      src: droid-log-single
  23. `2026-07-07 08:14:49.357` [cmd-error           ] Error running droid command
      src: droid-log-single
  24. `2026-07-07 08:49:13.888` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  25. `2026-07-07 08:49:23.597` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  26. `2026-07-07 08:49:34.026` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  27. `2026-07-07 08:49:45.250` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  28. `2026-07-07 08:49:58.133` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  29. `2026-07-07 08:50:15.610` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  30. `2026-07-07 08:50:36.239` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  31. `2026-07-07 08:50:51.052` [max-update-depth    ] Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either do
      src: console.log
  32. `2026-07-07 09:00:22.876` [sound-fail          ] Failed to play sound file | Context: {"filePath":"/home/jan/.factory/sounds/fx-ack01.wav","command":"ffplay","cause":{"n
      src: droid-log-single
  33. `2026-07-07 09:17:00.374` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  34. `2026-07-07 11:01:05.233` [dup-key             ] Encountered two children with the same key, `header-session`. Keys should be unique so that components maintain their id
      src: console.log
  35. `2026-07-07 11:02:59.331` [handler-throw       ] [InProcessDaemonRuntime] Handler threw
      src: droid-log-single
  36. `2026-07-07 11:02:59.335` [cmd-error           ] Error running /compact flow
      src: droid-log-single
  37. `2026-07-07 11:13:56.040` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  38. `2026-07-07 11:13:56.290` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  39. `2026-07-07 11:29:36.477` [cmd-error           ] Error running droid command
      src: droid-log-single
  40. `2026-07-07 11:29:43.280` [cmd-error           ] Error running droid command
      src: droid-log-single
  41. `2026-07-07 11:30:42.238` [429-rate-limit      ] [SessionStateManager] Session error notification | Context: {"sessionId":"5c719f77-35dc-4d43-be2e-2c738938b127","type":"
      src: droid-log-single
  42. `2026-07-07 11:31:47.386` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  43. `2026-07-07 11:31:47.538` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  44. `2026-07-07 11:31:47.825` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  45. `2026-07-07 11:31:48.226` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  46. `2026-07-07 11:31:48.474` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  47. `2026-07-07 11:40:11.469` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  48. `2026-07-07 11:40:11.913` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  49. `2026-07-07 11:40:12.536` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  50. `2026-07-07 11:49:43.300` [dup-key             ] Encountered two children with the same key, `header-session`. Keys should be unique so that components maintain their id
      src: console.log
  51. `2026-07-07 11:49:43.530` [dup-key             ] Encountered two children with the same key, `header-session`. Keys should be unique so that components maintain their id
      src: console.log
  52. `2026-07-07 11:50:19.182` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
  53. `2026-07-07 11:52:00.603` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  54. `2026-07-07 11:52:00.924` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  55. `2026-07-07 11:52:01.318` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  56. `2026-07-07 11:52:01.562` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  57. `2026-07-07 11:53:18.270` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  58. `2026-07-07 11:53:18.488` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  59. `2026-07-07 11:53:19.175` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  60. `2026-07-07 11:53:19.328` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  61. `2026-07-07 11:53:19.438` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  62. `2026-07-07 11:53:20.816` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  63. `2026-07-07 11:53:21.894` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  64. `2026-07-07 11:53:22.059` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  65. `2026-07-07 11:53:22.777` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  66. `2026-07-07 11:53:24.663` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  67. `2026-07-07 11:55:46.912` [429-rate-limit      ] [SessionStateManager] Session error notification | Context: {"sessionId":"16f12abc-1479-422f-9231-6dbf3c03fd01","type":"
      src: droid-log-single
  68. `2026-07-07 11:56:45.892` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  69. `2026-07-07 11:56:46.511` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  70. `2026-07-07 11:56:46.798` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  71. `2026-07-07 11:56:47.014` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  72. `2026-07-07 11:57:36.408` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
  73. `2026-07-07 11:58:57.785` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
  74. `2026-07-07 12:22:19.381` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  75. `2026-07-07 12:22:20.226` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  76. `2026-07-07 12:22:20.749` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  77. `2026-07-07 12:24:29.924` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  78. `2026-07-07 12:24:30.071` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  79. `2026-07-07 12:24:30.591` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  80. `2026-07-07 12:24:30.935` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  81. `2026-07-07 12:28:00.028` [bad-setstate        ] Cannot update a component (`jnM`) while rendering a different component (`jnM`). To locate the bad setState() call insid
      src: console.log
  82. `2026-07-07 12:30:43.566` [429-rate-limit      ] [SessionStateManager] Session error notification | Context: {"sessionId":"16f12abc-1479-422f-9231-6dbf3c03fd01","type":"
      src: droid-log-single
  83. `2026-07-07 12:30:49.955` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  84. `2026-07-07 12:30:50.126` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  85. `2026-07-07 12:30:50.859` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  86. `2026-07-07 12:30:51.030` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  87. `2026-07-07 12:30:58.772` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  88. `2026-07-07 12:30:59.081` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  89. `2026-07-07 12:33:56.539` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  90. `2026-07-07 12:33:56.698` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  91. `2026-07-07 12:39:05.455` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  92. `2026-07-07 12:39:05.815` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  93. `2026-07-07 12:39:06.304` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  94. `2026-07-07 12:39:06.618` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  95. `2026-07-07 12:50:51.937` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  96. `2026-07-07 12:50:52.092` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
  97. `2026-07-07 13:22:53.462` [cmd-error           ] Error running droid command
      src: droid-log-single
  98. `2026-07-07 13:24:04.534` [429-rate-limit      ] [SessionStateManager] Session error notification | Context: {"sessionId":"e5eb7c4c-3945-4fd9-b085-6bc52e8e38e1","type":"
      src: droid-log-single
  99. `2026-07-07 13:28:37.579` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
 100. `2026-07-07 13:28:38.595` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
 101. `2026-07-07 13:28:39.537` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
 102. `2026-07-07 13:28:40.298` [dup-key             ] Encountered two children with the same key, `header-configs`. Keys should be unique so that components maintain their id
      src: console.log
 103. `2026-07-07 13:29:31.684` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 104. `2026-07-07 13:29:31.687` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 105. `2026-07-07 13:30:02.542` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 106. `2026-07-07 13:30:02.589` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 107. `2026-07-07 13:30:04.963` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 108. `2026-07-07 13:30:04.966` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 109. `2026-07-07 13:30:05.486` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 110. `2026-07-07 13:30:05.490` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 111. `2026-07-07 13:30:06.185` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 112. `2026-07-07 13:30:06.188` [mcp-tools           ] [McpHub] Failed to list tools for MCP server
      src: droid-log-single
 113. `2026-07-07 13:34:58.116` [dup-key             ] Encountered two children with the same key, `header-session`. Keys should be unique so that components maintain their id
      src: console.log

---
*Analysis generated by `analyze_errors.py` -- READ ONLY, no files modified.*
