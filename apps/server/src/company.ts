import { reduceEvent, type CompanyState, type OfficeEvent, type StampedEvent } from '@office/shared'

const HISTORY = 5000

/**
 * The live company: current state plus the event pipeline. Emitting is re-entrancy
 * safe: events raised while handling another event are queued, so every listener
 * (SSE clients, runtime, persistence) sees the same strict order.
 */
export class Company {
  state: CompanyState
  seq: number
  private history: StampedEvent[] = []
  private listeners = new Set<(e: StampedEvent) => void>()
  private queue: OfficeEvent[] = []
  private draining = false

  constructor(state: CompanyState, seq: number) {
    this.state = state
    this.seq = seq
  }

  emit = (event: OfficeEvent) => {
    this.queue.push(event)
    if (this.draining) return
    this.draining = true
    try {
      while (this.queue.length) {
        const next = this.queue.shift()!
        const stamped: StampedEvent = { seq: ++this.seq, at: new Date().toISOString(), event: next }
        this.state = reduceEvent(this.state, next)
        this.history.push(stamped)
        if (this.history.length > HISTORY) this.history.splice(0, this.history.length - HISTORY)
        for (const l of this.listeners) l(stamped)
      }
    } finally {
      this.draining = false
    }
  }

  getState = () => this.state

  subscribe(listener: (e: StampedEvent) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Events after `seq`, or null if they are no longer in memory (client must resync). */
  since(seq: number): StampedEvent[] | null {
    if (seq >= this.seq) return []
    const first = this.history[0]
    if (!first || first.seq > seq + 1) return null
    return this.history.filter((e) => e.seq > seq)
  }
}
