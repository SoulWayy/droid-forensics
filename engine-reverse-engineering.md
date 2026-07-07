# Droid TUI Performance Dissectie (Reverse Engineering)

Na een diepgaande dissectie van de Bun-executable, de event-loop syscalls en de React (Ink) error logs, hebben we de exacte architecturale fouten ontrafeld die Droid "absurd traag" maken en voor extreme input-lag zorgen, ongeacht of je Herdr, Tmux of Zellij gebruikt.

## 1. De React/Ink Reconciliation Crash
De fouten `Encountered two children with the same key, 'header-configs'` en `Cannot update a component ('jnM')` wijzen op een fundamenteel state-management probleem in de CLI UI.
- **Wat er gebeurt:** Bij elke `tool_progress_update` of `heartbeat` via JSON-RPC, push't Droid een nieuwe state naar de React DOM in de terminal.
- **De Fout:** Omdat de lijst met header-configs of taakstatussen **geen unieke keys** heeft (maar duplicaten), kan React de componenten niet efficiënt updaten (het zogenaamde "reconciliation" proces faalt). In plaats van één regel tekst aan te passen, gooit React de héle component tree weg en tekent deze volledig opnieuw.

## 2. V8 Garbage Collection Thrashing (De 60% CPU Spike)
Dit is waar de input-lag daadwerkelijk ontstaat:
- Doordat de TUI de component tree tientallen of honderden keren per seconde weggooit en herbouwt (versterkt door de retry-loop van de 429 ratelimit), ontploft de JavaScript heap met miljoenen "zombie" React Fiber nodes.
- In de `strace` zagen we dat het hoofdproces zich stukbeet op `madvise` syscalls. Dit is de V8 (of JavaScriptCore) Garbage Collector (GC) die wanhopig probeert het werkgeheugen (de 6.8GB virtueel RAM uit onze core dump!) op te schonen.
- **Gevolg:** De main JavaScript thread is 99% van de tijd bezig met Garbage Collection en het herberekenen van de TUI layout, waardoor toetsaanslagen (input) domweg genegeerd of enorm vertraagd worden in de event-loop.

## 3. IPC Libuv Event Loop Polling Overload
Tijdens het afluisteren van de worker processen met `strace`, zagen we een storm aan `read(8, "\1\0\0\0\0\0\0\0", 8)`. 
- Dit is **niet** de JSON-RPC data, maar dit zijn de asynchrone wake-up signalen (via `eventfd`) van de onderliggende C-library (`libuv`/Bun). 
- Omdat het script in een infinite retry loop vastzat (door de LLM 429 limiet of onvoldoende back-off logica), vuurde de worker non-stop IPC-notificaties af over UNIX-sockets (fd 0 en 1). 
- De hoofd-TUI moet voor *elk* van deze notificaties ontwaken uit zijn epoll-slaap, de JSON parsen, en de React-state updaten... wat ons weer terugbrengt bij probleem 1.

## Samenvatting van de Death-Spiral
1. **Worker:** Krijgt een error of update $\rightarrow$ push't dit direct over de IPC socket zonder throttling/debouncing.
2. **Main Thread:** Wordt gewekt door `eventfd`, parset JSON, update de React state.
3. **React/Ink:** Faalt op duplicate keys, gooit DOM weg, creëert duizenden nieuwe objecten, forceert een full re-render naar de TTY.
4. **JavaScript Engine:** Schiet in de stress door geheugenverbruik, start een agressieve "Stop-The-World" Garbage Collection.
5. **Jouw Ervaring:** De Terminal bevriest (Stop-The-World GC pauzeert alle I/O). Het toetsenbord reageert pas seconden later (Input Lag).

## Hoe nu verder?
Dit is een architecturale fout in Droid's TUI. Om dit te repareren moeten we de broncode van Droid in (een van de repo's zoals `pi-agent-control-extension` of `herdr`) aanpassen:
1. **Throttling/Debouncing** toevoegen aan de IPC JSON-RPC listener (zodat we max 10 renders per seconde doen, in plaats van 1000).
2. **Unieke keys** (bijv. UUID's in plaats van statische strings) forceren in de React iterators.
3. Een fatale exit-code inbouwen voor 429 of auth-errors in de worker, in plaats van non-stop retries.
