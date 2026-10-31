import { childrenOf, projectStats } from '@office/shared'
import { useOfficeStore } from '../store/officeStore'
import { CoinIcon } from './icons'
import { Badge } from './StatusBadge'
import { TASK_STATUS_META } from './taskMeta'

/** Live progress of one project: overall bar plus each workstream and its subtasks. */
export function ProjectCard({ projectId }: { projectId: string }) {
  const project = useOfficeStore((s) => s.projects[projectId])
  const tasks = useOfficeStore((s) => s.tasks)
  const agents = useOfficeStore((s) => s.agents)
  const viewTask = useOfficeStore((s) => s.viewTask)
  if (!project) return null

  const state = { agents, tasks, projects: {}, messages: [] }
  const all = Object.values(tasks).filter((t) => t.projectId === projectId && t.parentTaskId)
  const done = all.filter((t) => t.status === 'completed').length
  const pct = all.length ? Math.round((done / all.length) * 100) : 0
  const completed = project.status === 'completed'
  const name = (id: string) => agents.find((a) => a.id === id)?.name ?? id

  return (
    <div className="project-card">
      <div className="pc-head">
        <button className="pc-title" onClick={() => viewTask(project.rootTaskId)}>
          {project.title}
        </button>
        <Badge label={completed ? 'Completed' : 'In progress'} color={completed ? '#3b9fd8' : '#34b27a'} pulse={!completed} />
      </div>
      <div className="bar">
        <div style={{ width: `${pct}%`, background: completed ? '#3b9fd8' : '#34b27a' }} />
      </div>
      <div className="pc-meta">
        {done}/{all.length} tasks done
        {completed && <Payout projectId={projectId} />}
      </div>
      <ul className="pc-list">
        {childrenOf(state, project.rootTaskId).map((w) => {
          const subs = childrenOf(state, w.id)
          const subsDone = subs.filter((t) => t.status === 'completed').length
          return (
            <li key={w.id}>
              <button onClick={() => viewTask(w.id)}>
                <i style={{ background: TASK_STATUS_META[w.status].color }} />
                <span className="pc-ws">{w.title}</span>
                <span className="pc-who">
                  {name(w.assignedTo)}
                  {subs.length > 0 && ` · ${subsDone}/${subs.length}`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Coins paid out and the average score, once a project is delivered. */
function Payout({ projectId }: { projectId: string }) {
  const tasks = useOfficeStore((s) => s.tasks)
  const { coinsPaid, averageScore } = projectStats({ agents: [], tasks, projects: {}, messages: [] }, projectId)
  return (
    <>
      {' · '}
      <CoinIcon size={11} /> {coinsPaid.toLocaleString()} paid{averageScore && ` · average score ${averageScore}`}
    </>
  )
}
