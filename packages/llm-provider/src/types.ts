import type { Agent, Task, TaskPriority } from '@office/shared'

/**
 * What the runtime asks an agent to do. One call = one "thought"; behaviours are
 * small state machines around these calls, not autonomous loops.
 */
export type AgentRunMode =
  /** Director: read the Owner's request, name the project, propose workstreams for managers. */
  | 'plan'
  /** Manager: split an assigned task into subtasks for the team. */
  | 'split'
  /** Employee: produce a short plan before starting. */
  | 'prepare'
  /** Employee: do the work and return a result (or report being blocked). */
  | 'execute'
  /** Manager: review the team's results and write a report for the Director. */
  | 'review'
  /** Director: integrate the managers' reports into the final answer for the Owner. */
  | 'summarize'
  /** Any agent: free-form reply to the Owner. */
  | 'chat'

export type AgentRunInput = {
  agent: Agent
  mode: AgentRunMode
  /** The Owner's words (plan / chat). */
  prompt?: string
  task?: Task
  /** Who the agent can delegate to (plan / split). */
  team?: Agent[]
  /** Finished child tasks with their assignees (review / summarize). */
  childResults?: { agent: Agent; task: Task }[]
  /** 0 on the first attempt; increases after each block (execute). */
  attempt?: number
  /** The Owner's original request for the project this work belongs to. */
  projectPrompt?: string
  /** The project title (summarize). */
  projectTitle?: string
}

export type WorkPlan = {
  title: string
  description: string
  assignee: string
  priority: TaskPriority
}

export type AgentRunResult = {
  text: string
  /** plan: the project title. */
  title?: string
  /** plan / split: work to hand down one level. */
  work?: WorkPlan[]
  /** execute: set when the agent cannot continue yet. */
  blocked?: string
  /** execute / review / summarize: how good the result is, 0–1 (feeds the task score). */
  quality?: number
}

export interface LLMProvider {
  readonly name: string
  runAgent(input: AgentRunInput): Promise<AgentRunResult>
}
