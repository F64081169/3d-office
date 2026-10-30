import {
  createCompanyState,
  HOME_SEATS,
  reduceEvent,
  type Agent,
  type AgentStatus,
  type CompanyState,
  type OfficeEvent,
  type StampedEvent,
} from '@office/shared'
import { create } from 'zustand'
import { getAnchorPose } from '../agents/anchors'
import { api, streamEvents, type NewTaskInput } from '../net/api'
import { CAMERA_PRESETS } from '../world/layout'

type Tuple3 = [number, number, number]

export type CameraShot = { position: Tuple3; target: Tuple3; nonce: number }

export type RenderStats = { fps: number; calls: number; triangles: number }

/** Short-lived floating text in the 3D world ("+100 Coins", "Task done", purrs). */
export type FloatEffect = { id: number; anchorId: string; text: string; kind: 'coins' | 'love' | 'done' }

export type Toast = { id: number; kind: 'success' | 'info' | 'error'; title: string; body?: string; projectId?: string }

export type CatActivity = 'wandering' | 'napping' | 'visiting' | 'watching' | 'begging' | 'purring'

export type CatState = {
  activity: CatActivity
  /** Human-readable place, e.g. "the lounge sofa" or "Alex's desk". */
  place: string
  pets: number
}

export type Connection = 'connecting' | 'online' | 'offline'

export const CAT_ID = 'cat'
export const DIRECTOR = 'director'

type OfficeState = CompanyState & {
  /** Last applied server event. */
  seq: number
  connection: Connection
  provider: string
  /** Server simulation speed: avatars walk WALK_SPEED × simSpeed so they arrive when the server expects. */
  simSpeed: number

  cat: CatState
  hoveredId: string | null
  selectedId: string | null
  /** Task shown in the side panel (overrides the agent view). */
  viewTaskId: string | null
  followId: string | null
  cameraShot: CameraShot | null
  activeView: string | null
  introDone: boolean
  showStats: boolean
  stats: RenderStats
  effects: FloatEffect[]
  toasts: Toast[]
  /** performance.now() of each agent's last reward, drives the cheer animation. */
  lastRewardAt: Record<string, number>

  chatOpen: boolean
  chatThread: string
  unread: Record<string, number>
  /** Threads where the Owner is waiting for an answer (typing indicator). */
  awaiting: Record<string, boolean>

  connect: () => void
  /** The only way company state changes: events from the server. */
  applyEvent: (event: OfficeEvent) => void

  sendMessage: (agentId: string, text: string) => Promise<void>
  assignTask: (agentId: string, task: NewTaskInput) => Promise<boolean>
  reward: (agentId: string) => Promise<void>
  previewStatus: (agentId: string, status: AgentStatus) => Promise<void>
  resetCompany: () => Promise<void>

  setHovered: (id: string | null) => void
  select: (id: string | null) => void
  viewTask: (taskId: string | null) => void
  focusAgent: (id: string) => void
  follow: (id: string | null) => void
  openChat: (thread?: string) => void
  setChatOpen: (open: boolean) => void
  goToPreset: (id: string) => void
  finishIntro: () => void
  clearActiveView: () => void
  toggleStats: () => void
  setStats: (stats: RenderStats) => void
  setCat: (patch: Partial<CatState>) => void
  petCat: () => void
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

let nonce = 0
let effectId = 0
let toastId = 0
let disconnect: (() => void) | null = null
/** Only the latest connect() attempt may open a stream (StrictMode runs effects twice). */
let connectToken = 0
const EFFECT_MS = 1800
const TOAST_MS = 7000

/** Camera shot framing an agent from a 3/4 front angle, wherever they are right now. */
function agentShot(agent: Agent): CameraShot {
  const live = getAnchorPose(agent.id)
  const yaw = live?.yaw ?? HOME_SEATS[agent.id]?.rotationY ?? 0
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)
  const { x, z } = live ?? agent.position
  return {
    position: [x + fx * 2.6 + fz * 1.6, 2.6, z + fz * 2.6 - fx * 1.6],
    target: [x + fx * 0.3, 1.0, z + fz * 0.3],
    nonce: ++nonce,
  }
}

const company = (s: CompanyState): CompanyState => ({
  agents: s.agents,
  tasks: s.tasks,
  projects: s.projects,
  messages: s.messages,
})

export const useOfficeStore = create<OfficeState>((set, get) => {
  const spawnEffect = (anchorId: string, text: string, kind: FloatEffect['kind']) => {
    const effect = { id: ++effectId, anchorId, text, kind }
    set((s) => ({ effects: [...s.effects, effect] }))
    setTimeout(() => set((s) => ({ effects: s.effects.filter((e) => e.id !== effect.id) })), EFFECT_MS)
  }
  const pushToast = (toast: Omit<Toast, 'id'>) => {
    const t = { ...toast, id: ++toastId }
    set((s) => ({ toasts: [...s.toasts.slice(-3), t] }))
    setTimeout(() => get().dismissToast(t.id), TOAST_MS)
  }
  /** Run a command; failures become an error toast instead of an exception. */
  const command = async (what: string, run: () => Promise<unknown>) => {
    try {
      await run()
      return true
    } catch (err) {
      pushToast({ kind: 'error', title: `Could not ${what}`, body: (err as Error).message })
      return false
    }
  }

  const applyStamped = (e: StampedEvent) => {
    if (e.seq <= get().seq) return
    get().applyEvent(e.event)
    set({ seq: e.seq })
  }

  const loadSnapshot = async () => {
    const snap = await api.snapshot()
    set({ ...company(snap.state), seq: snap.seq, provider: snap.provider, simSpeed: snap.speed ?? 1 })
    return snap.seq
  }

  return {
    ...createCompanyState(),
    seq: 0,
    connection: 'connecting',
    provider: 'mock',
    simSpeed: 1,

    cat: { activity: 'wandering', place: 'the office', pets: 0 },
    hoveredId: null,
    selectedId: null,
    viewTaskId: null,
    followId: null,
    cameraShot: null,
    activeView: null,
    introDone: false,
    showStats: false,
    stats: { fps: 0, calls: 0, triangles: 0 },
    effects: [],
    toasts: [],
    lastRewardAt: {},

    chatOpen: true,
    chatThread: DIRECTOR,
    unread: {},
    awaiting: {},

    connect: () => {
      const token = ++connectToken
      disconnect?.()
      disconnect = null
      set({ connection: 'connecting' })
      loadSnapshot()
        .then((seq) => {
          if (token !== connectToken) return
          disconnect = streamEvents(seq, {
            event: applyStamped,
            resync: () => void loadSnapshot().catch(() => set({ connection: 'offline' })),
            online: (up) => set({ connection: up ? 'online' : 'offline' }),
          })
          set({ connection: 'online' })
        })
        .catch(() => {
          if (token !== connectToken) return
          // No server: keep the seed company on screen and retry quietly.
          set({ connection: 'offline' })
          setTimeout(() => token === connectToken && get().connect(), 4000)
        })
    },

    applyEvent: (event) => {
      set((s) => company(reduceEvent(s, event)))
      const s = get()
      switch (event.type) {
        case 'AGENT_REWARDED':
          set((st) => ({ lastRewardAt: { ...st.lastRewardAt, [event.agentId]: performance.now() } }))
          spawnEffect(event.agentId, `+${event.coins} Coins`, 'coins')
          break
        case 'TASK_COMPLETED':
          spawnEffect(event.agentId, 'Task done', 'done')
          break
        case 'CHAT_MESSAGE': {
          const m = event.message
          if (m.from === 'owner') break
          const visible = s.chatOpen && s.chatThread === m.thread
          set((st) => ({
            awaiting: { ...st.awaiting, [m.thread]: false },
            unread: visible ? st.unread : { ...st.unread, [m.thread]: (st.unread[m.thread] ?? 0) + 1 },
          }))
          break
        }
        case 'PROJECT_COMPLETED': {
          const p = s.projects[event.projectId]
          pushToast({ kind: 'success', title: 'Project Completed', body: p?.title, projectId: event.projectId })
          break
        }
        case 'COMPANY_RESET':
          set({ viewTaskId: null, awaiting: {}, unread: {} })
          break
      }
    },

    sendMessage: async (agentId, text) => {
      set((s) => ({ awaiting: { ...s.awaiting, [agentId]: true } }))
      const ok = await command('send the message', () => api.message(agentId, text))
      if (!ok) set((s) => ({ awaiting: { ...s.awaiting, [agentId]: false } }))
    },
    assignTask: async (agentId, task) => {
      const ok = await command('assign the task', () => api.assign(agentId, task))
      const name = get().agents.find((a) => a.id === agentId)?.name
      if (ok) pushToast({ kind: 'info', title: `Task assigned to ${name}`, body: task.title })
      return ok
    },
    reward: async (agentId) => void (await command('reward', () => api.reward(agentId, 100))),
    previewStatus: async (agentId, status) => void (await command('change status', () => api.previewStatus(agentId, status))),
    resetCompany: async () => void (await command('reset the company', () => api.reset())),

    setHovered: (id) => set({ hoveredId: id }),
    select: (id) => set({ selectedId: id, viewTaskId: null }),
    viewTask: (taskId) => set({ viewTaskId: taskId }),
    focusAgent: (id) => {
      const agent = get().agents.find((a) => a.id === id)
      if (agent) {
        set({ cameraShot: agentShot(agent), activeView: `agent:${id}`, selectedId: id, viewTaskId: null, followId: null })
      }
    },
    follow: (id) => set({ followId: id, activeView: id ? `follow:${id}` : null }),
    openChat: (thread = DIRECTOR) =>
      set((s) => ({ chatOpen: true, chatThread: thread, unread: { ...s.unread, [thread]: 0 } })),
    setChatOpen: (open) =>
      set((s) => ({ chatOpen: open, unread: open ? { ...s.unread, [s.chatThread]: 0 } : s.unread })),
    goToPreset: (id) => {
      const p = CAMERA_PRESETS.find((c) => c.id === id)
      if (p) {
        set({ cameraShot: { position: p.position, target: p.target, nonce: ++nonce }, activeView: id, followId: null })
      }
    },
    finishIntro: () => set({ introDone: true, activeView: 'overview' }),
    clearActiveView: () => set((s) => ({ activeView: s.followId ? s.activeView : null })),
    toggleStats: () => set((s) => ({ showStats: !s.showStats })),
    setStats: (stats) => set({ stats }),
    setCat: (patch) => set((s) => ({ cat: { ...s.cat, ...patch } })),
    petCat: () => {
      set((s) => ({ cat: { ...s.cat, pets: s.cat.pets + 1 } }))
      spawnEffect(CAT_ID, '♥ purr', 'love')
    },
    pushToast,
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  }
})
