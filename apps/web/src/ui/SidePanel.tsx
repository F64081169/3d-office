import { directReports, type AgentStatus } from '@office/shared'
import { useEffect, useRef, useState } from 'react'
import { APPEARANCE, DEFAULT_APPEARANCE } from '../agents/appearance'
import { DEPT_COLOR, STATUS_META } from '../agents/status'
import { CAT_ID, useOfficeStore } from '../store/officeStore'
import { CAT_ACTIVITY, CAT_COLOR, CAT_NAME } from '../world/cat/catInfo'
import { CoinIcon, HeartIcon, PawIcon } from './icons'
import { Badge, StatusBadge } from './StatusBadge'

const REWARD = 100
const STATUSES = Object.keys(STATUS_META) as AgentStatus[]
const LOCKED = 'Unlocks with the Task Engine (Phase 3)'

export function SidePanel() {
  const selectedId = useOfficeStore((s) => s.selectedId)
  if (!selectedId) return null
  return selectedId === CAT_ID ? <CatPanel /> : <AgentPanel id={selectedId} />
}

function AgentPanel({ id }: { id: string }) {
  const agents = useOfficeStore((s) => s.agents)
  const dispatch = useOfficeStore((s) => s.dispatch)
  const select = useOfficeStore((s) => s.select)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  const agent = agents.find((a) => a.id === id)
  if (!agent) return null

  const manager = agents.find((a) => a.id === agent.managerId)
  const reports = directReports(agents, agent.id)
  const look = APPEARANCE[agent.id] ?? DEFAULT_APPEARANCE
  const dept = DEPT_COLOR[agent.department]
  const perfColor = agent.performance >= 80 ? '#34b27a' : agent.performance >= 60 ? '#e0b04c' : '#e05a4f'

  return (
    <aside className="panel side-panel" style={{ '--dept': dept } as React.CSSProperties} aria-label={`${agent.name} details`}>
      <header className="sp-head">
        <div className="sp-avatar" style={{ background: look.top }}>
          <span style={{ background: look.skin, boxShadow: `inset 0 6px 0 ${look.hair}` }} />
        </div>
        <div className="sp-title">
          <div className="sp-name">{agent.name}</div>
          <div className="sp-role">{agent.role}</div>
          <div className="sp-dept">
            <i /> {agent.department} · Level {agent.level}
          </div>
        </div>
        <button className="sp-close" onClick={() => select(null)} aria-label="Close panel">
          ×
        </button>
      </header>

      <dl className="sp-grid">
        <dt>Status</dt>
        <dd>
          <StatusBadge status={agent.status} />
        </dd>
        <dt>Manager</dt>
        <dd>
          {manager ? (
            <button className="link" onClick={() => focusAgent(manager.id)}>
              {manager.name} · {manager.role}
            </button>
          ) : (
            'You (Owner)'
          )}
        </dd>
        <dt>Current task</dt>
        <dd className="muted">{agent.currentTaskId ?? 'No active task'}</dd>
      </dl>

      <div className="sp-metrics">
        <div className="metric">
          <span className="metric__label">Performance</span>
          <span className="metric__value">
            <b>{agent.performance}</b>
            <small>/100</small>
          </span>
          <div className="bar">
            <div style={{ width: `${agent.performance}%`, background: perfColor }} />
          </div>
        </div>
        <div className="metric">
          <span className="metric__label">Coins</span>
          <span className="metric__value">
            <CoinIcon size={16} />
            <CountUp value={agent.coins} />
          </span>
        </div>
      </div>

      <section className="sp-section">
        <h4>Skills</h4>
        <div className="chips">
          {agent.skills.map((s) => (
            <span key={s} className="chip-tag">
              {s}
            </span>
          ))}
        </div>
      </section>

      {reports.length > 0 && (
        <section className="sp-section">
          <h4>Team</h4>
          <div className="chips">
            {reports.map((r) => (
              <button key={r.id} className="chip-tag chip-tag--link" onClick={() => focusAgent(r.id)}>
                <i style={{ background: STATUS_META[r.status].color }} />
                {r.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="sp-actions">
        <button disabled title={LOCKED}>
          Chat
        </button>
        <button disabled title={LOCKED}>
          Assign Task
        </button>
        <button
          className="primary"
          onClick={() => dispatch({ type: 'AGENT_REWARDED', agentId: agent.id, coins: REWARD, reason: 'Owner reward' })}
        >
          <CoinIcon /> Reward +{REWARD}
        </button>
        <button disabled={!agent.currentTaskId} title={agent.currentTaskId ? undefined : 'No active task'}>
          View Task
        </button>
      </div>
      <p className="sp-note">
        {agent.level === 3 ? 'Director Chat' : 'Chat'}, Assign Task and View Task unlock with the Task Engine (Phase 3).
      </p>

      <details className="sp-preview">
        <summary>Status preview</summary>
        <p>Sends the same status event the Task Engine will send, so you can check how each status looks.</p>
        <div className="chips">
          {STATUSES.map((st) => (
            <button
              key={st}
              className={`chip-btn ${agent.status === st ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'AGENT_STATUS_CHANGED', agentId: agent.id, status: st })}
            >
              <StatusBadge status={st} />
            </button>
          ))}
        </div>
      </details>
    </aside>
  )
}

function CatPanel() {
  const cat = useOfficeStore((s) => s.cat)
  const following = useOfficeStore((s) => s.followId === CAT_ID)
  const select = useOfficeStore((s) => s.select)
  const follow = useOfficeStore((s) => s.follow)
  const petCat = useOfficeStore((s) => s.petCat)
  const activity = CAT_ACTIVITY[cat.activity]
  const where = cat.activity === 'wandering' ? `heading to ${cat.place}` : `at ${cat.place}`

  return (
    <aside className="panel side-panel" style={{ '--dept': CAT_COLOR } as React.CSSProperties} aria-label={`${CAT_NAME} details`}>
      <header className="sp-head">
        <div className="sp-avatar sp-avatar--cat">
          <PawIcon size={22} />
        </div>
        <div className="sp-title">
          <div className="sp-name">{CAT_NAME}</div>
          <div className="sp-role">Office Cat · Chief Morale Officer</div>
          <div className="sp-dept">
            <i /> Not on the org chart
          </div>
        </div>
        <button className="sp-close" onClick={() => select(null)} aria-label="Close panel">
          ×
        </button>
      </header>

      <dl className="sp-grid">
        <dt>Status</dt>
        <dd>
          <Badge label={activity.label} color={activity.color} />
        </dd>
        <dt>Where</dt>
        <dd>{where}</dd>
        <dt>Favourite</dt>
        <dd>Aria (Director)</dd>
        <dt>Pets today</dt>
        <dd>{cat.pets}</dd>
        <dt>Salary</dt>
        <dd className="muted">Paid in treats</dd>
      </dl>

      <div className="sp-actions sp-actions--two">
        <button className="primary" onClick={petCat}>
          <HeartIcon /> Pet
        </button>
        <button className={following ? 'is-active' : ''} onClick={() => follow(following ? null : CAT_ID)}>
          {following ? 'Stop following' : 'Follow'}
        </button>
      </div>
      <p className="sp-note">Mochi wanders between sunny windows, the lounge sofa, the coffee bar and whoever is at their desk.</p>
    </aside>
  )
}

/** Animated number that counts toward its value and pulses when it goes up. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const [bump, setBump] = useState(false)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700)
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3)))
      setShown(v)
      from.current = v
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    if (value > a) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 700)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(t)
      }
    }
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <b className={bump ? 'bump' : ''}>{shown.toLocaleString()}</b>
}
