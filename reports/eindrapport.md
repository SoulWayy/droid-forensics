# Droid TUI Performance — Eindrapport (Deep Research)

**Datum:** 7 juli 2026, 15:50  
**Onderzoeker:** Pi + agy sessies  
**Doelwit:** `droid` v0.164.0/v0.164.1, binary `/home/jan/.local/bin/droid`  
**Status proces:** Gestopt (was PID 2663905). Live process/network capture niet meer mogelijk zonder herstart.

---

## Executive Summary

De extreme input-lag en 58–60% CPU van Droid komen **niet** primair door netwerk, LLM token gebruik of JSON-RPC overhead. De hoofdoorzaak zit in de **TUI render-laag**, specifiek `src/components/Header.tsx`. Daar wordt tijdens elke render synchronis filesystem I/O uitgevoerd (`git statSync` via `getReadinessHint`) en worden dynamische React-keys gegenereerd die niet uniek zijn (`header-configs`, `header-session`, etc.). Dit forceert React/Ink tot continue re-renders, wat de JSC event-loop blokkeert.

De 429 rate-limit storm is een **externe trigger** (gebruiker heeft API quota verbruikt), geen Droid bug. Droid reageert er echter niet elegant op: het blijft retryen en stuurt voortdurend statusnotificaties naar de TUI, waardoor de bestaande render-loop wordt versterkt.

---

## 1. Data Bronnen

| Bron | Grootte | Periode | Nut |
|---|---|---|---|
| `~/.factory/logs/console.log` | 38K, 150 regels | 6 jul 22:18 – 7 jul 13:34 | React/Ink errors, i18next promo |
| `~/.factory/logs/droid-log-single.log` | 64M, 103.974 regels | 6 jul 22:18 – 7 jul 13:34 | Metrics, stack traces, 429 errors |
| `/home/jan/.local/bin/droid` .bun sectie | 53 MB | — | Embedded JS bundle (BunFS) |
| `droid-bundle.js` (oude extractie) | 25 MB | — | Deel van bundle, incompleet |
| `droid-strings.txt` | 30 MB | — | Leesbare strings uit binary |

---

## 2. Kwantificatie van Symptomen

### 2.1 React/Ink errors in console.log

| Error type | Aantal | Detail |
|---|---|---|
| Duplicate key | **70** | 60× `header-configs`, 4× `header-session`, 4× `header-built_in_commands`, 2× `header-custom_skills` |
| Maximum update depth | **8** | Alle binnen 08:49–08:50 (1 minuut) |
| setState during render | **8** | Component `jnM` (minified naam in bundle) |
| i18next Locize promo | **64** | Steeds in clusters van 2–4, dus herhaalde initialisatie |

### 2.2 Source-hotspots in droid-log-single.log

| Source reference | Aantal | Betekenis |
|---|---|---|
| `packages/utils/src/frontmatter/parseFrontmatter.ts:28` | 2.924 | YAML parse errors (bad indentation) |
| `packages/runtime/frontmatter/src/fileLoaders.ts:85-86` | 1.462×2 | Frontmatter loader errors |
| `packages/runtime/plugins/src/PluginLoader.ts:482` | 720 | Plugin load failures |
| `packages/runtime/shell/src/git.ts:18` | 477 | `statSync` op `.git` in elke parent dir |
| `src/components/Header.tsx:376-386` | **209** | Render hot path, roept `getReadinessHint` aan in `useMemo` |
| `src/utils/getReadinessHint/index.ts:85` | 49 | Roept `git.ts:statSync` aan |
| `src/app.tsx:395-662` | 42 | Main app component |

### 2.3 429 rate limits

| Provider | Aantal | Opmerking |
|---|---|---|
| OpenCode (5h / balance) | 88 | Gebruikersquota verbruikt |
| Clinepass weekly | 92 | Gebruikersquota verbruikt |
| GLM weekly/monthly | 16 | `custom:GLM-5.2-0` quota exhausted |
| **Totaal** | **176** | **Geen Droid bug; externe trigger** |

### 2.4 JSON-RPC notification storm

- **31.994** notifications gelogd
- Top types: `thinking_text_delta` (~17.000), `assistant_text_delta` (~5.700), `tool_call` (~1.100), `tool_progress_update` (~1.000), `droid_working_state_changed` (~370)
- 70.083 events van main TUI, 11.930 van worker
- 42 unieke session IDs — Droid is herhaaldelijk herstart/verbroken

---

## 3. Root Cause Analyse

### 3.1 Primaire oorzaak: Header.tsx render-loop

Stack traces tonen duidelijk dat `src/components/Header.tsx` de bron is:

```
at <anonymous> (src/components/Header.tsx:386:18)
at gz (react-reconciler.development.js:6427:23)
at useMemo (react-reconciler.development.js:17913:18)
at hJn (src/components/Header.tsx:385:37)
```

- **Regel 376-386**: `useMemo` in Header.tsx roept een functie aan die `getReadinessHint/index.ts:85` aanroept.
- **getReadinessHint**: doet `packages/runtime/shell/src/git.ts:18` — een **synchronis `statSync`** om `.git` te vinden in de huidige en alle parent directories.
- Dit gebeurt **tijdens de React render phase**, wat direct de event-loop blokkeert en input-lag veroorzaakt.

### 3.2 Secundaire oorzaak: duplicate keys

De keys `header-configs`, `header-session`, `header-built_in_commands`, `header-custom_skills` komen **niet letterlijk** voor in de geëxtraheerde `.bun` bundle. Ze worden dynamisch gegenereerd, waarschijnlijk als:

```tsx
key={`header-${category}`}
```

in Header.tsx. Omdat de lijst van categorieën duplicates bevat (of dezelfde categorie meerdere keren rendert), ontstaan de duplicate-key errors. Dit forceert React tot onnodige reconciliatie.

### 3.3 Tertiaire oorzaak: i18next herinitialisatie

De i18next Locize promo verschijnt 64× in clusters. Dit betekent dat i18next **niet één keer** wordt geïnitialiseerd, maar telkens opnieuw bij sessieherstart of TUI re-render. Dit is een symptoom van de render-loop, geen oorzaak.

### 3.4 Trigger: 429 rate-limit retry loop

De gebruiker heeft meerdere API quota's verbruikt. Droid's worker blijft echter retryen zonder exponentiële backoff of graceful degradatie. Elke retry genereert een `error` / `session_token_usage_changed` / `droid_working_state_changed` notificatie naar de TUI, die op zijn beurt Header.tsx weer forceert te re-renderen. Zo ontstaat een **death spiral**.

---

## 4. Wat we NIET hebben kunnen verifieren

| Onderzoekslijn | Reden |
|---|---|
| Live thread stack trace (gdb) | Droid is gestopt |
| Network capture (tshark/tcpdump) | Droid is gestopped |
| Core dump ~400 MB (gcore zonder --dump-excluded-mappings) | Droid is gestopt |
| Exacte minified naam van `jnM` in bundle | Source maps geven `Header.tsx`, bundle identifiers zijn verhaspeld |
| Reproduceren zonder 429 trigger | Vereist werkende API key |

---

## 5. Aanbevelingen

### 5.1 Kritiek — render-loop fixen

1. **Verwijder synchronis I/O uit Header.tsx render path**
   - `getReadinessHint` mag niet in `useMemo` worden aangeroepen tijdens render.
   - Verplaats naar een effect (`useEffect`) of cache het resultaat buiten React.
   - Vermijd `statSync` door de hele directory tree; gebruik `find-up` async of cache de git root.

2. **Fix duplicate keys in Header.tsx**
   - Zorg dat elke `header-${category}` key uniek is.
   - Gebruik index + category als fallback, of dedupliceer de categorielijst.

3. **Fix setState in render (`jnM`)**
   - Vermoedelijk dezelfde Header-component of een child; verplaats state-updates naar effects of event handlers.

### 5.2 Medium — foutafhandeling

4. **429 / rate-limit afhandeling**
   - Stop met retryen na N pogingen of wacht tot reset-tijd.
   - Toon een duidelijke foutmelding in de TUI zonder notificatie-spam.
   - Onderscheid tussen gebruikersquota (stop) en transient netwerkfouten (retry met backoff).

5. **Frontmatter YAML parse errors**
   - 2.924 parse errors duiden op een tweede, mogelijk gerelateerd probleem: prompts/files met invalide frontmatter worden niet goed afgehandeld.
   - Voeg robuustere parsing + foutmelding toe.

### 5.3 Laag — optimalisatie

6. **i18next init**
   - Initialiseer i18next maar één keer per applicatie-start, niet per render/sessie.

7. **JSON-RPC debouncing**
   - Debounce `tool_progress_update` en `thinking_text_delta` notificaties naar de TUI om re-render frequentie te beperken.

---

## 6. Conclusie

Droid is niet fundamenteel kapot, maar heeft een **klassieke React render-loop bug** in `src/components/Header.tsx` die wordt versterkt door een externe rate-limit trigger. De oplossing is gericht: verwijder sync I/O uit de render path, fix duplicate keys, en maak de 429-afhandeling robuuster. Live debugging is niet meer mogelijk zonder Droid te herstarten, maar de logs en bundle leveren voldoende bewijs om de juiste fixes te prioriteren.
