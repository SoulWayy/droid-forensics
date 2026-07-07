# Droid Onderzoek — Research Gap Matrix

**Doel:** bepalen wat al is gedekt en wat nog ontbreekt om het onderzoek volledig af te ronden.  
**Status snapshot:** 7 juli 2026, 15:55 — `droid` PID 2663905 is gestopt, logs + binary beschikbaar.

## Legend
- ✅ Gedekt
- ⚠️ Gedeeltelijk
- ❌ Niet gedaan / niet meer mogelijk
- 🔵 Kan nog uit historische data

---

| Onderzoekslijn | Bron | Status | Wat ontbreekt |
|---|---|---|---|
| Proces architectuur | ps, top, /proc | ✅ | — |
| Thread-level CPU | top -H, /proc/PID/task | ✅ | — |
| Syscall profiling | strace -c | ✅ | — |
| React/Ink error detectie | console.log | ✅ | — |
| Error frequentie / tijdspatronen | console.log | ✅ | Gekwantificeerd in eindrapport |
| `header-configs` key bug locatie | droid-log source maps | ✅ | Dynamische key in `src/components/Header.tsx` |
| `jnM` component locatie in bundle | source maps | ⚠️ | Naam is minified, maar komt uit Header.tsx context |
| i18next Locize promo frequentie | console.log | ✅ | 64×, clusters duiden op herinitialisatie |
| 429 error loop frequentie | droid-log-single.log | ✅ | 176×, gebruikersfout (externe trigger) |
| JSON-RPC notification rate | droid-log-single.log | ✅ | 31.994 notifications, types gekwantificeerd |
| Correlatie 429 ↔ React errors | beide logs | ✅ | Zelfde tijdsvensters (08:00, 11:00, 12:00) |
| Source hotspots in stack traces | droid-log-single.log | ✅ | Header.tsx 209×, getReadinessHint 75×, git.ts 477× |
| Frontmatter parse errors | droid-log-single.log | ✅ | 2.924 YAML errors, extra bug |
| Netwerk capture (tshark/tcpdump) | live traffic | ❌ | Droid is gestopt, niet meer mogelijk |
| Core dump (~400 MB) | gcore | ❌ | Droid is gestopt, niet meer mogelijk |
| Thread stack trace (gdb) | gdb -p | ❌ | Droid is gestopt, niet meer mogelijk |
| Worker teardown analyse | live meting | ⚠️ | Alleen 1 metric (5085 ms) bekend |
| Bundle structuur / Ink source | droid-bun-section-full.bin | ✅ | BunFS formaat geïdentificeerd |
| Rust crate dependency mapping | strings + readelf | ✅ | — |
| Binary identity (.comment) | readelf | ✅ | — |
| Memory leak tracking (RSS growth) | live /proc | ❌ | Niet meer mogelijk |

---

## Gevulde gaps t.o.v. vorige matrix

1. **Header.tsx geïdentificeerd als primaire bron** van zowel duplicate keys als sync I/O tijdens render.
2. **getReadinessHint → git.ts:statSync** getraceerd als de synchronis file I/O die input-lag veroorzaakt.
3. **429 rate limit geclassificeerd als externe trigger**, geen Droid bug.
4. **JSON-RPC notification types** gekwantificeerd: `thinking_text_delta` en `assistant_text_delta` domineren.
5. **Frontmatter YAML parse errors** ontdekt als secundair, mogelijk gerelateerd probleem.
6. **Bundle extractie gecorrigeerd**: oude `droid-bundle.js` was 25MB/incompleet; nieuwe `droid-bun-section-full.bin` is 53MB en bevat BunFS root.

---

## Nog openstaand (kan alleen met live droid)

- gdb thread backtrace op het moment van 60% CPU
- tshark capture van JSON-RPC IPC op loopback
- gcore dump zonder `--dump-excluded-mappings`
- RSS growth tracking over tijd

De gebruiker heeft aangegeven dat Droid opstarten "een dood paard" is vanwege de 429 loop. Deze live metingen zijn daarom niet uitgevoerd.
