import type { CompanyState } from './state'
import { SEED_AGENTS } from './org'
import type { TaskPriority } from './types'

/**
 * How a finished task scored, 0–100:
 *
 *   50 base + quality 0–20 + speed 0–10 + difficulty 0–10 + review 0–10
 */
export type TaskScore = {
  total: number
  /** 0–20: how good the result is (the provider's judgement). */
  quality: number
  /** 0–10: actual time against the estimate. */
  speed: number
  /** 0–10: from the priority. */
  difficulty: number
  /** 0–10: accepted first time (for managers and the Director: their team's first-pass rate). */
  review: number
}

export const SCORE_BASE = 50

export const DIFFICULTY_BY_PRIORITY: Record<TaskPriority, number> = { low: 2, medium: 5, high: 8, critical: 10 }

export type ScoreInput = {
  priority: TaskPriority
  /** 0–1 */
  quality: number
  /** Simulated seconds from start to completion, and what it should have taken. */
  seconds: number
  expectedSeconds: number
  /** 0–1: share of the work accepted on the first attempt. */
  firstPass: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function scoreTask(input: ScoreInput): TaskScore {
  const quality = Math.round(20 * clamp(input.quality, 0, 1))
  // On time (or early) is full marks; twice the estimate is zero.
  const speed = Math.round(10 * clamp(2 - input.seconds / Math.max(1, input.expectedSeconds), 0, 1))
  const difficulty = DIFFICULTY_BY_PRIORITY[input.priority]
  const review = Math.round(10 * clamp(input.firstPass, 0, 1))
  return { total: SCORE_BASE + quality + speed + difficulty + review, quality, speed, difficulty, review }
}

/** Performance is a moving average of task scores. */
export const nextPerformance = (performance: number, score: number) =>
  clamp(Math.round(performance * 0.8 + score * 0.2), 0, 100)

/** Coins everyone starts with; anything above this was earned. */
export const SEED_COINS = SEED_AGENTS.reduce((sum, a) => sum + a.coins, 0)

const BUSY = new Set(['thinking', 'working', 'meeting', 'reporting', 'blocked'])

/** Headline numbers for the Company Dashboard and the meeting room screen. */
export function companyStats(s: CompanyState) {
  const tasks = Object.values(s.tasks)
  const scored = tasks.filter((t) => t.score)
  const totalCoins = s.agents.reduce((sum, a) => sum + a.coins, 0)
  return {
    activeTasks: tasks.filter((t) => t.status !== 'completed').length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    blockedTasks: tasks.filter((t) => t.status === 'blocked').length,
    activeProjects: Object.values(s.projects).filter((p) => p.status === 'in_progress').length,
    completedProjects: Object.values(s.projects).filter((p) => p.status === 'completed').length,
    averagePerformance: s.agents.length ? Math.round(s.agents.reduce((sum, a) => sum + a.performance, 0) / s.agents.length) : 0,
    averageScore: scored.length ? Math.round(scored.reduce((sum, t) => sum + t.score!.total, 0) / scored.length) : null,
    coinsDistributed: Math.max(0, totalCoins - SEED_COINS),
    totalCoins,
    activeAgents: s.agents.filter((a) => BUSY.has(a.status)).length,
    agents: s.agents.length,
  }
}

export type CompanyStats = ReturnType<typeof companyStats>

const average = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

/** Totals for one project (root task included). */
export function projectStats(s: CompanyState, projectId: string) {
  const tasks = Object.values(s.tasks).filter((t) => t.projectId === projectId)
  const work = tasks.filter((t) => t.parentTaskId)
  return {
    tasks: work.length,
    done: work.filter((t) => t.status === 'completed').length,
    coinsPaid: tasks.reduce((sum, t) => sum + (t.paid ?? 0), 0),
    averageScore: average(tasks.flatMap((t) => (t.score ? [t.score.total] : []))),
  }
}

/** One agent's track record: finished tasks in completion order, average score, coins earned from tasks. */
export function agentRecord(s: CompanyState, agentId: string) {
  const done = Object.values(s.tasks)
    .filter((t) => t.assignedTo === agentId && t.score)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
  const seed = SEED_AGENTS.find((a) => a.id === agentId)
  return {
    completed: done.length,
    averageScore: average(done.map((t) => t.score!.total)),
    lastScore: done.at(-1)?.score,
    earned: done.reduce((sum, t) => sum + (t.paid ?? 0), 0),
    /** Performance at company start, for "▲3 since start". */
    startPerformance: seed?.performance,
  }
}
