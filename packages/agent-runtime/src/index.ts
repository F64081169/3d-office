import type { LLMProvider } from '@office/llm-provider'
import {
  childrenOf,
  DIRECTOR_ID,
  directReports,
  OWNER_ID,
  projectTasks,
  travelSeconds,
  type Agent,
  type AgentStatus,
  type CompanyState,
  type OfficeEvent,
  type Task,
  type TaskPriority,
} from '@office/shared'
import type { TaskEngine } from '@office/task-engine'

/** Time spent once people have arrived (talking, waiting to be unblocked), ms at speed 1. */
export const PAUSE = { meeting: 5000, report: 3000, blocked: 5000, reply: 600 }
/** How long a break lasts once the agent got there, ms at speed 1. */
const BREAK_STAY: [number, number] = [14000, 24000]
/** Idle agents wander off for a break every so often (ambient life), ms at speed 1. */
const AMBIENT_EVERY: [number, number] = [25000, 45000]
const MAX_ON_BREAK = 2
const MAX_ATTEMPTS = 3

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

export type RuntimeDeps = {
  engine: TaskEngine
  provider: LLMProvider
  getState: () => CompanyState
  emit: (event: OfficeEvent) => void
  /** Multiplies every pause: 2 = twice as fast. */
  speed?: number
  now?: () => string
  newId?: (prefix: string) => string
  log?: (message: string) => void
}

type Ctx = {
  /** Await an async step; throws if the company was reset meanwhile. */
  step: <T>(p: Promise<T>) => Promise<T>
  /** Wait `ms` of simulated time (scaled by speed). */
  pause: (ms: number) => Promise<void>
  /** Wait until a wall-clock timestamp (e.g. someone's arrival). */
  until: (timestamp: number) => Promise<void>
}

class Cancelled extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Runs the company. Each agent has a serial action queue; behaviours are short
 * scripts (status change → one provider call → engine command) triggered by events:
 *
 *   Owner message → Director plans → kickoff meeting → workstreams to Managers
 *   TASK_ASSIGNED → Manager splits / Employee prepares, works, reports
 *   all children done → Manager reviews and reports / Director integrates and reports to Owner
 */
export class AgentRuntime {
  private engine: TaskEngine
  private provider: LLMProvider
  private getState: () => CompanyState
  private emit: (event: OfficeEvent) => void
  private speed: number
  private now: () => string
  private newId: (prefix: string) => string
  private log: (message: string) => void

  private queues = new Map<string, Promise<void>>()
  private pending = new Map<string, number>()
  private generation = 0
  /** Where each agent is physically heading (the place of this status) and when they arrive. */
  private location = new Map<string, { status: AgentStatus; arriveAt: number }>()

  constructor(deps: RuntimeDeps) {
    this.engine = deps.engine
    this.provider = deps.provider
    this.getState = deps.getState
    this.emit = deps.emit
    this.speed = Math.max(0.1, deps.speed ?? 1)
    this.now = deps.now ?? (() => new Date().toISOString())
    this.newId = deps.newId ?? ((p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`)
    this.log = deps.log ?? (() => {})
  }

  // ------------------------------------------------------------------ inputs

  /** React to company events. Must stay asynchronous: it only schedules work. */
  handleEvent(e: OfficeEvent) {
    if (e.type === 'COMPANY_RESET') {
      this.generation++
      this.queues.clear()
      this.pending.clear()
      this.location.clear()
      return
    }
    if (e.type === 'TASK_ASSIGNED') {
      const agent = this.agent(e.agentId)
      const task = this.getState().tasks[e.taskId]
      if (!agent || !task || agent.level === 3) return // the Director's root task is driven by the project flow
      if (agent.level === 2) this.enqueue(agent.id, (ctx) => this.managerSplit(ctx, agent, task.id))
      else this.enqueue(agent.id, (ctx) => this.employeeWork(ctx, agent, task.id))
      return
    }
    if (e.type === 'TASK_COMPLETED') {
      const parentId = this.getState().tasks[e.taskId]?.parentTaskId
      if (parentId && this.engine.isRollupReady(parentId)) this.scheduleRollup(parentId)
    }
  }

  /** The Owner says something to an agent. Only the Director turns it into work. */
  ownerMessage(agentId: string, text: string) {
    this.chat(agentId, OWNER_ID, text)
    if (agentId !== DIRECTOR_ID) return void this.reply(agentId, text)
    const t = text.trim()
    const smallTalk = /^(hi|hello|hey|thanks|thank you|ok|okay|great|nice|嗨|哈囉|你好|謝謝|好)\b/i.test(t) && t.split(/\s+/).length <= 4
    const progress = t.length < 100 && /(status|progress|update|how('?s| is) it going|進度|狀況)/i.test(t)
    if (smallTalk) return void this.reply(agentId, text)
    if (progress) return void this.progressReport()
    this.startProject(text)
  }

  /** Owner assigns work directly from an agent's panel. */
  assignFromOwner(agentId: string, input: { title: string; description?: string; priority?: TaskPriority }) {
    if (agentId === DIRECTOR_ID) {
      const text = input.description ? `${input.title}\n${input.description}` : input.title
      this.chat(DIRECTOR_ID, OWNER_ID, text)
      return this.startProject(text)
    }
    this.engine.createTask({ ...input, createdBy: OWNER_ID, assignedTo: agentId })
  }

  /**
   * After a server restart in-flight actions are gone: put everyone back to idle and
   * re-drive whatever was unfinished from its last persisted state.
   */
  resume() {
    const s = this.getState()
    for (const a of s.agents) this.setStatus(a.id, 'idle', null)
    const open = Object.values(s.tasks)
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const t of open) {
      const agent = this.agent(t.assignedTo)
      if (!agent) continue
      const kids = childrenOf(s, t.id)
      if (agent.level === 1) this.enqueue(agent.id, (ctx) => this.employeeWork(ctx, agent, t.id))
      else if (kids.length && kids.every((k) => k.status === 'completed')) this.scheduleRollup(t.id)
      else if (!kids.length && agent.level === 2) this.enqueue(agent.id, (ctx) => this.managerSplit(ctx, agent, t.id))
      else if (!kids.length && t.status !== 'blocked') this.engine.block(t.id, 'Interrupted while planning. Ask the Director again.')
    }
    for (const a of s.agents) this.settle(a.id)
    if (open.length) this.log(`[runtime] resumed ${open.length} unfinished task(s)`)
  }

  // ------------------------------------------------------------- behaviours

  private startProject(text: string) {
    const director = this.agent(DIRECTOR_ID)!
    this.enqueue(director.id, async (ctx) => {
      this.setStatus(director.id, 'thinking')
      const managers = directReports(this.getState().agents, director.id)
      const plan = await ctx.step(this.provider.runAgent({ agent: director, mode: 'plan', prompt: text, team: managers }))
      this.chat(director.id, director.id, plan.text)

      const { project, root } = this.engine.createProject({ prompt: text, title: plan.title ?? text, directorId: director.id })
      this.engine.start(root.id)

      // Kick-off: the Director and every manager who gets a workstream walk to the
      // meeting room; it starts when the last one sits down. Managers stay there until
      // their own next step walks them back to their desks.
      const involved = [...new Set((plan.work ?? []).map((w) => w.assignee))].filter((m) => !this.busy(m))
      this.setStatus(director.id, 'meeting', root.id)
      for (const m of involved) this.setStatus(m, 'meeting', null)
      await ctx.until(Math.max(...[director.id, ...involved].map((id) => this.arrival(id))))
      await ctx.pause(PAUSE.meeting)

      for (const w of plan.work ?? []) {
        const { assignee, ...rest } = w
        this.engine.createTask({ ...rest, assignedTo: assignee, createdBy: director.id, parentTaskId: root.id, projectId: project.id })
      }
      const names = (id: string) => this.agent(id)?.name ?? id
      this.chat(
        director.id,
        director.id,
        [
          `Project created: **${project.title}**.`,
          `I've set up ${plan.work?.length ?? 0} workstreams:`,
          ...(plan.work ?? []).map((w) => `• ${w.title} → ${names(w.assignee)}`),
          "I'll review the results and report back to you.",
        ].join('\n'),
        project.id,
      )
    })
  }

  private async managerSplit(ctx: Ctx, manager: Agent, taskId: string) {
    const task = this.engine.task(taskId)
    await this.walkTo(ctx, manager.id, 'thinking', task.id)
    const team = directReports(this.getState().agents, manager.id)
    const res = await ctx.step(
      this.provider.runAgent({ agent: manager, mode: 'split', task, team, projectPrompt: this.promptOf(task) }),
    )
    this.engine.start(task.id)
    for (const w of res.work ?? []) {
      const { assignee, ...rest } = w
      this.engine.createTask({ ...rest, assignedTo: assignee, createdBy: manager.id, parentTaskId: task.id, projectId: task.projectId })
    }
  }

  private async employeeWork(ctx: Ctx, employee: Agent, taskId: string) {
    const projectPrompt = this.promptOf(this.engine.task(taskId))
    await this.walkTo(ctx, employee.id, 'thinking', taskId)
    await ctx.step(this.provider.runAgent({ agent: employee, mode: 'prepare', task: this.engine.task(taskId), projectPrompt }))

    this.engine.start(taskId)
    this.setStatus(employee.id, 'working', taskId)
    let attempt = 0
    let res = await ctx.step(this.provider.runAgent({ agent: employee, mode: 'execute', task: this.engine.task(taskId), attempt, projectPrompt }))
    while (res.blocked && attempt < MAX_ATTEMPTS) {
      this.engine.block(taskId, res.blocked)
      this.setStatus(employee.id, 'blocked', taskId)
      await ctx.pause(PAUSE.blocked)
      this.engine.start(taskId)
      this.setStatus(employee.id, 'working', taskId)
      attempt++
      res = await ctx.step(this.provider.runAgent({ agent: employee, mode: 'execute', task: this.engine.task(taskId), attempt, projectPrompt }))
    }

    await this.walkTo(ctx, employee.id, 'reporting', taskId)
    await ctx.pause(PAUSE.report)
    this.finish(employee, taskId, res.blocked ? `Could not finish: ${res.blocked}` : res.text)
    // Done with their part: about half the time they grab a coffee before the next thing.
    if (hash(taskId) < 0.5) setTimeout(() => this.takeBreak(employee.id), 0)
  }

  private scheduleRollup(parentId: string) {
    const parent = this.getState().tasks[parentId]
    const owner = parent && this.agent(parent.assignedTo)
    if (!parent || !owner) return
    const project = parent.projectId ? this.getState().projects[parent.projectId] : undefined
    if (project?.rootTaskId === parent.id) this.enqueue(owner.id, (ctx) => this.finishProject(ctx, owner, project.id))
    else this.enqueue(owner.id, (ctx) => this.managerReview(ctx, owner, parentId))
  }

  private async managerReview(ctx: Ctx, manager: Agent, taskId: string) {
    const task = this.engine.task(taskId)
    if (task.status === 'completed') return
    await this.walkTo(ctx, manager.id, 'thinking', taskId)
    this.engine.submitForReview(taskId)
    const res = await ctx.step(
      this.provider.runAgent({
        agent: manager,
        mode: 'review',
        task,
        childResults: this.resultsOf(taskId),
        projectPrompt: this.promptOf(task),
      }),
    )
    await this.walkTo(ctx, manager.id, 'reporting', taskId)
    await ctx.pause(PAUSE.report)
    this.finish(manager, taskId, res.text)
  }

  private async finishProject(ctx: Ctx, director: Agent, projectId: string) {
    const project = this.getState().projects[projectId]
    const root = this.engine.task(project.rootTaskId)
    if (root.status === 'completed') return
    await this.walkTo(ctx, director.id, 'thinking', root.id)
    this.engine.submitForReview(root.id)
    const res = await ctx.step(
      this.provider.runAgent({
        agent: director,
        mode: 'summarize',
        task: root,
        childResults: this.resultsOf(root.id),
        projectPrompt: project.prompt,
        projectTitle: project.title,
      }),
    )
    await this.walkTo(ctx, director.id, 'reporting', root.id)
    await ctx.pause(PAUSE.report)
    this.engine.complete(root.id, res.text)
    this.chat(director.id, director.id, res.text, project.id)
    this.engine.completeProject(project.id, res.text)
  }

  /** Complete a task; work the Owner assigned directly is reported back in chat. */
  private finish(agent: Agent, taskId: string, result: string) {
    this.engine.complete(taskId, result)
    const t = this.engine.task(taskId)
    if (t.createdBy === OWNER_ID && !t.parentTaskId) this.chat(agent.id, agent.id, `Done: **${t.title}**\n${result}`)
  }

  private async reply(agentId: string, text: string) {
    const gen = this.generation
    const agent = this.agent(agentId)!
    // Talk about the current task, or the most recent one if they are between tasks.
    const tasks = this.getState().tasks
    const task =
      (agent.currentTaskId && tasks[agent.currentTaskId]) ||
      Object.values(tasks)
        .filter((t) => t.assignedTo === agentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    const res = await this.provider.runAgent({ agent, mode: 'chat', prompt: text, task })
    if (gen === this.generation) this.chat(agentId, agentId, res.text)
  }

  private async progressReport() {
    const gen = this.generation
    await sleep(PAUSE.reply / this.speed)
    if (gen !== this.generation) return
    const s = this.getState()
    const active = Object.values(s.projects).filter((p) => p.status === 'in_progress')
    const lines = active.length
      ? active.flatMap((p) => {
          const tasks = projectTasks(s, p.id)
          const done = tasks.filter((t) => t.status === 'completed').length
          const blocked = tasks.filter((t) => t.status === 'blocked')
          return [
            `**${p.title}**: ${done}/${tasks.length} tasks done.`,
            ...blocked.map((t) => `• Blocked: ${t.title} (${this.agent(t.assignedTo)?.name}): ${t.blockedReason}`),
          ]
        })
      : ['No active projects right now. Tell me what you need and I will organise the team.']
    this.chat(DIRECTOR_ID, DIRECTOR_ID, lines.join('\n'))
  }

  /** An idle agent wanders to their favourite break spot, then comes back. Work interrupts it. */
  takeBreak(agentId: string) {
    const agent = this.agent(agentId)
    if (!agent || agent.status !== 'idle' || this.busy(agentId)) return
    const gen = this.generation
    const [lo, hi] = BREAK_STAY
    this.setStatus(agentId, 'break', null)
    const stay = (lo + hash(`${agentId}${Date.now()}`) * (hi - lo)) / this.speed
    setTimeout(() => {
      const a = this.agent(agentId)
      if (gen === this.generation && a?.status === 'break' && !this.busy(agentId)) this.settle(agentId)
    }, Math.max(0, this.arrival(agentId) - Date.now()) + stay)
  }

  /** Every so often an idle agent takes a break, so the office never looks frozen. Returns a stop function. */
  startAmbient() {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const agents = this.getState().agents
      const onBreak = agents.filter((a) => a.status === 'break').length
      const idle = agents.filter((a) => a.level < 3 && a.status === 'idle' && !this.busy(a.id))
      if (onBreak < MAX_ON_BREAK && idle.length) this.takeBreak(idle[Math.floor(Math.random() * idle.length)].id)
      const [lo, hi] = AMBIENT_EVERY
      timer = setTimeout(tick, (lo + Math.random() * (hi - lo)) / this.speed)
    }
    timer = setTimeout(tick, AMBIENT_EVERY[0] / this.speed)
    return () => clearTimeout(timer)
  }

  // --------------------------------------------------------------- plumbing

  /** Change status and wait until the agent has physically walked to that status's place. */
  private async walkTo(ctx: Ctx, agentId: string, status: AgentStatus, taskId?: string | null) {
    this.setStatus(agentId, status, taskId)
    await ctx.until(this.arrival(agentId))
  }

  /** Wall-clock time the agent reaches its current destination. */
  private arrival(agentId: string) {
    return this.location.get(agentId)?.arriveAt ?? 0
  }

  private enqueue(agentId: string, action: (ctx: Ctx) => Promise<void>) {
    const gen = this.generation
    const alive = () => gen === this.generation
    const ctx: Ctx = {
      step: async (p) => {
        const v = await p
        if (!alive()) throw new Cancelled()
        return v
      },
      pause: async (ms) => {
        await sleep(ms / this.speed)
        if (!alive()) throw new Cancelled()
      },
      until: async (timestamp) => {
        await sleep(Math.max(0, timestamp - Date.now()))
        if (!alive()) throw new Cancelled()
      },
    }
    this.pending.set(agentId, (this.pending.get(agentId) ?? 0) + 1)
    const prev = this.queues.get(agentId) ?? Promise.resolve()
    const next = prev.then(async () => {
      try {
        if (alive()) await action(ctx)
      } catch (err) {
        if (!(err instanceof Cancelled)) this.log(`[runtime] ${agentId}: ${(err as Error).message}`)
      } finally {
        if (alive()) {
          this.pending.set(agentId, (this.pending.get(agentId) ?? 1) - 1)
          this.settle(agentId)
        }
      }
    })
    this.queues.set(agentId, next)
  }

  private busy = (agentId: string) => (this.pending.get(agentId) ?? 0) > 0

  /** Between actions: 'working' while tracking open tasks, otherwise idle. */
  private settle(agentId: string) {
    if (this.busy(agentId)) return
    const open = this.engine.openTasksOf(agentId)
    this.setStatus(agentId, open.length ? 'working' : 'idle', open[0]?.id ?? null)
  }

  private setStatus(agentId: string, status: AgentStatus, taskId?: string | null) {
    const a = this.agent(agentId)
    if (!a) return
    const sameTask = taskId === undefined || (a.currentTaskId ?? null) === taskId
    if (a.status === status && sameTask) return
    this.track(a, status)
    this.emit({ type: 'AGENT_STATUS_CHANGED', agentId, status, taskId })
  }

  /**
   * Remember where the agent is walking to. If they were still on their way somewhere,
   * count the rest of that walk too (the browser reroutes from wherever they are).
   */
  private track(agent: Agent, status: AgentStatus) {
    const now = Date.now()
    const prev = this.location.get(agent.id) ?? { status: agent.status, arriveAt: now }
    const walk = travelSeconds(agent, prev.status, status, this.getState().agents)
    if (walk === 0) return
    const stillWalking = Math.max(0, prev.arriveAt - now)
    this.location.set(agent.id, { status, arriveAt: now + stillWalking + (walk * 1000) / this.speed })
  }

  private chat(thread: string, from: string, text: string, projectId?: string) {
    this.emit({
      type: 'CHAT_MESSAGE',
      message: { id: this.newId('m'), thread, from, text, projectId, createdAt: this.now() },
    })
  }

  private agent = (id: string) => this.getState().agents.find((a) => a.id === id)

  private promptOf(task: Task) {
    return task.projectId ? this.getState().projects[task.projectId]?.prompt : undefined
  }

  private resultsOf(taskId: string) {
    return childrenOf(this.getState(), taskId).map((t) => ({ agent: this.agent(t.assignedTo)!, task: t }))
  }
}
