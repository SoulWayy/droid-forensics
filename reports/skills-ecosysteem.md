# Droid Skills Ecosysteem

> Geïnstalleerd in vorige Pi-sessie (13:57–14:59, 7 juli 2026)
> 5 eigen skills + 4 externe RE skills = **9 skills totaal**

---

## Eigen Pi Skills (utrecht-data-os)

Deze skills zijn handgeschreven voor Droid debugging, versie v2.x.

| Skill | Versie | Focus | Regels |
|-------|--------|-------|--------|
| `droid-perf` | **v2.1.0** | Master entry — routeert naar alle skills | 133 |
| `droid-telemetry-analysis` | v2.0.0 | Logs, React errors, metrics rate | 252 |
| `droid-process-diagnosis` | v2.0.0 | CPU, threads, memory, worker lifecycle | 307 |
| `droid-network-analysis` | v2.0.0 | tshark/tcpdump capture, IPC analyse | 305 |
| `droid-binary-reverse-engineering` | v2.0.0 | .bun extractie, Rust/JSC/Ink layers | 388 |

**Locatie:** `~/.pi/agent/skills/droid-*`

### droid-perf Master Skill (v2.1.0)
- Nieuwe routing tabel met alle 9 skills
- Snelle scan (telemetry → process → network → binary)
- Diepe RE track (protocol-RE → binary-analysis → memory-forensics)
- Quick reference met 8 bash one-liners

---

## Externe RE Skills (wshobson/agents)

Geïnstalleerd via `npx skills add` en gesymlinkt naar `~/.pi/agent/skills/`.

| Skill | Focus | Regels |
|-------|-------|--------|
| `protocol-reverse-engineering` | Wireshark dissectors, Scapy parsing, fuzzing | 520 |
| `binary-analysis-patterns` | Ghidra/IDA, x86-64 disassembly | 351 |
| `memory-forensics` | Volatility, core dump analyse | 347 |
| `anti-reversing-techniques` | Anti-debug/obfuscation patterns | — |

**Locatie:** `~/.agents/skills/*` (gesymlinkt naar `~/.pi/agent/skills/*`)

---

## Dependencies

```bash
✅ strace    — syscall profiling
✅ scapy     — packet manipulation
✅ tshark    — CLI packet capture
✅ tcpdump   — packet capture
✅ gdb       — debugger / backtrace
✅ gcore     — core dump
✅ strings   — binary strings extractie
✅ readelf   — ELF sectie analyse
✅ objdump   — disassembly
✅ pmap      — memory mapping
✅ lsof      — open files/sockets
✅ ss        — socket statistics
```

**Ontbreekt:** `pyelftools` (Python module voor ELF parsing — niet als binary vindbaar)

---

## Hoe te gebruiken

```bash
# Laad een skill via Pi:
# Noem gewoon het skill thema in je prompt, bv:
#   "gebruik droid-process-diagnosis om threads te checken"
#   "start droid-network-analysis voor tshark capture"

# Of roep direct een tool uit de skill aan:
cat ~/.pi/agent/skills/droid-network-analysis/SKILL.md
```
