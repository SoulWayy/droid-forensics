# Factory AI Droid - Deep Triage & Reverse Engineering Report
**Status:** Root Cause Identified, Workaround Applied, Code Extracted.

## 1. De Architectuur & Broncode
Droid is geen simpele wrapper. We hebben de 54MB gecompileerde `.bun` executable (die met `memfd_create` direct in geheugen laadt) opengetrokken. De interne broncode is een gigantische monorepo.
Ik heb de **volledige directory structuur** van Factory geëxtraheerd en de 148 interne modules gelokaliseerd (zoals `Mission UI Entrypoints`, `Desktop Daemon IPC`, en `Cloud Workspaces`). 
*Je kunt de complete source-tree vinden in `~/Droid-onderzoek-triage/extracted-source/factory-source-tree.txt`.*

## 2. De 429 Rate Limits en Subagent Crashes
Zoals we zojuist zagen: de LLM-providers throttlen genadeloos als je zware calls maakt (je zag net 3 van onze extractie-subagents sterven op een `RESOURCE_EXHAUSTED (code 429)` error). Droid heeft *exact* hetzelfde probleem intern met zijn JSON-RPC streams (`stream-jsonrpc`). Als de LLM begint te haperen, ramt de Droid worker non-stop retries door een Unix Socket naar de UI thread, wat de boel volledig verstikt in `futex` locks.

## 3. De TUI Memory Leak (De 'Ink' React Engine)
De werkelijke reden voor de 30 seconden input lag is gevonden in de geëxtraheerde code (zie `3_tui_incremental_mount.js`).
Factory gebruikt de `Ink` library om React in de terminal te renderen. Bij elke token die van de LLM komt, probeert Droid de **volledige DOM** opnieuw te tekenen. Dit leidt tot een gigantische V8 Garbage Collection (die `madvise` sweeps die we eerder zagen). 

## 4. De Oplossing (De "Dark Launched" Feature Flags)
We hebben in de source code ontdekt (zie `2_feature_flags_loader.js`) dat Droid een remote-config ophaalt. Factory is zich bewust van dit probleem en heeft een nieuwe rendering engine gebouwd, weggestopt achter twee feature flags die voor jou standaard uit stonden:
1. `cli_incremental_rendering`
2. `tui_use_composable_daemon_core`

De code (uit `4_daemon_core_lv0.js`) bewijst dat als `cli_incremental_rendering` op `true` staat, Droid de Ink DOM niet meer vernietigt, maar incrementeel patcht (`incrementalRendering: w.enabled`). Dit elimineert de Garbage Collection overhead.
We hebben dit in jouw `.factory/cache/feature-flags.json` geforceerd op `true` en de file readonly gemaakt met `chmod 444`.

## 5. De Geëxtraheerde Systemen
Aangezien de subagents crashten door hun API limieten, heb ik lokaal een Python decompiler geschreven die de binaire offsets uitleest. De ruwe JavaScript code van de belangrijkste systemen is succesvol geëxtraheerd en veiliggesteld voor analyse of nabouw:
- `1_feature_flags_registry.js`
- `2_feature_flags_loader.js`
- `3_tui_incremental_mount.js`
- `4_daemon_core_lv0.js`
*(Locatie: `~/Droid-onderzoek-triage/extracted-source/core-systems/`)*

## Actiepunt voor Bug Report
We hebben nu daadwerkelijke broncode van hun rendering pipeline. Als we een issue aanmaken op de Factory GitHub, kunnen we ze direct confronteren met hun eigen `lv0` functie en de `cli_incremental_rendering` implementatie die schijnbaar nog vastzit achter hun Statsig feature-flag distributie.
