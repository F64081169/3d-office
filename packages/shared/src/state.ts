import type { OfficeEvent } from './events'
import { SEED_AGENTS } from './org'
import type { Agent, ChatMessage, Project, Task } from './types'

export type CompanyState = {
  agents: Agent[]
  tasks: Record<string, Task>
  projects: Record<string, Project>
  messages: ChatMessage[]
}

/** Keep the chat log bounded; older messages stay in the database. */
export const MESSAGE_LIMIT = 400

export const createCompanyState = (): CompanyState => ({
  agents: SEED_AGENTS.map((a) => ({ ...a, skills: [...a.skills], position: { ...a.position } })),
  tasks: {},
  projects: {},
  messages: [],
})

const patchAgent = (s: CompanyState, id: string, patch: (a: Agent) => Partial<Agent>): CompanyState => ({
  ...s,
  agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch(a) } : a)),
})

const patchTask = (s: CompanyState, id: string, patch: (t: Task) => Partial<Task>): CompanyState => {
  const t = s.tasks[id]
  return t ? { ...s, tasks: { ...s.tasks, [id]: { ...t, ...patch(t) } } } : s
}

/** Pure reducer shared by the server (source of truth) and the web client (projection). */
export function reduceEvent(s: CompanyState, e: OfficeEvent): CompanyState {
  switch (e.type) {
    case 'PROJECT_CREATED':
      return { ...s, projects: { ...s.projects, [e.project.id]: e.project } }
    case 'TASK_CREATED':
      return { ...s, tasks: { ...s.tasks, [e.task.id]: e.task } }
    case 'TASK_ASSIGNED':
      return patchTask(s, e.taskId, (t) => ({
        assignedTo: e.agentId,
        status: t.status === 'backlog' ? 'assigned' : t.status,
      }))
    case 'TASK_STARTED':
      return patchTask(s, e.taskId, () => ({ status: 'working', blockedReason: undefined }))
    case 'TASK_STATUS_CHANGED':
      return patchTask(s, e.taskId, () => ({
        status: e.status,
        blockedReason: e.status === 'blocked' ? e.reason : undefined,
      }))
    case 'TASK_COMPLETED':
      return patchTask(s, e.taskId, () => ({
        status: 'completed',
        result: e.result,
        completedAt: e.completedAt,
        blockedReason: undefined,
      }))
    case 'AGENT_STATUS_CHANGED':
      return patchAgent(s, e.agentId, (a) => ({
        status: e.status,
        currentTaskId: e.taskId === undefined ? a.currentTaskId : (e.taskId ?? undefined),
      }))
    case 'AGENT_REWARDED':
      return patchAgent(s, e.agentId, (a) => ({ coins: a.coins + e.coins }))
    case 'CHAT_MESSAGE':
      return { ...s, messages: [...s.messages, e.message].slice(-MESSAGE_LIMIT) }
    case 'PROJECT_COMPLETED': {
      const p = s.projects[e.projectId]
      if (!p) return s
      return {
        ...s,
        projects: { ...s.projects, [p.id]: { ...p, status: 'completed', summary: e.summary, completedAt: e.completedAt } },
      }
    }
    case 'COMPANY_RESET':
      return e.state
  }
}

/** Direct children of a task, oldest first. */
export const childrenOf = (s: CompanyState, taskId: string) =>
  Object.values(s.tasks)
    .filter((t) => t.parentTaskId === taskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

/** Every task below a project's root (workstreams + subtasks). */
export function projectTasks(s: CompanyState, projectId: string) {
  return Object.values(s.tasks).filter((t) => t.projectId === projectId && !!t.parentTaskId)
}
