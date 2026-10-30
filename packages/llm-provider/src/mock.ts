import type { AgentRunInput, AgentRunMode, AgentRunResult, LLMProvider } from './types'
import {
  blockReason,
  chatReply,
  DIRECTOR_ACK,
  executeResult,
  hash,
  isDemoPrompt,
  planProject,
  reviewText,
  splitTask,
  summaryText,
} from './mockContent'

export type MockOptions = {
  /** Multiplies simulated latency: 2 = twice as fast. */
  speed?: number
  /** Chance (0–1) that a non-demo task hits a block on its first attempt. */
  blockRate?: number
}

/** Simulated "thinking time" per mode, in ms at speed 1 ([min, max]). */
const LATENCY: Record<AgentRunMode, [number, number]> = {
  plan: [1600, 2200],
  split: [1800, 2600],
  prepare: [2000, 3000],
  execute: [6000, 10000],
  review: [2400, 3200],
  summarize: [3000, 3800],
  chat: [900, 1500],
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Deterministic, offline provider: role- and mode-specific templates with realistic
 * delays. The full Director → Manager → Employee flow runs without any API key.
 */
export class MockProvider implements LLMProvider {
  readonly name = 'mock'
  private speed: number
  private blockRate: number

  constructor({ speed = 1, blockRate = 0.1 }: MockOptions = {}) {
    this.speed = Math.max(0.1, speed)
    this.blockRate = blockRate
  }

  async runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    const [lo, hi] = LATENCY[input.mode]
    const seed = `${input.agent.id}:${input.task?.id ?? input.prompt ?? ''}:${input.attempt ?? 0}`
    await sleep((lo + (hash(seed) % 1000) * ((hi - lo) / 1000)) / this.speed)
    return this.respond(input)
  }

  private respond({ agent, mode, prompt = '', task, team = [], childResults = [], attempt = 0, projectPrompt, projectTitle }: AgentRunInput): AgentRunResult {
    const demo = isDemoPrompt(projectPrompt ?? prompt)
    switch (mode) {
      case 'plan': {
        const { title, work } = planProject(prompt, team)
        return { text: DIRECTOR_ACK, title, work }
      }
      case 'split': {
        const work = splitTask(task!, team, demo)
        return { text: `Splitting "${task!.title}" into ${work.length} subtask${work.length === 1 ? '' : 's'}.`, work }
      }
      case 'prepare':
        return { text: `Plan for "${task!.title}": gather data, analyse, write up findings.` }
      case 'execute': {
        const reason = attempt === 0 ? blockReason(agent, task!, demo, this.blockRate) : undefined
        if (reason) return { text: reason, blocked: reason }
        return { text: executeResult(agent, task!, demo) }
      }
      case 'review':
        return { text: reviewText(agent, task!, childResults, demo) }
      case 'summarize':
        return { text: summaryText(projectTitle ?? task!.title, childResults, demo) }
      case 'chat':
        return { text: chatReply(agent, prompt, task) }
    }
  }
}
