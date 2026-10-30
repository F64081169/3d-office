import { directReports, OWNER, type Agent } from '@office/shared'
import { useEffect, useState } from 'react'
import { DEPT_COLOR } from '../agents/status'
import { AgentTags } from '../agents/tags'
import { useOfficeStore } from '../store/officeStore'
import { CAMERA_PRESETS } from '../world/layout'
import { SidePanel } from './SidePanel'
import { StatusBadge } from './StatusBadge'

export function Hud() {
  const introDone = useOfficeStore((s) => s.introDone)
  const toggleStats = useOfficeStore((s) => s.toggleStats)
  const select = useOfficeStore((s) => s.select)
  const follow = useOfficeStore((s) => s.follow)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return
      if (e.key === '`' || e.key.toLowerCase() === 'p') toggleStats()
      if (e.key === 'Escape') {
        select(null)
        follow(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleStats, select, follow])

  return (
    <div className={`hud ${introDone ? 'hud--ready' : ''}`}>
      <AgentTags />
      <Brand />
      <Roster />
      <ViewBar />
      <SidePanel />
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
      <span className="chip">MVP · Phase 2</span>
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
  const hovered = useOfficeStore((s) => s.hoveredId === agent.id)
  const active = useOfficeStore((s) => s.selectedId === agent.id)
  const setHovered = useOfficeStore((s) => s.setHovered)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
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
      <StatusBadge status={agent.status} />
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
  const [open, setOpen] = useState(false)
  return (
    <div className="help-wrap">
      {open && (
        <aside className="panel help">
          <div>
            <kbd>Drag</kbd> orbit · <kbd>Right-drag</kbd> pan · <kbd>Scroll</kbd> zoom
          </div>
          <div>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> move · <kbd>Q</kbd>/<kbd>E</kbd> down/up
          </div>
          <div>Click an agent or the cat for details · <kbd>Esc</kbd> close / stop following</div>
          <button className="link" onClick={toggleStats}>
            Performance stats (P)
          </button>
        </aside>
      )}
      <button className="panel help-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? '×' : '?'}
      </button>
    </div>
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
