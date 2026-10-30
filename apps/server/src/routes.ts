import type { AgentRuntime } from '@office/agent-runtime'
import { createCompanyState, type AgentStatus, type StampedEvent, type TaskPriority } from '@office/shared'
import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Company } from './company'

const STATUSES: AgentStatus[] = ['idle', 'thinking', 'working', 'meeting', 'reporting', 'blocked', 'break']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical']
const MAX_TEXT = 2000

type Ctx = { company: Company; runtime: AgentRuntime; provider: string }

const bad = (reply: FastifyReply, message: string, code = 400) => reply.code(code).send({ error: message })
const text = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null)

export function registerRoutes(app: FastifyInstance, { company, runtime, provider }: Ctx) {
  const agentExists = (id: string) => company.state.agents.some((a) => a.id === id)

  app.get('/api/health', async () => ({ ok: true, provider, seq: company.seq }))

  /** Snapshot: the client loads this, then streams events after `seq`. */
  app.get('/api/state', async () => ({ seq: company.seq, provider, state: company.state }))

  /** Server-sent events. Reconnects resume from Last-Event-ID; gaps trigger a resync. */
  app.get('/api/events', (req, reply) => {
    const q = req.query as { after?: string }
    const after = Number(req.headers['last-event-id'] ?? q.after ?? company.seq)
    reply.hijack()
    const res = reply.raw
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write('retry: 2000\n\n')
    const send = (e: StampedEvent) => res.write(`id: ${e.seq}\ndata: ${JSON.stringify(e)}\n\n`)
    const missed = Number.isFinite(after) ? company.since(after) : null
    if (missed === null) res.write('event: resync\ndata: {}\n\n')
    else missed.forEach(send)
    const unsubscribe = company.subscribe(send)
    const ping = setInterval(() => res.write(': ping\n\n'), 15000)
    req.raw.on('close', () => {
      clearInterval(ping)
      unsubscribe()
    })
  })

  /** The Owner talks to an agent. Talking to the Director is how work starts. */
  app.post<{ Params: { id: string }; Body: { text?: string } }>('/api/agents/:id/messages', async (req, reply) => {
    if (!agentExists(req.params.id)) return bad(reply, 'Unknown agent', 404)
    const t = text(req.body?.text)
    if (!t) return bad(reply, 'Message text is required (max 2000 characters)')
    runtime.ownerMessage(req.params.id, t)
    return reply.code(202).send({ ok: true })
  })

  /** Assign Task from an agent's panel. */
  app.post<{ Params: { id: string }; Body: { title?: string; description?: string; priority?: TaskPriority } }>(
    '/api/agents/:id/tasks',
    async (req, reply) => {
      if (!agentExists(req.params.id)) return bad(reply, 'Unknown agent', 404)
      const title = text(req.body?.title, 200)
      if (!title) return bad(reply, 'Task title is required (max 200 characters)')
      const priority = req.body?.priority ?? 'medium'
      if (!PRIORITIES.includes(priority)) return bad(reply, 'Invalid priority')
      const description = typeof req.body?.description === 'string' ? req.body.description.slice(0, MAX_TEXT) : undefined
      runtime.assignFromOwner(req.params.id, { title, description, priority })
      return reply.code(202).send({ ok: true })
    },
  )

  /** Reward +N from the Owner. */
  app.post<{ Params: { id: string }; Body: { coins?: number } }>('/api/agents/:id/reward', async (req, reply) => {
    if (!agentExists(req.params.id)) return bad(reply, 'Unknown agent', 404)
    const coins = Math.round(Number(req.body?.coins ?? 100))
    if (!(coins > 0 && coins <= 1000)) return bad(reply, 'Coins must be between 1 and 1000')
    company.emit({ type: 'AGENT_REWARDED', agentId: req.params.id, coins, reason: 'Owner reward' })
    return { ok: true }
  })

  /** Dev tool behind the panel's "Status preview": force a status to check its visuals. */
  app.post<{ Params: { id: string }; Body: { status?: AgentStatus } }>('/api/dev/agents/:id/status', async (req, reply) => {
    if (!agentExists(req.params.id)) return bad(reply, 'Unknown agent', 404)
    const status = req.body?.status
    if (!status || !STATUSES.includes(status)) return bad(reply, 'Invalid status')
    company.emit({ type: 'AGENT_STATUS_CHANGED', agentId: req.params.id, status })
    return { ok: true }
  })

  /** Start over: fresh org, no projects, empty chat. */
  app.post('/api/admin/reset', async () => {
    company.emit({ type: 'COMPANY_RESET', state: createCompanyState() })
    return { ok: true }
  })
}
