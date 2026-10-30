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

export type Task = {
  id: string

  title: string
  description: string

  createdBy: string
  assignedTo: string

  parentTaskId?: string

  status: TaskStatus

  priority: TaskPriority

  reward: number

  result?: string

  createdAt: string
  completedAt?: string
}
