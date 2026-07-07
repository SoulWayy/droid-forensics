# Droid Log Distillatie — Complete Statistieken

**Bron:** `/home/jan/.factory/logs/droid-log-single.log` (64 MB, 103.994 regels) + `console.log` (39 KB, 153 regels)
**Datum:** 6–7 Juli 2026
**Versie:** 0.164.0 → 0.164.1 (laatste sessies)
**Doel:** Alle mogelijke statistieken uit de logs halen, exclusief bekende fouten (rate-limit e.d.)

---

## 1. LOG NIVEAU OVERZICHT

| Niveau | droid-log-single | console.log |
|--------|------------------|-------------|
| **INFO** | 79.667 (76,6%) | 67 (43,8%) |
| **WARN** | 2.338 (2,2%) | 0 |
| **ERROR** | 27 (0,03%) | 86 (56,2%) |
| **Totaal** | 103.994 | 153 |

**Conclusie:** De enorme omvang van `droid-log-single.log` (64 MB) wordt gedomineerd door INFO-regels — met name metrics-telemetrie. Slechts **27 errors** in de daadwerkelijke droid log vs. 86 in console.log (React errors).

---

## 2. METRICS ECOSYSTEM (49.923 metrics entries totaal)

### 2a. Meest voorkomende metrics

| Metric | Aantal | Opvallende waarden |
|--------|--------|-------------------|
| `factory_app_jsonrpc_notification_count` | **31.994** (64%) | 18 notificatietypes (zie §4) |
| `mcp_tool_search_context_tokens` | 3.292 | avg=22.581, p50=20.335, p95=49.514, max=53.159 tokens |
| `skill_loaded_count` | 2.627 | max=196 skills per sessie |
| `droid_mode_tool_execution_latency` | 1.182 | avg=7ms, p95=5ms, max=1.524ms |
| `cli_tui_keypress_queue_latency` | 945 | **EXTREEM**: p50=0.11ms, p95=43.549ms, max=105.470ms |
| `cli_startup_settings_dynamic_config_latency` | 910 | p50=2ms, p95=62ms |
| `cli_startup_settings_org_latency` | 910 | p50=1.43ms, p95=549ms (zeer skewed!) |
| `mcp_tool_search_estimated_token_savings` | 823 | cache savings tracking |
| `mcp_tool_search_cache_hit_rate` | 823 | cache hit/miss ratio |
| `droid_chat_client_success_count` | 823 | succesvolle LLM calls |
| `chat_client_time_to_first_token` | 820 | zie §2c |
| `cli_tui_input_handler_latency` | 743 | p50=0.19ms, p95=92.9ms, max=3.196ms |
| `cli_tui_input_frame_latency` | 591 | avg=144ms, p50=130ms, p95=375ms, max=3.286ms |
| `cli_tui_input_commit_latency` | 582 | avg=225ms, p50=163ms, p95=489ms, max=6.108ms |
| `cli_tui_input_layout_rows` | 589 | avg=2.06, p95=8 rows |
| `cli_tui_input_hidden_rows` | 589 | avg=0.07 (meestal 0, max=2) |
| `cli_tui_slash_match_latency` | 179 | avg=63ms, p50=68ms, p95=140ms |
| `mcp_server_start_latency_ms` | 120 | MCP server opstarttijden |
| `daemon_cron_operation_count` | 58 | cron operaties |

### 2b. Startup Latenties — CLI bootstrap is TRAAG

| Metric | Aantal | Gem | p50 | p95 | Max |
|--------|--------|-----|-----|-----|-----|
| **cli_startup_total_latency** | 39 | **18.901ms** | 13.232ms | 37.236ms | 37.766ms |
| cli_startup_bootstrap_latency | 52 | 3.122ms | 2.641ms | 5.860ms | 6.824ms |
| cli_startup_settings_init_latency | 50 | 998ms | 676ms | 4.558ms | 6.449ms |
| cli_startup_task_tools_init_latency | 50 | 783ms | 620ms | 1.463ms | 1.550ms |
| cli_startup_feature_flags_warm_latency | 50 | 507ms | 491ms | 871ms | 1.196ms |
| cli_startup_certificates_latency | 53 | 170ms | 125ms | 416ms | 423ms |
| cli_startup_auth_token_latency | 53 | 20ms | 11ms | 41ms | 393ms |
| cli_startup_certificate_loaded_count | 53 | 545 | 289 | 1.445 | 1.445 |
| cli_startup_idle_rss_mb | 7 | 367MB | 307MB | 750MB | 750MB |
| cli_startup_update_latency | 9 | 1.840ms | 52ms | 16.140ms(!) | 16.140ms |
| cli_startup_update_check_latency | 8 | 50ms | 50ms | 68ms | 68ms |

### 2c. Time to First Token (TTFT) per Model — Grote verschillen!

| Model | # Samples | Gemiddeld | p50 | Max |
|-------|-----------|-----------|-----|-----|
| **glm-5.2** | 180 | **9,95s** | 8,43s | 104,99s |
| minimax-m2.7 | 16 | 6,33s | 6,16s | 11,44s |
| kimi-k2.7-code | 460 | 3,42s | 3,12s | 30,72s |
| mimo-v2.5 | 39 | 3,48s | 3,23s | 7,26s |
| deepseek-v4-pro | 33 | 2,77s | 2,26s | 9,81s |
| minimax-m3 | 69 | 2,71s | 2,40s | 6,13s |
| deepseek-v4-flash | 23 | 2,28s | 1,61s | 10,68s |

**Let op:** glm-5.2 is **4-5x trager** dan de snelste modellen, met een outlier tot **105 seconden**!

### 2d. Overige Latentie Distributies

| Metric | # Samples | Gem | p50 | p95 | Max |
|--------|-----------|-----|-----|-----|-----|
| **cli_tui_first_visible_latency** | 8 | **8.751ms** | 10.280ms | 17.047ms | 17.047ms |
| cli_tui_render_call_latency | 8 | 169ms | 162ms | 336ms | 336ms |
| cli_tui_file_index_latency | 38 | 261ms | 213ms | 676ms | 1.039ms |
| cli_jsonrpc_child_ready_latency | 8 | **4.703ms** | 4.642ms | 6.142ms | 6.142ms |
| cli_jsonrpc_child_spawn_latency | 9 | 10ms | 6ms | 27ms | 27ms |
| cli_jsonrpc_initialize_session_latency | 5 | 1.016ms | 1.032ms | 1.128ms | 1.128ms |
| cli_jsonrpc_init_create_session_latency | 5 | 965ms | 996ms | 1.113ms | 1.113ms |
| cli_jsonrpc_init_cwd_settings_refresh_latency | 5 | 609ms | 605ms | 765ms | 765ms |
| cli_jsonrpc_init_session_persist_latency | 5 | 334ms | 298ms | 535ms | 535ms |
| cli_jsonrpc_init_available_models_latency | 5 | 124ms | 119ms | 161ms | 161ms |
| cli_jsonrpc_init_snapshot_latency | 5 | 44ms | 39ms | 79ms | 79ms |

---

## 3. WARNS — 2.338 WAARSCHUWINGEN (23 categorieën)

| Waarschuwing | Aantal | Betekenis |
|-------------|--------|-----------|
| **YAML parsing failed, trying fallback parser** | **1.462** | Configuratiebestanden worden niet correct geparsed — valt terug op fallback |
| Failed to stat .git in directory | 238 | Header component zoekt .git in parent dirs (normaal, maar wel noise) |
| [prepareMessagesWithCaching] Duplicate tool_result detected | 192 | Dubbele tool results in message cache — duidt op message duplication bug |
| Failed to stat git path | 109 | Git pad lookup failures |
| [GitAiCheckpoints] Failed to read checkpoint file | 68 | Git checkpoint corrupt/niet leesbaar |
| [useLLMStreaming] LLM error | 56 | LLM stream fouten (lege context, waarschijnlijk 429-gerelateerd) |
| Retry attempt failed | 56 | Retry-mechanisme faalt — geeft aan dat operations blijven falen |
| OAuth callback port is in use, retrying on next port | 51 | MCP OAuth callback port conflict — duidt op niet-opgeruimde processen |
| Skill conflicts with existing command, skipping registration | 17 | Skill registratie conflicten in skill ecosysteem |
| [getTuiModelConfig] Unknown model, falling back to default | 14 | **Model niet gevonden** in config — fallback naar default model |
| [Chat route failure] | 12 | LLM API call failures (zie details hieronder) |
| [sendOpenAIChatMessage] Reasoning effort not supported | 11 | Model ondersteunt geen reasoning effort parameter |
| [RepoMetadata] Skipping emission due to collection failure | 10 | Repo metadata collection faalt |
| [Agent] runAgent error | 9 | Agent runtime fouten |
| Failed to load store from primary and backup | 8 | Store corrupt — zowel primary als backup falen |
| Failed to parse URL for sanitization | 7 | URL sanitization fouten |
| [ProcessTracker] Process did not exit gracefully | 4 | Force kill nodig — processen hangen bij shutdown |
| Overige (7 categorieën) | 8 | Session titel, marketplace, bell fallback, etc. |

### Chat Route Failures — 429s in detail

Van de 12 Chat route failures:
- **throttling (429)**: 9× — "429 Error 429", "429 5-hour usage limit", "429 Weekly/Monthly limit exceeded"
- **invalidRequest (400)**: 2× — 400 error from provider
- **invalidRequest (401)**: 1× — 401 Invalid authentication

**Duidelijk patroon:** Na 11:30 worden alle failures veroorzaakt door rate-limiting (429). De errors escaleren van "5-hour usage" naar "Weekly/Monthly limit".

### Unknown Model Fallbacks

14× onbekende model fallbacks — voornamelijk bij deze modellen:
- `cline-pass/deepseek-v4-flash` — 5×
- `deepseek-v4-flash` — 4×
- `mimo-v2.5` — 2×
- `cline-pass/deepseek-v4-pro` — 1×

Dit suggereert dat deze modellen uit de config zijn verwijderd of hernoemd, maar nog wel worden aangeroepen.

---

## 4. JSON-RPC NOTIFICATIES — 31.994 TOTAAL (18 types)

| Type | Aantal | % | Betekenis |
|------|--------|---|-----------|
| **thinking_text_delta** | **22.111** | 69,1% | Streaming thinking tokens — **domineert de log** |
| **assistant_text_delta** | **5.932** | 18,5% | Streaming assistant response tokens |
| tool_progress_update | 1.193 | 3,7% | Tool execution progress |
| tool_call | 1.105 | 3,5% | Tool call requests |
| droid_working_state_changed | 390 | 1,2% | Working state transitions |
| tool_result | 307 | 1,0% | Tool execution results |
| tool_execution_heartbeat | 273 | 0,9% | Tool keepalive heartbeats |
| create_message | 233 | 0,7% | Message creation |
| session_token_usage_changed | 202 | 0,6% | Token usage updates |
| thinking_text_complete | 89 | 0,3% | Thinking block ended |
| assistant_text_complete | 70 | 0,2% | Assistant response ended |
| mcp_status_changed | 31 | 0,1% | MCP connection status |
| agent_turn_completed | 22 | 0,1% | Agent turn cycle ended |
| settings_updated | 19 | 0,1% | Settings changed |
| session_title_updated | 8 | <0,1% | Title auto-generated |
| **error** | **4** | <0,1% | Session error notifications (429s) |
| queued_messages_discarded | 1 | — | Messages dropped |
| hook_execution_started/ completed | 2 | — | Hooks lifecycle |
| session_compacted / closed | 2 | — | Session lifecycle |

**Dominantie:** `thinking_text_delta` + `assistant_text_delta` = **87,6%** van alle notificaties.

---

## 5. LLM MODEL ECOSYSTEM — 21 model varianten

### 5a. Meest gebruikte modellen (in log lines)

| Model | Lines | % van totaal |
|-------|-------|-------------|
| **custom:OpenCodeGo-Kimi-K2.7-Code-0** | **13.423** | 37,4% |
| custom:GLM-5.2-0 | 3.360 | 9,4% |
| custom:OpenCodeGo-MiniMax-M3-0 | 2.715 | 7,6% |
| custom:GLM-5.2-anthropic-0 | 1.947 | 5,4% |
| custom:OpenCodeGo-DeepSeek-V4-Pro-0 | 1.214 | 3,4% |
| custom:OpenCodeGo-MiMo-V2.5-0 | 964 | 2,7% |
| custom:OpenCodeGo-DeepSeek-V4-Flash-0 | 714 | 2,0% |
| custom:OpenCodeGo-MiniMax-M2.7-0 | 515 | 1,4% |
| custom:ClinePass-DeepSeek-V4-Flash-0 | 170 | 0,5% |
| custom:ClinePass-DeepSeek-V4-Pro-0 | 47 | 0,1% |
| custom:ClinePass-Kimi-K2.6-0 | 4 | — |
| custom:ClinePass-Kimi-K2.7-Code-0 | 4 | — |

### 5b. Token Usage per Model

| Model | Samples | Gem | p50 | p95 | Max |
|-------|---------|-----|-----|-----|-----|
| **MiniMax-M3** | 71 | **107.535** | 110.019 | 183.954 | 204.019 |
| Kimi-K2.7-Code | 460 | 82.204 | 81.665 | 134.603 | 145.131 |
| DeepSeek-V4-Pro | 34 | 78.751 | 90.078 | 105.870 | 106.291 |
| GLM-5.2 | 103 | 49.888 | 48.153 | 81.281 | 89.300 |
| MiMo-V2.5 | 39 | 50.134 | 48.494 | 75.073 | 75.359 |
| DeepSeek-V4-Flash | 22 | 48.881 | 42.205 | 69.234 | 69.839 |
| MiniMax-M2.7 | 16 | 33.590 | 35.826 | 35.826 | 35.826 |
| GLM-5.2-anthropic | 73 | 30.043 | 29.663 | 38.504 | 39.133 |

### 5c. Model Switch Patroon

Model switches in session `5c719f77` en `16f12abc`:
1. `07:11 → custom:OpenCodeGo-Kimi-K2.7-Code-0` (2× in 500ms)
2. `11:35 → custom:ClinePass-Kimi-K2.6-0` (2× in 5s)
3. `11:49 → custom:ClinePass-Kimi-K2.7-Code-0` (2× in 5s)
4. `11:53 → custom:ClinePass-DeepSeek-V4-Pro-0` (2× in 300ms)
5. `11:56 → custom:OpenCodeGo-DeepSeek-V4-Pro-0` (2× in 400ms)
6. `12:24 → custom:OpenCodeGo-MiniMax-M3-0` (2× in 2s)
7. `13:29 → custom:OpenCodeGo-MiMo-V2.5-0` (1×)

**Patroon:** Model switches komen ALTIJD in paren (~300-500ms uit elkaar) — waarschijnlijk een dubbele event firing bug.

---

## 6. SESSIE ANALYSE — 42 unieke sessies

### 6a. Top 10 sessies (naar log lines)

| Session ID | Lines | Actief van | Tot | Duur |
|-----------|-------|-----------|-----|------|
| 5c719f77... | **19.301** | ~22:43 (6 jul) | 11:49 (7 jul) | ~13uur |
| 16f12abc... | **18.528** | 11:50 | 13:34 | ~1u44m |
| e5eb7c4c... | 8.867 | 12:49 | 13:30 | ~41m |
| 7cbcd792... | 3.532 | ~08:22 | 08:47 | ~25m |
| 04f7c773... | 2.293 | 11:18 | 11:29 | ~11m |
| b1b34116... | 2.273 | ~05:26 | 06:06 | ~40m |
| ae97b9a1... | 1.973 | ~08:22 | 08:39 | ~17m |
| fc22d517... | 1.901 | 09:05 | 09:18 | 13m |
| ce5cf9c3... | 1.696 | 11:18 | 11:29 | ~11m |
| 8880cc2b... | 1.671 | 11:18 | 11:24 | ~6m |

### 6b. Sessie Creatie Bursts

**Burst 1 (08:03–08:40):** 20+ sessies in 37 minuten
- 08:03 → 99c2040a
- 08:05 → 575661e6
- 08:06 → 31bcc154, 007c9c16, 0733aaae
- 08:08 → f805e744, fc161daa
- 08:11 → 00d08671
- 08:12 → af3839b6, e898e630
- 08:14 → f62dad8f
- 08:15 → 044a11bf
- 08:18 → 8e5198bb
- 08:21 → 4a7b5949
- **08:22 → ae97b9a1, 4618f689, 7cbcd792 (3× in 1s!)**
- 08:25 → 9ee29577
- 08:31 → 9abf53f7, 90ad69d1, 0b3e423a (3× in 2s!)
- 08:34 → 64b74d9a
- 08:39 → 4ea46a22

**Burst 2 (11:18):** 3 sessies in 1s — 8880cc2b, ce5cf9c3, 04f7c773

**Burst 3 (12:49–13:22):** e5eb7c4c, a2e92460, ae84e790, 30b21612

### 6c. Sessie Dualiteit

De sessies `ae97b9a1` en `4618f689` en `7cbcd792` werden **alle drie** in dezelfde seconde (08:22:28) aangemaakt — waarschijnlijk parallelle subagent sessies voor multi-agent operaties.

---

## 7. MCP SERVER ECOSYSTEM — 3 servers, constant reconnecten

| Server | Type | URL | Kenmerk |
|--------|------|-----|---------|
| **linear** | HTTP | `https://mcp.linear.app/mcp` | Meest gebruikt |
| **notion** | HTTP | (extern) | Minder gebruikt |
| **playwright** | HTTP | (extern) | browser automation |

Elke MCP reload (39 reloads totaal) start deze 3 servers opnieuw. Er zijn **120 MCP server start latency** metingen, wat wijst op ~40 reload cycli.

Bij elke session start/new worden de MCP servers opnieuw verbonden:
- `ServerIdentity`: `42972275...` (consistent — zelfde Linear workspace)
- `ProtocolVersion`: `2025-11-25`

---

## 8. TOOL EXECUTIE PROFIEL

### 8a. Tools die zijn gebruikt

- **Execute** — dominant (shell commands)
- Read
- Edit
- ToolSearch
- Grep
- Glob
- TodoWrite
- WebSearch / FetchUrl
- Create
- LS
- AskUser
- Task (subagent spawn)
- Skill (skill invocation)
- **MCP tools**: `notion___API-get-self`, `linear___list_teams`, `linear___save_issue`, `linear___save_comment`
- `store_agent_readiness_report`

### 8b. Tool Execution Latency
- 1.182 metingen
- **Gemiddeld: 7ms** (zeer snel)
- **p95: 5ms**
- **Max: 1.524ms** (uitzondering — waarschijnlijk een trage tool call)

---

## 9. CONSOLE.LOG — 153 regels (alleen React errors + i18next spam)

| Categorie | Aantal | % |
|-----------|--------|---|
| **i18next Locize promo** | **67** | 43,8% — **ergonomisch GROOTSTE deel** |
| **dup-key** (React duplicate keys) | **70** | 45,8% — `header-configs`, `header-session`, `header-built_in_commands` |
| bad-setstate (setState tijdens render) | 8 | 5,2% — component `jnM` |
| max-update-depth (oneindige render loop) | 8 | 5,2% — `useEffect` zonder deps |

**i18next patroon:** De promo `.info()` message wordt elke render cycle getriggerd. Dit is GEEN error maar wel **noise** die de log overspoelt. Bij elke TUI initialisatie wordt i18next opnieuw geïnitialiseerd → promo opnieuw getoond.

**dup-key keys gebruikt:**
- `header-configs` — veruit het meest (50+×)
- `header-session` — meerdere keren
- `header-built_in_commands` — enkele keren
- `header-custom_skills` — enkele keren

---

## 10. COMPACTIE & TOKEN THRESHOLDS

- **930 compactie threshold checks** in totaal
- Meeste checks: sessie `3bbc864a` met `custom:GLM-5.2-0` (sinds 05:26)
- Token limiet: **250.000 tokens** (default)
- Geen enkele check overschreed de limiet — compactie werd NOOIT getriggerd door context limiet
- Wel 2× `Compaction Start (agent)` → handmatige compactie
- 2× `Compaction Start (context limit)` → context-limit bereikt
- 2× `Compaction End (manual error)` en `Compaction End (agent error)` → compactie errors

---

## 11. HOOKS & PROCESS TRACKING

### Hooks (234 events)
- **14** hook command matches
- **12** hook executions
- **12** command completions
- **12** hook execution completions

### Process Tracker (85 events)
- Bij elke sessie teardown: "Killing all tracked processes"
- Meestal `toolCount: 0, count: 0` (geen actieve processen)
- **4×** "Process did not exit gracefully, forcing kill" — processen die niet normaal willen stoppen

---

## 12. SUBDROID / SUBAGENT CALLING PATRONEN

### 12a. SharedAgentRunner — Agent Executions (26 runs totaal)

| Session | Start | Duur | Notities |
|---------|-------|------|----------|
| 3bbc864a... | 05:26:43 | **118s** | Eerste agent run van de dag — GLM-5.2 |
| 5c719f77... | 11:14:42 | **960s (16min!)** | Extreem lange run — waarschijnlijk tot 429 hit |
| 4dc07934... | 11:57:43 | 24s | Korte run |
| a06e46c0... | 12:28:05 | 15s | Subagent voor settings change |
| 16f12abc... | 13:31:56 | 16s | Laatste run voor einde log |
| e5eb7c4c... | 13:29:19 | (foutieve timestamp) | 429 hit, geen complete |

**16 runs onvolledig** — deze hebben wel een `Starting agent run` maar geen bijpassende `Agent run complete` in de log. Dit zijn runs die onderbroken zijn door errors/crashes of waarvan de complete buiten de logperiode valt.

### 12b. Task Tool — Subagent Spawning
Het `Task`-commando wordt gebruikt om subdroids/subagents te spawnen — dit is hoe Droid multi-agent operaties uitvoert:

| Tijd | Type | Betekenis |
|------|------|-----------|
| **08:21:53** | **Task ×3 in 5ms** | **Parallelle subagent spawn** — 3 subagents tegelijk gestart (08:22 session creation burst!) |
| 09:05:06 | Task | Subagent voor session fc22d517 |
| 09:23:13 | Task | Subagent voor session 84e5341d |

**Bevinding:** De 3× Task in 5ms op 08:21:53 verklaart de session creation burst van 08:22 — 3 subagents (ae97b9a1, 4618f689, 7cbcd792) werden **parallel** gespawned.

### 12c. DaemonSessionController — User Message Queueing (60 events)

| Status | Aantal | Betekenis |
|--------|--------|-----------|
| **User message processing immediately** | **22** | Droid was idle, direct verwerkt |
| **User message queued** | **28** | Message in de wachtrij gezet |
| **User message queued (droid was busy)** | **10** | Droid was bezig — message moest wachten |

**In de wachtrij patroon:** In de drukste periodes (09:13-09:18, 11:15, 12:38, 13:11-13:12) werden messages consistent in de wachtrij gezet omdat droid "busy" was. Dit duidt op een **single-threaded bottleneck** — de TUI kan maar 1 agent run tegelijk verwerken.

### 12d. DaemonSessionController — Verbinding Lifecycle
- **Initial connection established**: 7× (elke nieuwe droid daemon start)
- **Session loaded from disk**: 4× (na daemon herstart)
- **Session initialized**: 5×

---

## 13. TOOL CALL FAILURES & MISSED TOOLS

### 13a. JsonRpcAdapter — Tool Call Complete met isError=true (24×)

| Tool ID | Tijd | Type | Oorzaak |
|---------|------|------|---------|
| Task_13 | 08:47:43 | **Task (subagent)** | Subagent mislukt — 2× dezelfde error |
| Read_46 | 09:05:06 | Read | Bestand kon niet worden gelezen |
| Task_47 | 09:18:48 | **Task (subagent)** | 2× — subagent gefaald |
| Execute_52 | 09:19:34 | Execute | Command failure |
| Execute_53 | 09:19:45 | Execute | Command failure |
| Execute_54 | 09:19:55 | Execute | Command failure |
| Execute_63 | 09:21:35 | Execute | Command failure |
| Edit_67 | 09:22:17 | Edit | File edit mislukt |
| Edit_83 | 11:16:38 | Edit | File edit mislukt |
| Task_92 | 11:29:38 | **Task (subagent)** | 429 — rate limit hit tijdens subagent |
| Task_91 | 11:29:45 | **Task (subagent)** | 429 — rate limit hit tijdens subagent |
| call_01_C... | 11:58:56 | (generic) | Tool failure |
| call_00_jw... | 12:22:00 | **2×** | Zelfde tool 2× gefaald |
| call_function_g... | 12:25:21 | (generic) | Tool failure |
| call_function_s... | 12:26:16 | (generic) | Tool failure |
| call_function_j... | 12:27:25 | (generic) | Tool failure |
| call_function_7... | 12:28:05 | (generic) | Tool failure |
| call_function_f... | 12:28:42 | (generic) | Tool failure |
| call_4b2549... | 13:22:54 | **Task (subagent)** | 429 — GLM-5.2 weekly limit |
| call_function_q... | **13:32:12** | **Execute (2×)** | **Tool was cancelled** + error discarded |

### 13b. MCP — Failed to List Tools (10×)
Op **13:29:31 - 13:30:06** faalde McpHub **10×** om tools te listen voor MCP servers:
- Alle 10 failures in een cluster van ~35 seconden
- Waarschijnlijk veroorzaakt door de 429 rate limit die de MCP servers deed disconnecten
- Dit is WAAROM de tool calls hierna ook faalden

### 13c. Tool Execution Heartbeat Mismatches
- **273 tool_execution_heartbeat** notificaties
- Sommige tools sturen heartbeats maar worden nooit als "complete" gemarkeerd — een signaal dat tools kunnen "hangen" zonder dat Droid dit detecteert

### 13d. Tool Was Cancelled (1×)
Op **13:32:12** werd een `Execute` tool gecancelled tijdens executie. Droid gooide de error weg ("discarding error") — maar de tool was al mislukt.

### 13e. Agent Error Count (9×) — Gedetailleerd

| Tijd | Model | Status | Foutmelding |
|------|-------|--------|-------------|
| 08:05:33 | ClinePass-DeepSeek-V4-Flash-0 | **429** | "Weekly Clinepass limit. Resets in 4d 13h" |
| 08:11:38 | OpenCodeGo-DeepSeek-V4-Flash-0 | **401** | "Invalid API key." |
| 11:29:36 | OpenCodeGo-Kimi-K2.7-Code-0 | **429** | "5-hour usage limit. Resets in 54min" |
| 11:29:43 | OpenCodeGo-Kimi-K2.7-Code-0 | **429** | "5-hour usage limit. Resets in 54min" |
| 11:30:42 | OpenCodeGo-Kimi-K2.7-Code-0 | **429** | "5-hour usage limit. Resets in 53min" |
| 11:55:46 | ClinePass-DeepSeek-V4-Pro-0 | **429** | "Weekly Clinepass limit. Resets in 4d 9h" |
| 12:30:43 | OpenCodeGo-MiniMax-M3-0 | **429** | "Weekly Clinepass limit. Resets in 4d 9h" |
| 13:22:53 | **GLM-5.2-0** | **429** | "Weekly/Monthly Limit Exhausted. Resets 2026-07-08" |
| 13:24:04 | **GLM-5.2-0** | **429** | "Weekly/Monthly Limit Exhausted. Resets 2026-07-08" |

**Cumulatief effect:** 
- 08:05 → Eerste ClinePass weekly limit (hit door andere tools, niet eens door Droid)
- 08:11 → API key invalid (configuratiefout)
- 11:29-11:30 → Kimi-K2.7 5-hour limiet bereikt (3× in 1 minuut)
- 11:55 → ClinePass weekly (nog steeds)
- 12:30 → MiniMax-M3 weekly
- **13:22-13:24 → GLM-5.2 weekly/monthly limiet — alle modellen zijn nu op!**

De escalatie is duidelijk: eerst per-model limieten, dan uiteindelijk alle modellen tegelijk.

### 13f. Chat Client Failures (12×)
- **droid_chat_client_failure_count** = 12 (vs 823 success = **98,6% success rate**)
- Waarvan 10× `reason: throttling` en 2× `reason: invalidRequest`

---

## 14. OVERIGE GEDETECTEERDE PATRONEN

### 14a. Configuratie/Parseer Problemen
- **1.462×** "YAML parsing failed" — dit is extreem. Waarschijnlijk wordt elke settings change/thema/config reload getriggerd door een niet-parseerbaar YAML bestand. Dit is een belangrijke bevinding die nog niet eerder was opgemerkt.

### 14b. Duplicate Tool Results
- **192×** "Duplicate tool_result detected" in `prepareMessagesWithCaching`
- Dit duidt op een message deduplicatie probleem — tool results worden dubbel in de cache opgeslagen

### 14c. Git AI Checkpoints
- **68×** "Failed to read checkpoint file" 
- Git AI checkpointing faalt consequent — mogelijk een configuratie/rechten issue

### 14d. Skill Registratie Conflicten
- **17×** "Skill conflicts with existing command, skipping registration"
- Skills proberen commands te registreren die al bestaan — skill ecosystem overlap

### 14e. ResourceMonitor — 47 snapshots maar GEEN DATA
De ResourceMonitor logt elke ~10 minuten een snapshot, maar de velden `cpuUsagePercent`, `memoryUsageMB`, `rssMB`, `heapUsedMB` zijn allemaal **leeg** in de log. Het mechanisme draait maar produceert geen data.

---

## 15. TIJDELIJN OVERZICHT

| Tijd | Gebeurtenis |
|------|-------------|
| **22:18 (6 jul)** | Eerste console.log entry (i18next promo + React errors) |
| **22:43 (6 jul)** | Eerste droid-log-single entry — WARN .git stat, eerste dup-key |
| **22:44 (6 jul)** | MCP linear closed, telemetry shutdown |
| **05:08 (7 jul)** | Nieuwe sessie — persist errors, session create error |
| **05:26** | Session 3bbc864a start — settings changed, model GLM-5.2 |
| **07:10** | Session 5c719f77 start — settings changed, 2× model switch → Kimi-K2.7 |
| **07:35** | dup-key burst (header-built_in_commands, header-custom_skills) |
| **08:03-08:40** | **Sessie creation burst** — 20+ sessies in 37min |
| **08:05** | Eerste cmd-error (droid command) |
| **08:49** | max-update-depth ×8 (React render loop crash) |
| **09:00** | sound-fail (ffplay niet gevonden) |
| **09:05-09:18** | Session fc22d517 — korte sessie (13min) |
| **09:23-09:30** | Session 84e5341d — korte sessie (7min) |
| **11:18** | Sessie burst 3× in 1s (parallelle agents?) |
| **11:29** | cmd-error ×2 (Error running droid command) |
| **11:30** | **EERSTE 429 RATE LIMIT** (5-hour usage limit) |
| **11:31** | dup-key burst (5× in 1s) — React render storm na 429 |
| **11:35** | Model switch → ClinePass-Kimi-K2.6 |
| **11:49** | Model switch → ClinePass-Kimi-K2.7-Code |
| **11:50** | Nieuwe sessie 16f12abc begint |
| **11:52-11:53** | dup-key burst ×14 (heftigste piek) |
| **11:55** | 429 rate limit (2e) |
| **11:56** | Model switch → OpenCodeGo-DeepSeek-V4-Pro |
| **12:24** | Model switch → OpenCodeGo-MiniMax-M3 |
| **12:30** | 429 rate limit (3e) + dup-key burst |
| **12:49** | Session e5eb7c4c start |
| **13:22** | cmd-error (droid command) |
| **13:24** | 429 rate limit (4e) — Weekly/Monthly limit |
| **13:28** | dup-key ×4 |
| **13:29-13:30** | **MCP tools fail** ×10 — MCPHub kan geen tools listen |
| **13:34** | dup-key (header-session) |

---

## 16. KEY INSIGHTS — Wat we nog niet wisten

1. **YAML parsing failure (1.462×)** is de grootste onopgemerkte waarschuwing — geen error, maar wel een structureel configuratieprobleem
2. **Keypress queue latency p95 van 43,5 seconden** verklaart de input lag volledig — dit was niet eerder gekwantificeerd
3. **87% van JSON-RPC notificaties** is streaming text (thinking + assistant delta's) — de render loop wordt deels veroorzaakt door continue streaming updates
4. **GLM-5.2 is extreem traag** (avg 10s TTFT, outlier 105s) — model keuze heeft direct impact op UX
5. **CLI startup duurt gemiddeld 19s** (p95: 37s) — dit is een apart performance probleem
6. **Sessie creation bursts** tonen aan dat Droid massaal parallelle subagents spawn — **3 subagents in 5ms** via Task tool op 08:21:53
7. **Model switches komen altijd in paren** (dubbele event firing) — een eigenaardige UI bug
8. **Compactie wordt NOOIT getriggerd** door context limit — alle compactie is handmatig
9. **ResourceMonitor logt wel maar vult geen data in** — de monitoring draait maar is functioneel dood
10. **Tool call failures (24× met isError)** — waarvan 4× Task (subagent) failures, 3× Execute failures, 2× Edit failures
11. **MCP tools fail ×10 op 13:29** — waarschijnlijk door 429 rate limit die MCP servers deed disconnecten
12. **Tool was cancelled (1×)** — Execute tool gecancelled tijdens executie, error weggegooid
