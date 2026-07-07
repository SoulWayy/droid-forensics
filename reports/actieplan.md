# Droid Actieplan — Geüpdatete Prioriteiten

> Gebaseerd op deep-research triage (7 juli 2026, 15:55)
> Doelwit: droid v0.164.1 — PID 2663905 (gestopt)

---

## 🔴 Prioriteit 1: Render Loop in Header.tsx Fixen

### 1.1 Verwijder synchronis I/O uit render path
- **Probleem:** `src/components/Header.tsx` roept `getReadinessHint` aan in `useMemo` tijdens render
- **Gevolg:** `git.ts:18` doet `statSync` door hele directory tree → blokkeert event-loop → input-lag
- **Fix:** Verplaats `getReadinessHint` naar `useEffect` of cache resultaat buiten React
- **Evidences:** 209× Header.tsx in stack traces, 477× git.ts:18, 49× getReadinessHint/index.ts:85

### 1.2 Duplicate keys fixen
- **Probleem:** Dynamische keys `header-${category}` zijn niet uniek
- **Gevolg:** 70 duplicate-key errors, React reconciliation overload
- **Fix:** Dedupliceer categorielijst of gebruik `index + category`
- **Evidences:** 60× `header-configs`, 4× `header-session`, 4× `header-built_in_commands`, 2× `header-custom_skills`

### 1.3 setState-in-render fixen (`jnM`)
- **Probleem:** Component `jnM` roept setState aan tijdens render van andere instantie
- **Gevolg:** 8× error, extra re-renders
- **Fix:** State-update verplaatsen naar effect/event handler; vermoedelijk gerelateerd aan Header.tsx

---

## 🟡 Prioriteit 2: Foutafhandeling Robuuster Maken

### 2.1 429 rate-limit graceful degradatie
- **Probleem:** Droid blijft retryen zonder backoff wanneer API quota op is
- **Context:** Gebruiker heeft quota verbruikt; dit is GEEN Droid bug, maar de afhandeling is wel slecht
- **Fix:** Stop retry na N pogingen, toon reset-tijd, verminder notificatie-spam
- **Evidences:** 176× 429 errors, 31.994 JSON-RPC notifications

### 2.2 Frontmatter YAML parse errors
- **Probleem:** 2.924× `bad indentation of a mapping entry` in `parseFrontmatter.ts:28`
- **Gevolg:** Mogelijk gerelateerde instabiliteit, failed tool/file loads
- **Fix:** Robuustere YAML parsing + duidelijke foutmelding

---

## 🟢 Prioriteit 3: Optimalisaties

### 3.1 i18next init
- **Probleem:** 64× Locize promo in clusters → i18next wordt herhaaldelijk geïnitialiseerd
- **Fix:** Initialiseer i18next één keer per app-start

### 3.2 JSON-RPC debouncing
- **Probleem:** `thinking_text_delta` (17.000×) en `tool_progress_update` (1.000×) triggeren elke keer een re-render
- **Fix:** Debounce/batch notificaties naar de TUI

### 3.3 Teardown optimaliseren
- **Probleem:** Worker teardown duurt 5 seconden
- **Fix:** Review worker lifecycle + open HTTP verbindingen

---

## 📋 Sessie Log (Deze Sessie)

| Tijd | Actie | Resultaat |
|---|---|---|
| 15:36 | Start deep research | Huidige status geïnventariseerd, droid is gestopt |
| 15:40 | Research gap matrix | 70% gedekt, live captures niet meer mogelijk |
| 15:43 | Correcte .bun extractie | `droid-bun-section-full.bin` (53MB) aangemaakt |
| 15:45 | Bundle analyse | `header-configs`/`jnM` komen niet letterlijk voor → dynamische keys/minified |
| 15:50 | Log kwantificatie | 70 dup keys, 8 max depth, 8 setState, 64 i18next, 176 429s, 31.994 RPC notifs |
| 15:52 | Source hotspot analyse | `src/components/Header.tsx` 209×, `getReadinessHint` 75×, `git.ts:18` 477× |
| 15:55 | Eindrapport + matrix update | Documentatie bijgewerkt |

---

## 📊 Huidige Status

| Onderdeel | Status | Notitie |
|---|---|---|
| Skills ecosysteem | ✅ Compleet | 5 eigen + 4 externe skills |
| Process cleanup | ✅ Gedaan | vorige sessie |
| Render-loop diagnose | ✅ Compleet | Header.tsx is de bron |
| Bundle analyse | ✅ Compleet | BunFS formaat, dynamische keys |
| Log kwantificatie | ✅ Compleet | Alle error types geteld |
| Live captures | ❌ Niet mogelijk | Droid gestopt, 429 loop bij herstart |
| Eindrapport | ✅ Compleet | `eindrapport.md` |
