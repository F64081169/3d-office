import { HOME_SEATS, type CompanyState, type OfficeEvent } from '@office/shared'

type Tuple3 = [number, number, number]

export type Cut =
  | { kind: 'preset'; id: string }
  | { kind: 'agent'; id: string }
  | { kind: 'shot'; view: string; position: Tuple3; target: Tuple3 }

/** A cut with how much it matters and how long it should stay on screen (ms). */
export type Pick = { cut: Cut; priority: number; hold: number }

/** Idle tour when nothing has happened for a while. */
const TOUR = ['overview', 'workspace', 'lounge', 'meeting', 'coffee', 'director']
const IDLE_MS = 20000

/** Side view of a manager's desk, where their team lines up to report. */
const deskShot = (managerId: string): Cut => {
  const { x, z } = HOME_SEATS[managerId].position
  return { kind: 'shot', view: `desk:${managerId}`, position: [x + 3.4, 2.5, z + 2.9], target: [x - 0.2, 1.0, z + 0.9] }
}

/** What is worth looking at when this event happens; null when nothing new. */
export function pickCut(e: OfficeEvent, s: CompanyState): Pick | null {
  // The meeting room's wall board shows the payout as the project wraps up.
  if (e.type === 'PROJECT_COMPLETED') return { cut: { kind: 'preset', id: 'meeting' }, priority: 3, hold: 10000 }
  if (e.type !== 'AGENT_STATUS_CHANGED') return null
  const agent = s.agents.find((a) => a.id === e.agentId)
  if (!agent) return null
  switch (e.status) {
    case 'meeting':
      return agent.level === 3 ? { cut: { kind: 'preset', id: 'meeting' }, priority: 2, hold: 9000 } : null
    case 'blocked':
      return { cut: { kind: 'agent', id: agent.id }, priority: 2, hold: 7000 }
    case 'reporting':
      // Employees report at their manager's desk; managers (and Aria, to the Owner) in the Director's office.
      return agent.level === 1 && agent.managerId
        ? { cut: deskShot(agent.managerId), priority: 1, hold: 6000 }
        : { cut: { kind: 'preset', id: 'director' }, priority: 1, hold: 7000 }
    default:
      return null
  }
}

/**
 * The auto camera: takes the most important cut, holds it long enough to read, keeps
 * the latest lower-priority cut for when the hold ends, and tours the office when idle.
 */
export class AutoDirector {
  private holdUntil = 0
  private holdPriority = 0
  private pending: Pick | null = null
  private pendingTimer: ReturnType<typeof setTimeout> | undefined
  private idleTimer: ReturnType<typeof setTimeout> | undefined
  private tour = 0
  private running = false

  constructor(private apply: (cut: Cut) => void) {}

  start() {
    this.running = true
    this.scheduleIdle()
  }

  stop() {
    this.running = false
    this.pending = null
    this.holdUntil = 0
    clearTimeout(this.pendingTimer)
    clearTimeout(this.idleTimer)
  }

  consider(pick: Pick | null) {
    if (!pick || !this.running) return
    if (Date.now() >= this.holdUntil || pick.priority > this.holdPriority) return this.cut(pick)
    if (!this.pending || pick.priority >= this.pending.priority) this.pending = pick
    clearTimeout(this.pendingTimer)
    this.pendingTimer = setTimeout(() => this.pending && this.cut(this.pending), this.holdUntil - Date.now())
  }

  private cut(pick: Pick) {
    this.pending = null
    this.holdUntil = Date.now() + pick.hold
    this.holdPriority = pick.priority
    this.apply(pick.cut)
    this.scheduleIdle()
  }

  private scheduleIdle() {
    clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      const id = TOUR[this.tour++ % TOUR.length]
      this.cut({ cut: { kind: 'preset', id }, priority: 0, hold: 4000 })
    }, IDLE_MS)
  }
}
