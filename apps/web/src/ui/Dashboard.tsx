import { agentRecord, companyStats, projectStats, type CompanyState } from '@office/shared'
import { useMemo } from 'react'
import { DEPT_COLOR } from '../agents/status'
import { useOfficeStore } from '../store/officeStore'
import { CountUp } from './CountUp'
import { CoinIcon } from './icons'
import { Badge } from './StatusBadge'
import { scoreColor } from './taskMeta'

/** The company as the shared helpers expect it, memoised on the parts that change. */
function useCompany(): CompanyState {
  const agents = useOfficeStore((s) => s.agents)
  const tasks = useOfficeStore((s) => s.tasks)
  const projects = useOfficeStore((s) => s.projects)
  return useMemo(() => ({ agents, tasks, projects, messages: [] }), [agents, tasks, projects])
}

/** Always-on KPI strip at the top; opens the full dashboard. */
export function Pulse() {
  const company = useCompany()
  const open = useOfficeStore((s) => s.dashboardOpen)
  const setOpen = useOfficeStore((s) => s.setDashboardOpen)
  const st = useMemo(() => companyStats(company), [company])
  return (
    <button className={`panel pulse ${open ? 'is-active' : ''}`} onClick={() => setOpen(!open)} title="Company Dashboard">
      <PulseItem label="Active" value={st.activeTasks} />
      <PulseItem label="Done" value={st.completedTasks} />
      <PulseItem label="Blocked" value={st.blockedTasks} alert={st.blockedTasks > 0} />
      <PulseItem label="Avg perf" value={st.averagePerformance} />
      <PulseItem label="Coins paid" value={st.coinsDistributed} coin />
      <PulseItem label="Busy" value={st.activeAgents} of={st.agents} />
      <span className="pulse__open">Dashboard {open ? '▴' : '▾'}</span>
    </button>
  )
}

function PulseItem({ label, value, of, alert, coin }: { label: string; value: number; of?: number; alert?: boolean; coin?: boolean }) {
  return (
    <span className={`pulse__item ${alert ? 'is-alert' : ''}`}>
      <span className="pulse__value">
        {coin && <CoinIcon size={13} />}
        <CountUp value={value} />
        {of !== undefined && <small>/{of}</small>}
      </span>
      <span className="pulse__label">{label}</span>
    </span>
  )
}

export function Dashboard() {
  const open = useOfficeStore((s) => s.dashboardOpen)
  const setOpen = useOfficeStore((s) => s.setDashboardOpen)
  if (!open) return null
  return (
    <div className="dash-backdrop" onClick={() => setOpen(false)}>
      <section className="panel dash" role="dialog" aria-label="Company Dashboard" onClick={(e) => e.stopPropagation()}>
        <header className="dash__head">
          <div>
            <h2>Company Dashboard</h2>
            <p>Live from the event stream · every task is scored and paid when it is completed</p>
          </div>
          <button className="sp-close" onClick={() => setOpen(false)} aria-label="Close dashboard">
            ×
          </button>
        </header>
        <Kpis />
        <div className="dash__cols">
          <Leaderboard />
          <div className="dash__stack">
            <Projects />
            <RecentCompletions />
          </div>
        </div>
        <footer className="dash__formula">
          Score = <b>50</b> base + <b>Quality</b> 0–20 + <b>Speed</b> 0–10 + <b>Difficulty</b> 0–10 + <b>Review</b> 0–10 ·
          Performance moves 20% toward each new score · Rewards: Normal 100 · Hard 200 · Critical 500
        </footer>
      </section>
    </div>
  )
}

function Kpis() {
  const company = useCompany()
  const st = useMemo(() => companyStats(company), [company])
  const cards: { label: string; value: number; sub: string; color: string; coin?: boolean }[] = [
    { label: 'Active tasks', value: st.activeTasks, sub: `${st.activeProjects} active project${st.activeProjects === 1 ? '' : 's'}`, color: '#3b9fd8' },
    { label: 'Completed tasks', value: st.completedTasks, sub: `${st.completedProjects} project${st.completedProjects === 1 ? '' : 's'} delivered`, color: '#34b27a' },
    { label: 'Blocked tasks', value: st.blockedTasks, sub: st.blockedTasks ? 'needs attention' : 'all clear', color: '#e05a4f' },
    { label: 'Avg performance', value: st.averagePerformance, sub: st.averageScore ? `average task score ${st.averageScore}` : 'no scored tasks yet', color: '#e08a3c' },
    { label: 'Coins distributed', value: st.coinsDistributed, sub: `${st.totalCoins.toLocaleString()} held in total`, color: '#e0b04c', coin: true },
    { label: 'Active agents', value: st.activeAgents, sub: `of ${st.agents} agents busy`, color: '#8a6fd6' },
  ]
  return (
    <div className="dash__kpis">
      {cards.map((c) => (
        <div key={c.label} className="kpi" style={{ '--kpi': c.color } as React.CSSProperties}>
          <span className="kpi__label">{c.label}</span>
          <span className="kpi__value">
            {c.coin && <CoinIcon size={18} />}
            <CountUp value={c.value} />
          </span>
          <span className="kpi__sub">{c.sub}</span>
        </div>
      ))}
    </div>
  )
}

function Leaderboard() {
  const company = useCompany()
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  const setOpen = useOfficeStore((s) => s.setDashboardOpen)
  const rows = useMemo(
    () =>
      company.agents
        .map((a) => ({ agent: a, record: agentRecord(company, a.id) }))
        .sort((x, y) => y.agent.performance - x.agent.performance || y.agent.coins - x.agent.coins),
    [company],
  )
  return (
    <section className="dash__card">
      <h3>Leaderboard</h3>
      <ol className="board">
        {rows.map(({ agent, record }, i) => {
          const delta = agent.performance - (record.startPerformance ?? agent.performance)
          return (
            <li key={agent.id}>
              <button
                onClick={() => {
                  setOpen(false)
                  focusAgent(agent.id)
                }}
              >
                <span className="board__rank">{i + 1}</span>
                <span className="avatar-dot" style={{ background: DEPT_COLOR[agent.department] }} />
                <span className="board__who">
                  <b>{agent.name}</b>
                  <small>
                    {agent.role}
                    {record.completed > 0 && ` · ${record.completed} done`}
                  </small>
                </span>
                <span className="board__perf">
                  <span className="bar">
                    <span style={{ width: `${agent.performance}%` }} />
                  </span>
                  <b>{agent.performance}</b>
                  <small className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>
                    {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : ''}
                  </small>
                </span>
                <span className="board__coins">
                  <CoinIcon size={12} /> {agent.coins.toLocaleString()}
                  {record.earned > 0 && <small>+{record.earned}</small>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Projects() {
  const company = useCompany()
  const viewTask = useOfficeStore((s) => s.viewTask)
  const setOpen = useOfficeStore((s) => s.setDashboardOpen)
  const projects = Object.values(company.projects).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  return (
    <section className="dash__card">
      <h3>Projects</h3>
      {projects.length === 0 && <p className="muted dash__empty">No projects yet. Ask Aria in the chat to start one.</p>}
      <ul className="dash-projects">
        {projects.map((p) => {
          const st = projectStats(company, p.id)
          const done = p.status === 'completed'
          return (
            <li key={p.id}>
              <button
                onClick={() => {
                  setOpen(false)
                  viewTask(p.rootTaskId)
                }}
              >
                <span className="dash-projects__title">
                  <b>{p.title}</b>
                  <Badge label={done ? 'Completed' : 'In progress'} color={done ? '#3b9fd8' : '#34b27a'} pulse={!done} />
                </span>
                <span className="bar">
                  <span style={{ width: `${st.tasks ? (st.done / st.tasks) * 100 : 0}%`, background: done ? '#3b9fd8' : '#34b27a' }} />
                </span>
                <small>
                  {st.done}/{st.tasks} tasks · <CoinIcon size={11} /> {st.coinsPaid.toLocaleString()} paid
                  {st.averageScore && ` · average score ${st.averageScore}`}
                </small>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RecentCompletions() {
  const company = useCompany()
  const viewTask = useOfficeStore((s) => s.viewTask)
  const setOpen = useOfficeStore((s) => s.setDashboardOpen)
  const recent = Object.values(company.tasks)
    .filter((t) => t.score)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 6)
  const name = (id: string) => company.agents.find((a) => a.id === id)?.name ?? id
  return (
    <section className="dash__card">
      <h3>Recent completions</h3>
      {recent.length === 0 && <p className="muted dash__empty">Scores and payouts appear here as tasks finish.</p>}
      <ul className="feed">
        {recent.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => {
                setOpen(false)
                viewTask(t.id)
              }}
            >
              <span className="score-pill" style={{ '--score': scoreColor(t.score!.total) } as React.CSSProperties}>
                {t.score!.total}
              </span>
              <span className="feed__what">
                <b>{name(t.assignedTo)}</b>
                <small>{t.title}</small>
              </span>
              {!!t.paid && (
                <span className="feed__coins">
                  +{t.paid} <CoinIcon size={11} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
