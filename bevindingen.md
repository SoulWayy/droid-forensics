# Droid Onderzoek Triage - Bevindingen

**Datum:** 7 Juli 2026
**Doelwit:** `droid` (PID 2663905 & 2749201) binnen de `herdr` server (Utrecht Data OS)
**Probleem:** Extreme input-lag, hoog token-gebruik, en algemene instabiliteit.

## 1. Systeem & Proces Status
- **Hoofdproces (PID 2663905):** Draait met ~60% CPU verbruik en neemt gigantisch veel virtueel geheugen in beslag (de gemaakte core dump was ~6.8GB groot).
- **Sub-processen (PID 2749201, 2760682):** Worker agents die communiceren via JSON-RPC streams (`droid exec --input-format stream-jsonrpc --output-format stream-jsonrpc`).
- **Syscall Profiling (`strace`):** Het proces is hevig bezig met `madvise` (duidt op agressieve Garbage Collection binnen de Bun/V8 engine), gevolgd door `pread64`, `clock_gettime` en `epoll_wait`. Dit is typisch voor een event-loop die zwaar overbelast is.

## 2. Netwerk & IPC
- **Externe API Calls:** Er staan actieve HTTPS verbindingen open naar Google API's (`ra-in-f121.1e100.net:https`). Dit verklaart de aanroep naar de LLM (Gemini of vergelijkbaar).
- **IPC (Inter-Process Communication):** Communicatie tussen het hoofdproces en de workers verloopt via UNIX sockets en pipes (`pidfd`). Bij het tracen van de JSON-RPC zagen we constante, lege of zeer kleine binaire pings (`\1\0\0\0...`), wat kan duiden op een vastgelopen heartbeat of overmatige status-polling.

## 3. Logs & Applicatie Fouten
In `~/.factory/logs/console.log` is een continue stroom van kritieke React/Ink fouten te zien die de command-line interface overspoelen:
1. **Duplicate Keys:** `ERROR: Encountered two children with the same key, 'header-configs'.` Dit zorgt voor onvoorspelbaar gedrag en enorme render-overhead.
2. **Component Update Loop:** `ERROR: Cannot update a component ('jnM') while rendering a different component ('jnM').` Dit triggert een oneindige React re-render cyclus.

## 4. Conclusie tot nu toe (Root Causes)
1. **Input Lag Root-Cause:** De TUI (Terminal UI gebouwd in React/Ink) zit in een oneindige re-render loop door state-management fouten in de componenten (`header-configs` & `jnM`). Hierdoor blokkeert de JavaScript event-loop, wat resulteert in extreme input lag, overmatig geheugenbeheer (vandaar de 6.8GB VIRT / `madvise` spam) en hoog CPU-gebruik.
2. **Token Gebruik Root-Cause:** Door de vastgelopen renders en de mogelijk hoge frequentie van status updates/polling (de IPC pings), is de kans groot dat de worker constant API-calls afvuurt om de UI state te voeden, wat een escalatie in LLM token verbruik veroorzaakt.

## Volgende Stappen
- Code van de UI/Ink componenten lokaal analyseren en de render-loop / keys patchen.
- Diepere inspectie van de JSON-RPC IPC payloads om te zien of LLM queries onbedoeld geloopt worden.
## Update 15:22 - LLM Quota Loop en TUI Block

Uit de lokale log files (`~/.factory/logs/droid-log-single.log`) hebben we zojuist een gigantische ontdekking gedaan met betrekking tot de "token-gebruik" en instabiliteits-klachten:

### 1. Harde Rate Limit (429) Error Loop
De Droid worker processen (aangestuurd via JSON-RPC) proberen continu de LLM API (model `custom:GLM-5.2-0`) te bereiken, maar worden afgeschoten door een harde API rate limit:
`429 Weekly/Monthly Limit Exhausted. Your limit will reset at 2026-07-08 23:55:10`.

Omdat de CLI Droid (waarschijnlijk de `useLLMStreaming` React hook in de UI) geen elegante afhandeling lijkt te hebben voor een terminale 'Rate Limit' fout, blijft de retry-mechanica in een oneindige lus hangen. Hij blijft het proberen en gooit elke seconde de error opnieuw.

### 2. JSON-RPC Notification Spam
Dit veroorzaakt een overbelasting op de Inter-Process Communication (IPC). Het logbestand stroomt vol met `factory_app_jsonrpc_notification_count` heartbeats, veroorzaakt door het worker proces dat zijn fouten terug push't naar de hoofd-TUI.

### 3. De TUI Crashes
We vermoeden nu sterk dat de TUI rendering fouten (zoals de `duplicate key` errors en de oneindige re-render cyclus) direct getriggerd worden door de constante stroom van foutafhandelings-statussen die de UI proberen te tekenen, maar dit niet sneller kunnen doen dan ze binnenkomen (vandaar de massale CPU en RAM pieken, en de Garbage Collection activiteit).

### Conclusie:
Het is niet zozeer dat Droid 'te veel' tokens gebruikt momenteel, maar het heeft de API quota maximaal uitgeput (waarschijnlijk via eerdere autoresearch runs) en de fallback-logica ontbreekt of triggert een fatale TUI freeze.

### Advies:
- Het Droid proces moet volledig gekilled worden om de lokale resources te bevrijden (`kill -9 2663905`).
- We moeten het API endpoint / de key verwisselen naar een vers account of een ander lokaal model in `~/.factory/`, anders zal elke nieuwe Droid run direct weer in een fatal retry-loop belanden en de TUI doen vastlopen.
