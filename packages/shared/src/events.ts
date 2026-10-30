import type { AgentStatus, Task } from './types'

/**
 * Everything that changes the company is an event. The web client applies them in
 * one place (store.applyEvent), so the 3D world, HUD and panels can never disagree.
 * Phase 2 dispatches some of them locally; from Phase 3 the server is the source.
 */
export type OfficeEvent =
  | { type: 'TASK_CREATED'; task: Task }
  | { type: 'TASK_ASSIGNED'; taskId: string; agentId: string }
  | { type: 'TASK_STARTED'; taskId: string; agentId: string }
  | { type: 'TASK_COMPLETED'; taskId: string; agentId: string; result: string; score: number }
  | { type: 'AGENT_STATUS_CHANGED'; agentId: string; status: AgentStatus; taskId?: string }
  | { type: 'AGENT_REWARDED'; agentId: string; coins: number; reason: string }
  | { type: 'PROJECT_COMPLETED'; projectId: string; summary: string }

export type OfficeEventType = OfficeEvent['type']
