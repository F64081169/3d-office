/** Shared domain model. The server (Phase 3) and the web client both import these. */

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'meeting'
  | 'reporting'
  | 'blocked'
  | 'break'

export type Department = 'Executive' | 'Engineering' | 'Research'

export type Agent = {
  id: string
  name: string
  role: string
  department: Department
  level: number

  managerId?: string

  skills: string[]

  status: AgentStatus

  currentTaskId?: string

  /** 0–100 */
  performance: number
  coins: number

  /** Home seat (world space, metres). Movement in Phase 4 starts and ends here. */
  position: Vec3
}

export type TaskStatus = 'backlog' | 'assigned' | 'working' | 'blocked' | 'review' | 'completed'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

/** Coins a task is worth: Normal 100 · Hard 200 · Critical 500 (paid out in Phase 5). */
export const REWARD_BY_PRIORITY: Record<TaskPriority, number> = { low: 100, medium: 100, high: 200, critical: 500 }

export type Task = {
  id: string

  title: string
  description: string

  /** 'owner' or an agent id. */
  createdBy: string
  assignedTo: string

  parentTaskId?: string
  projectId?: string

  status: TaskStatus
  /** Why the task is blocked (only while status === 'blocked'). */
  blockedReason?: string

  priority: TaskPriority

  reward: number

  result?: string

  createdAt: string
  completedAt?: string
}

export type ProjectStatus = 'in_progress' | 'completed'

/** A high-level request from the Owner, owned by the Director. */
export type Project = {
  id: string
  title: string
  /** The Owner's original words. */
  prompt: string
  status: ProjectStatus
  /** The Director's root task; workstreams are its children. */
  rootTaskId: string
  summary?: string
  createdAt: string
  completedAt?: string
}

/** One message in a conversation between the Owner and an agent. */
export type ChatMessage = {
  id: string
  /** The agent the Owner is talking to (one thread per agent). */
  thread: string
  /** 'owner' or the agent id. */
  from: string
  text: string
  projectId?: string
  createdAt: string
}
