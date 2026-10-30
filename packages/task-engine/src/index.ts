import {
  childrenOf,
  OWNER_ID,
  REWARD_BY_PRIORITY,
  type CompanyState,
  type OfficeEvent,
  type Project,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@office/shared'

export { REWARD_BY_PRIORITY }

/** Allowed task transitions. Anything else is a bug in the caller. */
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['assigned'],
  assigned: ['working', 'blocked'],
  working: ['blocked', 'review', 'completed'],
  blocked: ['working'],
  review: ['working', 'completed'],
  completed: [],
}

export const canTransition = (from: TaskStatus, to: TaskStatus) => TRANSITIONS[from].includes(to)

export type EngineDeps = {
  getState: () => CompanyState
  emit: (event: OfficeEvent) => void
  now?: () => string
  newId?: (prefix: string) => string
}

export type NewTask = {
  title: string
  description?: string
  createdBy: string
  assignedTo: string
  priority?: TaskPriority
  parentTaskId?: string
  projectId?: string
}

const defaultId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/**
 * Owns the task lifecycle. Every method validates the transition and emits events;
 * it never mutates state directly (the shared reducer does that).
 */
export class TaskEngine {
  private getState: () => CompanyState
  private emit: (event: OfficeEvent) => void
  private now: () => string
  private newId: (prefix: string) => string

  constructor({ getState, emit, now = () => new Date().toISOString(), newId = defaultId }: EngineDeps) {
    this.getState = getState
    this.emit = emit
    this.now = now
    this.newId = newId
  }

  task(id: string): Task {
    const t = this.getState().tasks[id]
    if (!t) throw new Error(`Unknown task ${id}`)
    return t
  }

  /** A project is the Director's root task plus its metadata. */
  createProject({ prompt, title, directorId }: { prompt: string; title: string; directorId: string }) {
    const projectId = this.newId('p')
    const rootTaskId = this.newId('t')
    const project: Project = {
      id: projectId,
      title,
      prompt,
      status: 'in_progress',
      rootTaskId,
      createdAt: this.now(),
    }
    this.emit({ type: 'PROJECT_CREATED', project })
    const root = this.createTask({
      id: rootTaskId,
      title,
      description: prompt,
      createdBy: OWNER_ID,
      assignedTo: directorId,
      priority: 'critical',
      projectId,
    })
    return { project, root }
  }

  createTask(input: NewTask & { id?: string }): Task {
    const priority = input.priority ?? 'medium'
    const task: Task = {
      id: input.id ?? this.newId('t'),
      title: input.title,
      description: input.description ?? '',
      createdBy: input.createdBy,
      assignedTo: input.assignedTo,
      parentTaskId: input.parentTaskId,
      projectId: input.projectId,
      status: 'backlog',
      priority,
      reward: REWARD_BY_PRIORITY[priority],
      createdAt: this.now(),
    }
    this.emit({ type: 'TASK_CREATED', task })
    this.emit({ type: 'TASK_ASSIGNED', taskId: task.id, agentId: task.assignedTo })
    return this.task(task.id)
  }

  /** Begin (or resume) work. Idempotent while already working. */
  start(taskId: string) {
    const t = this.task(taskId)
    if (t.status === 'working') return
    this.assertCan(t, 'working')
    if (t.status === 'assigned') this.emit({ type: 'TASK_STARTED', taskId, agentId: t.assignedTo })
    else this.emit({ type: 'TASK_STATUS_CHANGED', taskId, status: 'working' })
  }

  block(taskId: string, reason: string) {
    this.assertCan(this.task(taskId), 'blocked')
    this.emit({ type: 'TASK_STATUS_CHANGED', taskId, status: 'blocked', reason })
  }

  /** Idempotent while already in review. */
  submitForReview(taskId: string) {
    const t = this.task(taskId)
    if (t.status === 'review') return
    this.assertCan(t, 'review')
    this.emit({ type: 'TASK_STATUS_CHANGED', taskId, status: 'review' })
  }

  complete(taskId: string, result: string) {
    const t = this.task(taskId)
    this.assertCan(t, 'completed')
    this.emit({ type: 'TASK_COMPLETED', taskId, agentId: t.assignedTo, result, completedAt: this.now() })
  }

  completeProject(projectId: string, summary: string) {
    this.emit({ type: 'PROJECT_COMPLETED', projectId, summary, completedAt: this.now() })
  }

  /** True when a parent has children and all of them are done. */
  isRollupReady(parentId: string) {
    const kids = childrenOf(this.getState(), parentId)
    return kids.length > 0 && kids.every((k) => k.status === 'completed')
  }

  /** Unfinished tasks assigned to an agent, oldest first. */
  openTasksOf(agentId: string) {
    return Object.values(this.getState().tasks).filter((t) => t.assignedTo === agentId && t.status !== 'completed')
  }

  private assertCan(t: Task, to: TaskStatus) {
    if (!canTransition(t.status, to)) throw new Error(`Task ${t.id}: cannot go from ${t.status} to ${to}`)
  }
}
