import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import type { Agent, ChatMessage, CompanyState, Project, StampedEvent, Task } from '@office/shared'
import { MESSAGE_LIMIT } from '@office/shared'
import { PrismaClient } from './generated/prisma/client'

const date = (iso?: string) => (iso ? new Date(iso) : null)
const iso = (d: Date | null) => d?.toISOString() ?? undefined
const opt = <T,>(v: T | null) => v ?? undefined

const agentRow = (a: Agent) => ({
  id: a.id,
  name: a.name,
  role: a.role,
  department: a.department,
  level: a.level,
  managerId: a.managerId ?? null,
  skills: JSON.stringify(a.skills),
  status: a.status,
  currentTaskId: a.currentTaskId ?? null,
  performance: a.performance,
  coins: a.coins,
  posX: a.position.x,
  posY: a.position.y,
  posZ: a.position.z,
})

const taskRow = (t: Task) => ({
  id: t.id,
  projectId: t.projectId ?? null,
  parentTaskId: t.parentTaskId ?? null,
  title: t.title,
  description: t.description,
  createdBy: t.createdBy,
  assignedTo: t.assignedTo,
  status: t.status,
  blockedReason: t.blockedReason ?? null,
  priority: t.priority,
  reward: t.reward,
  result: t.result ?? null,
  score: t.score ? JSON.stringify(t.score) : null,
  paid: t.paid ?? null,
  createdAt: new Date(t.createdAt),
  startedAt: date(t.startedAt),
  completedAt: date(t.completedAt),
})

const projectRow = (p: Project) => ({
  id: p.id,
  title: p.title,
  prompt: p.prompt,
  status: p.status,
  rootTaskId: p.rootTaskId,
  summary: p.summary ?? null,
  createdAt: new Date(p.createdAt),
  completedAt: date(p.completedAt),
})

/**
 * SQLite persistence. Writes are queued in event order; each event updates the rows it
 * touched (latest state) and is appended to the Event log.
 */
export function openDatabase(url: string, log: (msg: string) => void) {
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
  let chain = Promise.resolve()

  async function load(): Promise<{ state: CompanyState; seq: number } | null> {
    const agents = await prisma.agent.findMany()
    if (!agents.length) return null
    const [tasks, projects, messages, last] = await Promise.all([
      prisma.task.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.project.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.chatMessage.findMany({ orderBy: { createdAt: 'desc' }, take: MESSAGE_LIMIT }),
      prisma.event.findFirst({ orderBy: { seq: 'desc' } }),
    ])
    const state: CompanyState = {
      agents: agents.map(
        (a): Agent => ({
          id: a.id,
          name: a.name,
          role: a.role,
          department: a.department as Agent['department'],
          level: a.level,
          managerId: opt(a.managerId),
          skills: JSON.parse(a.skills) as string[],
          status: a.status as Agent['status'],
          currentTaskId: opt(a.currentTaskId),
          performance: a.performance,
          coins: a.coins,
          position: { x: a.posX, y: a.posY, z: a.posZ },
        }),
      ),
      tasks: Object.fromEntries(
        tasks.map((t): [string, Task] => [
          t.id,
          {
            id: t.id,
            projectId: opt(t.projectId),
            parentTaskId: opt(t.parentTaskId),
            title: t.title,
            description: t.description,
            createdBy: t.createdBy,
            assignedTo: t.assignedTo,
            status: t.status as Task['status'],
            blockedReason: opt(t.blockedReason),
            priority: t.priority as Task['priority'],
            reward: t.reward,
            result: opt(t.result),
            score: t.score ? (JSON.parse(t.score) as Task['score']) : undefined,
            paid: opt(t.paid),
            createdAt: t.createdAt.toISOString(),
            startedAt: iso(t.startedAt),
            completedAt: iso(t.completedAt),
          },
        ]),
      ),
      projects: Object.fromEntries(
        projects.map((p): [string, Project] => [
          p.id,
          {
            id: p.id,
            title: p.title,
            prompt: p.prompt,
            status: p.status as Project['status'],
            rootTaskId: p.rootTaskId,
            summary: opt(p.summary),
            createdAt: p.createdAt.toISOString(),
            completedAt: iso(p.completedAt),
          },
        ]),
      ),
      messages: messages.reverse().map(
        (m): ChatMessage => ({
          id: m.id,
          thread: m.thread,
          from: m.from,
          text: m.text,
          projectId: opt(m.projectId),
          createdAt: m.createdAt.toISOString(),
        }),
      ),
    }
    return { state, seq: last?.seq ?? 0 }
  }

  async function write({ seq, at, event }: StampedEvent, state: CompanyState) {
    const agent = (id: string) => state.agents.find((a) => a.id === id)
    const upsertAgent = async (id: string) => {
      const a = agent(id)
      if (a) await prisma.agent.upsert({ where: { id }, create: agentRow(a), update: agentRow(a) })
    }
    const upsertTask = async (id: string) => {
      const t = state.tasks[id]
      if (t) await prisma.task.upsert({ where: { id }, create: taskRow(t), update: taskRow(t) })
    }
    const upsertProject = async (id: string) => {
      const p = state.projects[id]
      if (p) await prisma.project.upsert({ where: { id }, create: projectRow(p), update: projectRow(p) })
    }

    switch (event.type) {
      case 'PROJECT_CREATED':
        await upsertProject(event.project.id)
        break
      case 'PROJECT_COMPLETED':
        await upsertProject(event.projectId)
        break
      case 'TASK_CREATED':
        await upsertTask(event.task.id)
        break
      case 'TASK_ASSIGNED':
      case 'TASK_STARTED':
      case 'TASK_STATUS_CHANGED':
        await upsertTask(event.taskId)
        break
      case 'TASK_COMPLETED':
        await upsertTask(event.taskId)
        await upsertAgent(event.agentId) // performance moved
        break
      case 'AGENT_STATUS_CHANGED':
        await upsertAgent(event.agentId)
        break
      case 'AGENT_REWARDED':
        await upsertAgent(event.agentId)
        if (event.taskId) await upsertTask(event.taskId)
        break
      case 'CHAT_MESSAGE': {
        const m = event.message
        await prisma.chatMessage.create({ data: { ...m, projectId: m.projectId ?? null, createdAt: new Date(m.createdAt) } })
        break
      }
      case 'COMPANY_RESET':
        await prisma.$transaction([
          prisma.task.deleteMany(),
          prisma.project.deleteMany(),
          prisma.chatMessage.deleteMany(),
          prisma.event.deleteMany(),
          prisma.agent.deleteMany(),
        ])
        for (const a of state.agents) await prisma.agent.create({ data: agentRow(a) })
        return // the reset itself is not logged
    }
    await prisma.event.create({ data: { seq, type: event.type, payload: JSON.stringify(event), at: new Date(at) } })
  }

  return {
    load,
    /** Queue a write; failures are logged, never thrown into the simulation. */
    persist(stamped: StampedEvent, state: CompanyState) {
      chain = chain.then(() => write(stamped, state)).catch((err) => log(`[db] ${stamped.event.type}: ${(err as Error).message}`))
    },
    async seed(state: CompanyState) {
      for (const a of state.agents) await prisma.agent.upsert({ where: { id: a.id }, create: agentRow(a), update: agentRow(a) })
    },
    /** Resolves once every queued write is on disk. */
    flush: () => chain,
    close: () => prisma.$disconnect(),
  }
}

export type Database = ReturnType<typeof openDatabase>
