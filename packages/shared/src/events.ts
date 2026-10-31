import type { AgentStatus, ChatMessage, Project, Task, TaskStatus } from './types'
import type { TaskScore } from './scoring'
import type { CompanyState } from './state'

/**
 * Everything that changes the company is an event. The server emits them, persists
 * them and streams them; the web client applies them with the same reducer
 * (`reduceEvent`), so the 3D world, HUD and server can never disagree.
 */
export type OfficeEvent =
  | { type: 'PROJECT_CREATED'; project: Project }
  | { type: 'TASK_CREATED'; task: Task }
  | { type: 'TASK_ASSIGNED'; taskId: string; agentId: string }
  | { type: 'TASK_STARTED'; taskId: string; agentId: string; startedAt?: string }
  | { type: 'TASK_STATUS_CHANGED'; taskId: string; status: TaskStatus; reason?: string }
  /** Carries the score; the reducer folds it into the assignee's performance. */
  | { type: 'TASK_COMPLETED'; taskId: string; agentId: string; result: string; completedAt: string; score?: TaskScore }
  | { type: 'AGENT_STATUS_CHANGED'; agentId: string; status: AgentStatus; taskId?: string | null }
  /** `taskId` when it is a task's payout; manual rewards from the Owner have none. */
  | { type: 'AGENT_REWARDED'; agentId: string; coins: number; reason: string; taskId?: string }
  | { type: 'CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'PROJECT_COMPLETED'; projectId: string; summary: string; completedAt: string }
  /** Whole-company replacement (reset / resync). */
  | { type: 'COMPANY_RESET'; state: CompanyState }

export type OfficeEventType = OfficeEvent['type']

/** An event as stored and streamed by the server. `seq` is strictly increasing. */
export type StampedEvent = { seq: number; at: string; event: OfficeEvent }
