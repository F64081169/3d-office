import { directReports, OWNER, type Agent } from '@office/shared'
import { useEffect, useState } from 'react'
import { DEPT_COLOR, STATUS_META } from '../agents/status'
import { AgentTags } from '../agents/tags'
import { useOfficeStore } from '../store/officeStore'
import { CAMERA_PRESETS } from '../world/layout'

export function Hud() {
  const introDone = useOfficeStore((s) => s.introDone)
  const toggleStats = useOfficeStore((s) => s.toggleStats)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return
      if (e.key === '`' || e.key.toLowerCase() === 'p') toggleStats()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleStats])

  return (
    <div className={`hud ${introDone ? 'hud--ready' : ''}`}>
      <AgentTags />
      <Brand />
      <Roster />
      <ViewBar />
      <Help />
      <Stats />
      {!introDone && <div className="intro-hint">Entering Claude Office · click or drag to skip</div>}
    </div>
  )
}

function Brand() {
  return (
    <header className="panel brand">
      <div className="brand__mark" />
      <div>
        <div className="brand__title">Claude Office</div>
        <div className="brand__subtitle">AI Agent Company Simulator</div>
      </div>
      <span className="chip">MVP · Phase 1</span>
    </header>
  )
}

function Roster() {
  const agents = useOfficeStore((s) => s.agents)
  const director = agents.find((a) => !a.managerId)
  const managers = director ? directReports(agents, director.id) : []
  const coins = agents.reduce((sum, a) => sum + a.coins, 0)
  const idle = agents.filter((a) => a.status === 'idle').length
  const [open, setOpen] = useState(true)

  return (
    <section className={`panel roster ${open ? '' : 'is-collapsed'}`}>
      <button className="roster__header" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          Organization <span className="roster__caret">{open ? '▾' : '▸'}</span>
        </span>
        <span className="roster__meta">
          {agents.length} agents · {idle} idle · {coins.toLocaleString()} coins
        </span>
      </button>
      <div className="roster__owner">
        <span className="avatar-dot" style={{ background: '#d97757' }} />
        <span className="roster__name">{OWNER.name}</span>
        <span className="roster__role">{OWNER.role}</span>
      </div>
      {director && <RosterRow agent={director} depth={0} />}
      {managers.map((m) => (
        <div key={m.id} className="roster__team">
          <RosterRow agent={m} depth={1} />
          {directReports(agents, m.id).map((a) => (
            <RosterRow key={a.id} agent={a} depth={2} />
          ))}
        </div>
      ))}
    </section>
  )
}

function RosterRow({ agent, depth }: { agent: Agent; depth: number }) {
  const hovered = useOfficeStore((s) => s.hoveredAgentId === agent.id)
  const active = useOfficeStore((s) => s.activeView === `agent:${agent.id}`)
  const setHovered = useOfficeStore((s) => s.setHovered)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  const status = STATUS_META[agent.status]
  return (
    <button
      className={`roster__row ${hovered ? 'is-hovered' : ''} ${active ? 'is-active' : ''}`}
      style={{ paddingLeft: 10 + depth * 14 }}
      onMouseEnter={() => setHovered(agent.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => focusAgent(agent.id)}
    >
      <span className="avatar-dot" style={{ background: DEPT_COLOR[agent.department] }} />
      <span className="roster__name">{agent.name}</span>
      <span className="roster__role">{agent.role}</span>
      <span className="status-pill" style={{ '--status': status.color } as React.CSSProperties}>
        <i />
        {status.label}
      </span>
    </button>
  )
}

function ViewBar() {
  const active = useOfficeStore((s) => s.activeView)
  const goToPreset = useOfficeStore((s) => s.goToPreset)
  return (
    <nav className="panel viewbar">
      {CAMERA_PRESETS.map((p) => (
        <button key={p.id} className={active === p.id ? 'is-active' : ''} onClick={() => goToPreset(p.id)}>
          {p.label}
        </button>
      ))}
    </nav>
  )
}

function Help() {
  const toggleStats = useOfficeStore((s) => s.toggleStats)
  return (
    <aside className="panel help">
      <div>
        <kbd>Drag</kbd> orbit · <kbd>Right-drag</kbd> pan · <kbd>Scroll</kbd> zoom
      </div>
      <div>
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> move · <kbd>Q</kbd>/<kbd>E</kbd> down/up · click an agent to focus
      </div>
      <button className="link" onClick={toggleStats}>
        Performance stats (P)
      </button>
    </aside>
  )
}

function Stats() {
  const show = useOfficeStore((s) => s.showStats)
  const stats = useOfficeStore((s) => s.stats)
  if (!show) return null
  return (
    <div className="panel stats">
      <div>
        <b>{stats.fps}</b> fps
      </div>
      <div>
        <b>{stats.calls}</b> draw calls
      </div>
      <div>
        <b>{(stats.triangles / 1000).toFixed(0)}k</b> triangles
      </div>
    </div>
  )
}
