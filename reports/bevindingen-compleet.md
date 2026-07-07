# Droid Onderzoek Triage — Volledige Bevindingen

**Datum:** 7 Juli 2026 (sessies 13:57–14:59 + 15:08–heden)
**Doelwit:** `droid` v0.164.1 — Main TUI (PID 2663905) + Worker subprocessen
**Symptomen:** 58–60% CPU, input lag, hoog geheugen, render loops

---

## 1. Proces Architectuur

### Main TUI (PID 2663905)
| Eigenschap | Waarde |
|---|---|
| Binary | `/home/jan/.local/bin/droid` |
| CPU | **58.7%** (piek >60%) |
| RSS | **400 MB** (resident) |
| VSZ | **74 GB** (virtueel — normaal voor JSC) |
| Looptijd | ~46 minuten (sinds 13:50) |
| Runtime | Rust core + JavaScriptCore (JSC, géén V8) |
| TUI Engine | **Ink** (React voor CLI) |
| Threads | **14** (tokio workers + JSC + portable-pty) |

### Worker Subprocessen
- **PID 2749201:** `droid exec --input-format stream-jsonrpc` (IPC worker)
- **PID 2760682:** `droid exec` — subagent voor PR #759 fix
- Communiceren via **JSON-RPC** over TCP loopback `127.0.0.1`

### Thread-level Analyse (top -H -p 2663905)
```
TID       %CPU  COMMAND
2663905   56.0  droid (main)
2663906    0.4  droid
2663907    0.5  HeapHelper
2663908    0.5  HeapHelper
2663909    0.5  HeapHelper
2664077    0.0  Bun Pool 0
2664078    0.0  Bun Pool 1
2664157    0.0  Bun Pool 2
2664185    0.0  HTTP Client
2665922    0.0  Bun Pool 3
2665923    0.0  fs.watch
2673460    1.6  JITWorke
```

**Conclusie:** CPU wordt gedomineerd door de **main thread** (JSC event-loop + Ink rendering). JIT compilation en HeapHelper threads dragen bij. Bun Pool threads zijn idle — geen tokio overload.

---

## 2. Console Errors — React/Ink Render Loops

In `~/.factory/logs/console.log` — een **continue stroom** van React errors:

### Error Type 1: Duplicate Keys (meest frequent)
```
ERROR: Encountered two children with the same key, `header-configs`.
       Keys should be unique so that components maintain their identity
       across updates.
```
- **Frequentie:** Honderden keren, met pieken om 11:31, 11:52–11:56, 12:22, 12:30, 12:33, 12:39, 12:50
- **Oorzaak:** Ink component `header-configs` wordt 2× gerenderd met dezelfde `key` prop
- **Gevolg:** React moet elke keer de hele VNode tree reconcilen → CPU overload

### Error Type 2: Maximum Update Depth Exceeded
```
ERROR: Maximum update depth exceeded.
       This can happen when a component calls setState inside useEffect,
       but useEffect either doesn't have a dependency array, or one of
       the dependencies changes on every render.
```
- **Frequentie:** 8× tussen 08:49–08:50 (vroege ochtend piek)
- **Oorzaak:** `setState()` in `useEffect()` zonder correcte dependency array
- **Gevolg:** Oneindige render loop tot React ingrijpt

### Error Type 3: setState tijdens render
```
ERROR: Cannot update a component (`jnM`) while rendering a different component (`jnM`).
       To locate the bad setState() call inside `jnM`
```
- **Frequentie:** 11:50, 11:57, 12:28
- **Oorzaak:** Side-effect in render phase — component `jnM` called `setState()` tijdens render van een andere instantie
- **Gevolg:** React inconsistent state, extra re-renders

### Noise: i18next Locize Promo
```
INFO: 🌐 i18next is maintained with support from Locize —
      consider powering your project with managed localization...
```
Deze `.info()` message wordt **continu** gelogd — elke render cycle. Dit is een i18next init message die elke render opnieuw wordt aangeroepen.

---

## 3. Metrics & Telemetry

### JSON-RPC Notification Count
```
[metrics_log_factory_app_jsonrpc_notification_count]
type: "assistant_text_delta"
metric: "factory_app_jsonrpc_notification_count"
value: 1
tags: {
  version: "0.164.1",
  os: "linux 6.1.0-50-amd64",
  terminal: "xterm-256color",
  clientMode: "tui",
  droidMode: "terminal-ui",
  sessionId: "16f12abc-1479-422f-9231-6dbf3c03fd01"
}
```

### Teardown Timing
```
[phase_teardown-droid-exec]
metric: "phase_duration_ms"
value: 5085  ← 5 seconden teardown!
```

**Bevinding:** De worker teardown duurt **5 seconden** — dit gebeurt bij elke prompt-sessie wissel. Dat is extreem lang voor een proces-terminatie.

---

## 4. Syscall Profiling (strace summary)

Top syscalls van de main droid (PID 2663905):
| Syscall | Volume | Betekenis |
|---------|--------|-----------|
| `madvise` | **Zeer hoog** | Agressieve memory advising — JSC GC / heap management |
| `pread64` | Hoog | File I/O (JS bundle lezen?) |
| `clock_gettime` | Hoog | Event-loop timing / metrics |
| `epoll_wait` | Matig | Event loop wachten op IO |
| `writev` | Matig | JSON-RPC IPC naar worker |
| `read` | Matig | Input van terminal / IPC |

**Conclusie:** De CPU gaat naar **GC/memory management** (madvise) en **event-loop overhead** (clock_gettime + epoll). Dit patroon past bij een render loop die continu state verwerkt.

---

## 5. Netwerk & IPC

### Externe Verbindingen
- **Google APIs** (`ra-in-f121.1e100.net:https`) — LLM API calls
- **Tailscale** (100.x.x.x) — interne mesh verbindingen
- **GitHub** (`git@github.com:22`) — git operations

### IPC Pattern
```
Main TUI (PID 2663905) ← JSON-RPC over TCP 127.0.0.1 → Worker (PID 2749201)
```
- Kleine heartbeat pings: `\1\0\0\0...`
- Notificatie stroom: `assistant_text_delta` notificaties
- Metrics worden meegegeven in elke RPC call

---

## 6. Core Dump & Memory

- **Eerste poging (agy):** `gcore` met `--dump-excluded-mappings` → **6.8 GB** (hele VSZ)
- **Tweede poging (deze sessie):** zelfde fout → **54 GB** dump, disk op 99%
- **Juiste aanpak:** `gcore` **zonder** `--dump-excluded-mappings` → alleen RSS (~400 MB)

---

## 7. Skills Ecosysteem (gebouwd in vorige sessie)

### Eigen Pi Skills (v2.x)
| Skill | Focus | Status |
|-------|-------|--------|
| `droid-telemetry-analysis` | Logs, React errors, metrics rate | ✅ v2.0.0 |
| `droid-process-diagnosis` | CPU, threads, memory, worker lifecycle | ✅ v2.0.0 |
| `droid-network-analysis` | tshark/tcpdump capture, IPC analyse | ✅ v2.0.0 |
| `droid-binary-reverse-engineering` | .bun extractie, Rust/JSC/Ink layers | ✅ v2.0.0 |
| `droid-perf` (master) | Routing naar alle skills | ✅ v2.1.0 |

### Externe RE Skills (via npx skills add)
| Skill | Focus |
|-------|-------|
| `protocol-reverse-engineering` | Wireshark dissectors, Scapy parsing |
| `binary-analysis-patterns` | Ghidra/IDA, x86-64 disassembly |
| `memory-forensics` | Volatility, core dump analysis |
| `anti-reversing-techniques` | Anti-debug/obfuscation patterns |

### Dependencies
✅ strace ✅ scapy ✅ tshark ✅ tcpdump ✅ gdb ✅ gcore ✅ strings ✅ readelf ✅ objdump ✅ pmap ✅ lsof ✅ ss

---

## 8. Root Cause Analyse

### Primaire Oorzaak: React/Ink Render Loop
De **Ink TUI** (React voor CLI) zit vast in een **re-render storm**:
1. `header-configs` component wordt 2× gerenderd met dezelfde key
2. React VNode reconciliation faalt → blijft proberen
3. `setState` tijdens render van `jnM` component → extra re-renders
4. i18next `console.info()` wordt elke render cycle getriggerd
5. Event-loop overbelast → input wordt niet verwerkt → **input lag**

### Secundair: JSC GC Overhead
- `madvise` spam duidt op agressieve Garbage Collection
- 74 GB VSZ (virtueel) is normaal voor JSC, maar de **frequency** van GC is problematisch
- GC wordt getriggerd door de constante state mutations in de render loop

### Tertiair: 5s Teardown
- Worker teardown duurt 5 seconden — waarschijnlijk door open HTTP verbindingen die moeten worden afgesloten of responses die nog binnenkomen

---

## 9. Actiepunten

| Prioriteit | Actie | Skill/Tool |
|---|---|---|
| 🔴 **HIGH** | TUI bundle extracten en `header-configs` key bug vinden | `droid-binary-reverse-engineering` |
| 🔴 **HIGH** | `jnM` component setState-in-render fixen in de JS bundle | `droid-telemetry-analysis` |
| 🟡 **MED** | JSON-RPC IPC capturen met tshark — check notification rate | `droid-network-analysis` |
| 🟡 **MED** | Core dump maken zonder `--dump-excluded-mappings` (~400 MB) | `droid-process-diagnosis` |
| 🟢 **LOW** | i18next Locize promo onderdrukken (log level) | Config change |
| 🟢 **LOW** | Teardown timing optimaliseren (5s → <1s) | Worker lifecycle review |
