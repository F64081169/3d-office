import { childrenOf, directReports, OWNER_ID, REWARD_BY_PRIORITY, type AgentStatus, type TaskPriority } from '@office/shared'
import { useEffect, useRef, useState } from 'react'
import { APPEARANCE, DEFAULT_APPEARANCE } from '../agents/appearance'
import { DEPT_COLOR, STATUS_META } from '../agents/status'
import { CAT_ID, DIRECTOR, useOfficeStore } from '../store/officeStore'
import { CAT_ACTIVITY, CAT_COLOR, CAT_NAME } from '../world/cat/catInfo'
import { CoinIcon, HeartIcon, PawIcon } from './icons'
import { RichText } from './RichText'
import { Badge, StatusBadge } from './StatusBadge'
import { PRIORITY_LABEL, TASK_STATUS_META, timeOf } from './taskMeta'

const STATUSES = Object.keys(STATUS_META) as AgentStatus[]
const PRIORITIES = Object.keys(PRIORITY_LABEL) as TaskPriority[]

export function SidePanel() {
  const selectedId = useOfficeStore((s) => s.selectedId)
  const viewTaskId = useOfficeStore((s) => s.viewTaskId)
  if (viewTaskId) return <TaskView id={viewTaskId} />
  if (!selectedId) return null
  return selectedId === CAT_ID ? <CatPanel /> : <AgentPanel id={selectedId} />
}

function AgentPanel({ id }: { id: string }) {
  const agents = useOfficeStore((s) => s.agents)
  const tasks = useOfficeStore((s) => s.tasks)
  const online = useOfficeStore((s) => s.connection === 'online')
  const select = useOfficeStore((s) => s.select)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  const viewTask = useOfficeStore((s) => s.viewTask)
  const openChat = useOfficeStore((s) => s.openChat)
  const reward = useOfficeStore((s) => s.reward)
  const previewStatus = useOfficeStore((s) => s.previewStatus)
  const [assigning, setAssigning] = useState(false)
  const agent = agents.find((a) => a.id === id)
  useEffect(() => setAssigning(false), [id])
  if (!agent) return null

  const manager = agents.find((a) => a.id === agent.managerId)
  const reports = directReports(agents, agent.id)
  const look = APPEARANCE[agent.id] ?? DEFAULT_APPEARANCE
  const dept = DEPT_COLOR[agent.department]
  const perfColor = agent.performance >= 80 ? '#34b27a' : agent.performance >= 60 ? '#e0b04c' : '#e05a4f'
  const current = agent.currentTaskId ? tasks[agent.currentTaskId] : undefined
  const recent = Object.values(tasks)
    .filter((t) => t.assignedTo === agent.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)

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
        <dd>
          {current ? (
            <button className="link" onClick={() => viewTask(current.id)}>
              {current.title}
            </button>
          ) : (
            <span className="muted">No active task</span>
          )}
        </dd>
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
        <button onClick={() => openChat(agent.id)} disabled={!online}>
          Chat
        </button>
        <button className={assigning ? 'is-active' : ''} onClick={() => setAssigning(!assigning)} disabled={!online}>
          Assign Task
        </button>
        <button className="primary" onClick={() => reward(agent.id)} disabled={!online}>
          <CoinIcon /> Reward +100
        </button>
        <button disabled={!current} onClick={() => current && viewTask(current.id)} title={current ? undefined : 'No active task'}>
          View Task
        </button>
      </div>
      {assigning && <AssignForm agentId={agent.id} onDone={() => setAssigning(false)} />}
      {agent.id === DIRECTOR && !assigning && (
        <p className="sp-note">Talk to Aria in the chat to start a project. Assign Task does the same.</p>
      )}

      {recent.length > 0 && (
        <section className="sp-section">
          <h4>Recent tasks</h4>
          <ul className="task-list">
            {recent.map((t) => (
              <li key={t.id}>
                <button onClick={() => viewTask(t.id)}>
                  <span>{t.title}</span>
                  <Badge label={TASK_STATUS_META[t.status].label} color={TASK_STATUS_META[t.status].color} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="sp-preview">
        <summary>Status preview (dev)</summary>
        <p>Forces a status so you can check how it looks. The agent returns to real work on its next step.</p>
        <div className="chips">
          {STATUSES.map((st) => (
            <button
              key={st}
              className={`chip-btn ${agent.status === st ? 'is-active' : ''}`}
              onClick={() => previewStatus(agent.id, st)}
              disabled={!online}
            >
              <StatusBadge status={st} />
            </button>
          ))}
        </div>
      </details>
    </aside>
  )
}

function AssignForm({ agentId, onDone }: { agentId: string; onDone: () => void }) {
  const assignTask = useOfficeStore((s) => s.assignTask)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="assign-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        setBusy(true)
        const ok = await assignTask(agentId, { title: title.trim(), description: description.trim() || undefined, priority })
        setBusy(false)
        if (ok) onDone()
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" maxLength={200} autoFocus />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (optional)"
        rows={2}
        maxLength={2000}
      />
      <div className="assign-form__row">
        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Priority">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]} · {REWARD_BY_PRIORITY[p]} coins
            </option>
          ))}
        </select>
        <button type="submit" className="primary" disabled={busy || !title.trim()}>
          Assign
        </button>
      </div>
    </form>
  )
}

function TaskView({ id }: { id: string }) {
  const tasks = useOfficeStore((s) => s.tasks)
  const agents = useOfficeStore((s) => s.agents)
  const projects = useOfficeStore((s) => s.projects)
  const selectedId = useOfficeStore((s) => s.selectedId)
  const viewTask = useOfficeStore((s) => s.viewTask)
  const select = useOfficeStore((s) => s.select)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  const task = tasks[id]
  if (!task) return null

  const name = (agentId: string) => (agentId === OWNER_ID ? 'You (Owner)' : (agents.find((a) => a.id === agentId)?.name ?? agentId))
  const assignee = agents.find((a) => a.id === task.assignedTo)
  const parent = task.parentTaskId ? tasks[task.parentTaskId] : undefined
  const project = task.projectId ? projects[task.projectId] : undefined
  const children = childrenOf({ agents, tasks, projects, messages: [] }, task.id)
  const status = TASK_STATUS_META[task.status]

  return (
    <aside
      className="panel side-panel"
      style={{ '--dept': assignee ? DEPT_COLOR[assignee.department] : '#9aa3ad' } as React.CSSProperties}
      aria-label="Task details"
    >
      <header className="sp-head">
        <button className="sp-back" onClick={() => viewTask(parent && !selectedId ? parent.id : null)}>
          ← {selectedId ? 'Back' : parent ? 'Parent' : 'Close'}
        </button>
        <div className="sp-title" />
        <button className="sp-close" onClick={() => select(null)} aria-label="Close panel">
          ×
        </button>
      </header>
      <div className="task-title">{task.title}</div>
      <div className="chips task-chips">
        <Badge label={status.label} color={status.color} pulse={task.status === 'working'} />
        <span className="chip-tag">{PRIORITY_LABEL[task.priority]}</span>
        <span className="chip-tag">
          <CoinIcon size={12} /> {task.reward}
        </span>
      </div>

      <dl className="sp-grid">
        <dt>Assignee</dt>
        <dd>
          <button className="link" onClick={() => focusAgent(task.assignedTo)}>
            {name(task.assignedTo)}
          </button>
        </dd>
        <dt>Created by</dt>
        <dd>{name(task.createdBy)}</dd>
        {project && (
          <>
            <dt>Project</dt>
            <dd>
              <button className="link" onClick={() => viewTask(project.rootTaskId)}>
                {project.title}
              </button>
            </dd>
          </>
        )}
        {parent && (
          <>
            <dt>Parent</dt>
            <dd>
              <button className="link" onClick={() => viewTask(parent.id)}>
                {parent.title}
              </button>
            </dd>
          </>
        )}
        <dt>Created</dt>
        <dd>{timeOf(task.createdAt)}</dd>
        <dt>Completed</dt>
        <dd>{timeOf(task.completedAt)}</dd>
      </dl>

      {task.description && task.description !== task.title && <p className="task-desc">{task.description}</p>}
      {task.status === 'blocked' && task.blockedReason && <div className="task-blocked">Blocked: {task.blockedReason}</div>}

      {children.length > 0 && (
        <section className="sp-section">
          <h4>Subtasks</h4>
          <ul className="task-list">
            {children.map((c) => (
              <li key={c.id}>
                <button onClick={() => viewTask(c.id)}>
                  <span>
                    {c.title}
                    <small>{name(c.assignedTo)}</small>
                  </span>
                  <Badge label={TASK_STATUS_META[c.status].label} color={TASK_STATUS_META[c.status].color} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sp-section">
        <h4>Result</h4>
        {task.result ? (
          <div className="task-result">
            <RichText text={task.result} />
          </div>
        ) : (
          <p className="muted task-pending">Not finished yet.</p>
        )}
      </section>
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
