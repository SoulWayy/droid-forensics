import { useState, useRef, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════
// FORENSIC CASE DATA
// ═══════════════════════════════════════════════════════════
interface Actor {
  id: string; label: string; sub: string; color: string
  x: number; y: number; w: number; h: number; rotation: number
  facts: Record<string, string>
}

interface Connection {
  from: string; to: string; label: string
  count?: number; type: string; detail?: string
}

interface Evidence {
  file: string; count: number; sev: 'critical' | 'high' | 'medium'
  cause: string; fix: string
}

const ACTORS: Actor[] = [
  { id:'tui', label:'TUI Process', sub:'PID 2663905 • Ink/React', color:'#1e40af',
    x:60, y:240, w:180, h:95, rotation:-1.5,
    facts:{ cpu:'56%', rss:'400MB', threads:'14', verdict:'PRIMARY SUSPECT' } },
  { id:'daemon', label:'Daemon Adapter', sub:'Session Bridge', color:'#1e40af',
    x:70, y:410, w:160, h:55, rotation:1,
    facts:{ role:'State proxy', verdict:'Bystander' } },
  { id:'worker', label:'Worker', sub:'droid exec • 42 sessions', color:'#15803d',
    x:410, y:250, w:180, h:95, rotation:0.5,
    facts:{ model:'GLM-5.2-0', sessions:'42', teardown:'5,085ms', verdict:'Overworked' } },
  { id:'llm', label:'LLM API', sub:'GLM • OpenCode • Clinepass', color:'#b91c1c',
    x:760, y:100, w:190, h:80, rotation:-2,
    facts:{ errors429:'232', providers:'3', cascade:'Source trigger', verdict:'RATE LIMITED' } },
  { id:'mcp', label:'MCP Servers', sub:'linear • notion • playwright', color:'#1e40af',
    x:760, y:380, w:190, h:75, rotation:1.5,
    facts:{ tools:'102', calls:'1,182', connects:'120', verdict:'Stable' } },
  { id:'settings', label:'Settings Store', sub:'keyfile-v2', color:'#ca8a04',
    x:50, y:560, w:170, h:55, rotation:-0.5,
    facts:{ sources:'9', persist_fails:'3', verdict:'Corrupt' } },
  { id:'plugins', label:'Plugin Loader', sub:'8 marketplaces', color:'#ca8a04',
    x:280, y:560, w:170, h:55, rotation:1,
    facts:{ yaml_errors:'360', skills:'2,627', latency:'221-20,482ms', verdict:'Degraded' } },
  { id:'factory', label:'Factory Cloud', sub:'Telemetry', color:'#1e40af',
    x:760, y:510, w:190, h:55, rotation:-1,
    facts:{ metrics:'22 types', verdict:'Observer' } }
]

const CONNECTIONS: Connection[] = [
  { from:'tui', to:'daemon', label:'state', type:'internal' },
  { from:'daemon', to:'worker', label:'JSON-RPC', count:31994, type:'data', detail:'stream-jsonrpc over loopback' },
  { from:'worker', to:'daemon', label:'notifications', count:31994, type:'data', detail:'15 notification types' },
  { from:'worker', to:'llm', label:'HTTPS stream', count:1250, type:'data', detail:'sendMessage.ts' },
  { from:'llm', to:'worker', label:'429 RATE LIMITED', count:232, type:'error', detail:'Weekly Clinepass + 5h OpenCode' },
  { from:'llm', to:'worker', label:'thinking_delta', count:17000, type:'data', detail:'LLM reasoning stream' },
  { from:'llm', to:'worker', label:'assistant_delta', count:5732, type:'data', detail:'LLM response stream' },
  { from:'worker', to:'mcp', label:'tool_call', count:1182, type:'data', detail:'19 unique tools' },
  { from:'mcp', to:'worker', label:'tool_result', count:307, type:'data' },
  { from:'tui', to:'settings', label:'read config', type:'config' },
  { from:'tui', to:'plugins', label:'load skills', count:2627, type:'config', detail:'180→196 skills repeatedly' }
]

const EVIDENCE: Evidence[] = [
  { file:'Header.tsx:376-386', count:209, sev:'critical', cause:'sync statSync in useMemo render path', fix:'useEffect + async' },
  { file:'parseFrontmatter.ts:28', count:2924, sev:'critical', cause:'YAML indent errors in skill files', fix:'try/catch + defaults' },
  { file:'git.ts:18 (statSync)', count:477, sev:'critical', cause:'blocking I/O in render path', fix:'async git check' },
  { file:'getReadinessHint/index.ts:85', count:75, sev:'critical', cause:'called from Header useMemo', fix:'move to useEffect' },
  { file:'PluginLoader.ts:482', count:720, sev:'high', cause:'plugin load errors', fix:'validate manifests' },
  { file:'fileLoaders.ts:85-86', count:2924, sev:'high', cause:'cascaded from parseFrontmatter', fix:'linked' }
]

const TYPE_COLORS: Record<string,string> = {
  data:'#1e40af', error:'#b91c1c', config:'#ca8a04', internal:'#78716c', mcp:'#1e40af'
}

function isSuspect(a: Actor) {
  return /SUSPECT|LIMITED|Corrupt|Degraded/i.test(a.facts.verdict || '')
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [hovered, setHovered] = useState<Actor | Connection | Evidence | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({x:0, y:0})
  const dragRef = useRef<{start:{x:number,y:number}, orig:{x:number,y:number}} | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Zoom on wheel
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => Math.max(0.4, Math.min(3, z * (e.deltaY > 0 ? 0.92 : 1.08))))
    }
    el.addEventListener('wheel', handler, {passive:false})
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // Pan on drag
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.index-card, .evidence-card, .tag-label, [data-interactive]')) return
    dragRef.current = { start:{x:e.clientX, y:e.clientY}, orig:{...pan} }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    setPan({
      x: dragRef.current.orig.x + (e.clientX - dragRef.current.start.x),
      y: dragRef.current.orig.y + (e.clientY - dragRef.current.start.y)
    })
  }
  const onMouseUp = () => { dragRef.current = null }

  const actorMap = Object.fromEntries(ACTORS.map(a => [a.id, a]))

  // Tooltip position
  const [ttPos, setTtPos] = useState({x:0, y:0})
  useEffect(() => {
    const handler = (e: MouseEvent) => setTtPos({x:e.clientX, y:e.clientY})
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <div
      ref={stageRef}
      className="w-screen h-screen relative overflow-hidden"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{cursor: dragRef.current ? 'grabbing' : 'default'}}
    >
      {/* ════ HEADER ════ */}
      <div className="absolute top-0 left-0 right-0 z-50 px-7 py-4 flex justify-between items-end pointer-events-none"
        style={{background:'linear-gradient(180deg, var(--paper) 0%, rgba(237,232,219,0.7) 80%, transparent 100%)'}}>
        <div>
          <div className="font-typewriter text-[0.65rem] tracking-[2px] uppercase text-stone-600">
            Case File № 0164 • Systems Autopsy
          </div>
          <h1 className="font-typewriter text-[1.6rem] font-normal tracking-tight text-stone-900 mt-0.5">
            Droid Performance Forensics
          </h1>
        </div>
        <div className="font-mono-ibm text-[0.7rem] text-stone-600 text-right leading-relaxed">
          <strong className="text-stone-900">Subject:</strong> droid v0.164.1<br/>
          <strong className="text-stone-900">Evidence:</strong> 103,994 log lines • 42 sessions<br/>
          <strong className="text-stone-900">Verdict:</strong> Sync I/O in render path
        </div>
      </div>

      {/* CLASSIFIED stamp */}
      <div className="absolute top-[18px] right-[340px] z-50 pointer-events-none font-typewriter text-[0.85rem] font-bold text-red-700 border-[3px] border-red-700 px-3 py-1 tracking-[3px] opacity-70 bg-[rgba(237,232,219,0.5)]"
        style={{transform:'rotate(-8deg)', borderRadius:'2px'}}>
        CLASSIFIED
      </div>

      {/* ════ CANVAS STAGE ════ */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* ── SVG: Red string connections ── */}
        <svg className="absolute inset-0 pointer-events-none" style={{width:'100%', height:'100%', zIndex:1}}>
          {CONNECTIONS.map((conn, i) => {
            const from = actorMap[conn.from], to = actorMap[conn.to]
            if (!from || !to) return null
            const fx = from.x + from.w, fy = from.y + from.h/2
            const tx = to.x, ty = to.y + to.h/2
            const samePair = CONNECTIONS.filter(c => c.from===conn.from && c.to===conn.to)
            const offY = (samePair.indexOf(conn) - (samePair.length-1)/2) * 14
            const midX = (fx + tx) / 2
            const sag = 15 + (i % 3) * 5
            const color = TYPE_COLORS[conn.type] || '#78716c'
            const isErr = conn.type === 'error'
            const path = `M ${fx} ${fy+offY} Q ${midX} ${fy+offY+sag} ${tx} ${ty+offY}`

            return (
              <g key={i} data-interactive onMouseEnter={() => setHovered(conn)} onMouseLeave={() => setHovered(null)}
                style={{pointerEvents:'auto', cursor:'pointer'}}>
                {/* Shadow path */}
                <path d={path} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={isErr?4:3}
                  strokeDasharray="1 2" strokeLinecap="round"/>
                {/* Yarn */}
                <path d={path} fill="none" stroke={color} strokeWidth={isErr?3:2}
                  strokeLinecap="round" style={{filter: isErr ? `drop-shadow(0 0 4px ${color}66)` : 'none'}}/>
                {/* Arrow */}
                <polygon points={`${tx-7},${ty+offY-4} ${tx+2},${ty+offY} ${tx-7},${ty+offY+4}`}
                  fill={color}/>
                {/* Animated dots for error/high-volume */}
                {(isErr || (conn.count && conn.count > 5000)) && (
                  <circle r={isErr?3:2} fill={color}>
                    <animateMotion dur={isErr?'2s':'4s'} repeatCount="indefinite" path={path}/>
                  </circle>
                )}
              </g>
            )
          })}

          {/* Red string from evidence to TUI */}
          {EVIDENCE.slice(0,4).map((ev, i) => {
            const tui = actorMap['tui']
            const evX = (window.innerWidth - 340) + (i%2===0?0:15)
            const evY = 100 + i*72 + 31
            const tx = tui.x + tui.w, ty = tui.y + 30
            const midX = (evX + tx) / 2
            const sag = 20 + i*8
            return (
              <path key={`ev-${i}`}
                d={`M ${evX} ${evY} Q ${midX} ${evY - sag} ${tx} ${ty}`}
                fill="none" stroke="rgba(185,28,28,0.25)" strokeWidth="1"
                strokeDasharray="3 3"/>
            )
          })}
        </svg>

        {/* ── Index Cards: Actors ── */}
        {ACTORS.map(actor => {
          const suspect = isSuspect(actor)
          const verdict = actor.facts.verdict || ''
          const stampColor = /SUSPECT|LIMITED/i.test(verdict) ? '#b91c1c'
            : /Corrupt|Degraded/i.test(verdict) ? '#ca8a04' : '#15803d'
          return (
            <div key={actor.id}
              className={`index-card ${suspect?'suspect':''}`}
              style={{
                left:actor.x, top:actor.y, width:actor.w, height:actor.h,
                transform:`rotate(${actor.rotation}deg)`,
              }}
              data-interactive
              onMouseEnter={() => setHovered(actor)} onMouseLeave={() => setHovered(null)}
            >
              <div className="pushpin"/>
              {/* Header band */}
              <div className="absolute top-0 left-0 right-0 h-[22px] rounded-t-[2px] flex items-center px-2"
                style={{background:actor.color+'cc'}}>
                <span className="font-typewriter text-[12px] text-white">{actor.label}</span>
              </div>
              {/* Subtitle */}
              <div className="font-mono-ibm text-[9px] text-stone-600 px-2 mt-[24px]">{actor.sub}</div>
              {/* Facts */}
              <div className="px-2 mt-[4px] space-y-[2px]">
                {Object.entries(actor.facts).filter(([k])=>k!=='verdict').map(([k,v]) => {
                  const isErr = /429|fail|error|corrupt/i.test(k)
                  return (
                    <div key={k} className="font-mono-ibm text-[8px] flex gap-1">
                      <span className="text-stone-500">{k}:</span>
                      <span className={isErr ? 'text-red-700 font-bold' : 'text-stone-900'}>{v}</span>
                    </div>
                  )
                })}
              </div>
              {/* Verdict stamp */}
              {verdict && (
                <div className="absolute bottom-1 right-2" style={{transform:'rotate(-3deg)'}}>
                  <div className="rubber-stamp" style={{color:stampColor, fontSize:'9px'}}>
                    {verdict.toUpperCase()}
                  </div>
                </div>
              )}
              {/* Pulse ring for suspects */}
              {suspect && (
                <svg className="absolute inset-0 pointer-events-none" style={{overflow:'visible'}}>
                  <circle cx={actor.w/2} cy={actor.h/2} r={actor.w/2 + 5}
                    fill="none" stroke="#b91c1c" strokeWidth="1.5" opacity="0.3">
                    <animate attributeName="r" values={`${actor.w/2+5};${actor.w/2+20};${actor.w/2+5}`}
                      dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.4;0.05;0.4"
                      dur="2s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              )}
            </div>
          )
        })}

        {/* ── Tag labels on strings ── */}
        {CONNECTIONS.map((conn, i) => {
          const from = actorMap[conn.from], to = actorMap[conn.to]
          if (!from || !to) return null
          const fx = from.x + from.w, fy = from.y + from.h/2
          const tx = to.x, ty = to.y + to.h/2
          const samePair = CONNECTIONS.filter(c => c.from===conn.from && c.to===conn.to)
          const offY = (samePair.indexOf(conn) - (samePair.length-1)/2) * 14
          const midX = (fx + tx) / 2
          const sag = 15 + (i % 3) * 5
          const color = TYPE_COLORS[conn.type] || '#78716c'
          const isErr = conn.type === 'error'
          let label = conn.label
          if (conn.count) label += ` ×${conn.count.toLocaleString()}`
          const labelW = label.length * 5 + 14

          return (
            <div key={`tag-${i}`} className="tag-label"
              style={{
                left: midX - labelW/2,
                top: ty + offY + sag - 8,
                borderColor: color,
                color: color,
                fontWeight: isErr ? 'bold' : 'normal',
                transform: `rotate(${(i%5-2)*0.8}deg)`,
                zIndex: 5
              }}
              data-interactive
              onMouseEnter={() => setHovered(conn)} onMouseLeave={() => setHovered(null)}
            >
              {label}
            </div>
          )
        })}

        {/* ── Evidence Cards (Polaroids) ── */}
        <div className="absolute" style={{right: 340, top: 80, width: 320}}>
          <div className="font-typewriter text-[13px] font-bold text-stone-900 mb-3 pb-2 border-b border-stone-400">
            🔥 EVIDENCE — Code Hotspots
          </div>
        </div>
        {EVIDENCE.map((ev, i) => {
          const sevColors = {critical:'#b91c1c', high:'#ca8a04', medium:'#78716c'}
          const color = sevColors[ev.sev]
          const rot = (i % 2 === 0 ? -1.5 : 1.8)
          return (
            <div key={i}
              className="evidence-card"
              style={{
                right: 340 + (i%2===0?0:15),
                top: 110 + i*72,
                width: 300, height: 62,
                transform: `rotate(${rot}deg)`,
                zIndex: 5
              }}
              data-interactive
              onMouseEnter={() => setHovered(ev)} onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-start p-2 gap-2">
                <div className="mt-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:color}}/>
                  <div className="w-4 h-4 rounded-full -mt-1.5 -ml-1 border" style={{borderColor:color, opacity:0.3}}/>
                </div>
                <div className="flex-1">
                  <div className="font-typewriter text-[10px] text-stone-900">{ev.file}</div>
                  <div className="font-handwritten text-[11px] text-stone-600 mt-0.5">{ev.cause}</div>
                </div>
                <div className="text-right">
                  <div className="font-typewriter text-[14px] font-bold" style={{color}}>{ev.count}×</div>
                  <div className="font-typewriter text-[7px]" style={{color, transform:'rotate(-2deg)'}}>
                    {ev.sev.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ════ TOOLTIP ════ */}
      {hovered && (
        <div className="fixed z-[100] pointer-events-none"
          style={{
            left: Math.min(ttPos.x + 20, window.innerWidth - 380),
            top: Math.max(ttPos.y - 10, 80),
            maxWidth: 360,
            background:'var(--paper)',
            border:'1px solid var(--ink)',
            borderRadius:'2px',
            padding:'14px 18px',
            boxShadow:'4px 4px 0 rgba(0,0,0,0.15), 8px 8px 16px rgba(0,0,0,0.1)',
            fontFamily:'IBM Plex Mono, monospace',
            fontSize:'0.78rem',
            transform:'rotate(-0.5deg)'
          }}>
          {'label' in hovered && 'sub' in hovered && 'facts' in hovered ? (
            <ActorTooltip actor={hovered as Actor}/>
          ) : 'from' in hovered ? (
            <ConnectionTooltip conn={hovered as Connection}/>
          ) : (
            <EvidenceTooltip ev={hovered as Evidence}/>
          )}
        </div>
      )}

      {/* ════ LEGEND ════ */}
      <div className="absolute bottom-5 right-6 z-50 pointer-events-none bg-[var(--paper)] border border-stone-500 px-4 py-3 font-mono-ibm text-[0.72rem] shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
        style={{transform:'rotate(0.5deg)'}}>
        <div className="font-typewriter text-[0.7rem] text-stone-900 mb-1.5 tracking-wider border-b border-stone-400 pb-1">
          EVIDENCE KEY
        </div>
        <div className="flex items-center gap-2 my-0.5 text-stone-600">
          <div className="w-3.5 h-2 border" style={{background:'#1e40af22', borderColor:'#1e40af'}}/>Process / Actor
        </div>
        <div className="flex items-center gap-2 my-0.5 text-stone-600">
          <div className="w-3.5 h-2 border" style={{background:'#15803d22', borderColor:'#15803d'}}/>Healthy flow
        </div>
        <div className="flex items-center gap-2 my-0.5 text-stone-600">
          <div className="w-3.5 h-2 border" style={{background:'#b91c1c22', borderColor:'#b91c1c'}}/>Error / Cascade
        </div>
        <div className="flex items-center gap-2 my-0.5 text-stone-600">
          <div className="w-3.5 h-2 border" style={{background:'#fde04755', borderColor:'#ca8a04'}}/>Configuration
        </div>
      </div>

      {/* ════ HELP TEXT ════ */}
      <div className="absolute bottom-5 left-6 z-50 pointer-events-none font-handwritten text-[1.1rem] text-blue-800"
        style={{transform:'rotate(-1deg)', maxWidth:300}}>
        ※ drag om te pannen • scroll om te zoomen • hover voor bewijs
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TOOLTIP SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════
function Stamp({children, color}: {children:string, color:string}) {
  return (
    <div className="rubber-stamp mb-1.5" style={{color, fontSize:'0.7rem'}}>
      {children}
    </div>
  )
}

function ActorTooltip({actor}: {actor: Actor}) {
  const verdict = actor.facts.verdict || ''
  const stampColor = /SUSPECT|LIMITED/i.test(verdict) ? '#b91c1c'
    : /Corrupt|Degraded/i.test(verdict) ? '#ca8a04' : '#15803d'
  return (
    <>
      <Stamp color={stampColor}>{verdict.toUpperCase()}</Stamp>
      <div className="font-typewriter text-[1rem] font-bold text-stone-900 mb-1">{actor.label}</div>
      <div className="text-stone-600">{actor.sub}</div>
      {Object.entries(actor.facts).filter(([k])=>k!=='verdict').map(([k,v]) => {
        const isErr = /429|fail|error|corrupt/i.test(k)
        return (
          <div key={k} className="text-stone-600 mt-0.5">
            {k}: <span className={isErr ? 'text-red-700 font-semibold' : 'text-stone-900 font-medium'}>{v}</span>
          </div>
        )
      })}
    </>
  )
}

function ConnectionTooltip({conn}: {conn: Connection}) {
  const color = conn.type === 'error' ? '#b91c1c' : '#15803d'
  return (
    <>
      <Stamp color={color}>{conn.type.toUpperCase()}</Stamp>
      <div className="font-typewriter text-[1rem] font-bold text-stone-900 mb-1">
        {conn.from} → {conn.to}
      </div>
      <div className="text-stone-600">label: <span className="text-stone-900 font-medium">{conn.label}</span></div>
      {conn.count && <div className="text-stone-600">count: <span className="text-stone-900 font-medium">{conn.count.toLocaleString()}</span></div>}
      {conn.detail && <div className="text-stone-600">detail: <span className="text-stone-900">{conn.detail}</span></div>}
    </>
  )
}

function EvidenceTooltip({ev}: {ev: Evidence}) {
  const sevColor = ev.sev === 'critical' ? '#b91c1c' : '#ca8a04'
  return (
    <>
      <Stamp color={sevColor}>{ev.sev.toUpperCase()}</Stamp>
      <div className="font-typewriter text-[1rem] font-bold text-stone-900 mb-1">{ev.file}</div>
      <div className="text-stone-600">count: <span className="text-red-700 font-semibold">{ev.count}×</span></div>
      <div className="text-stone-600">cause: <span className="text-stone-900">{ev.cause}</span></div>
      <div className="text-stone-600">fix: <span className="text-green-700 font-medium">{ev.fix}</span></div>
    </>
  )
}
