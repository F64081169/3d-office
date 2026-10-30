import { HOME_SEATS, SEED_AGENTS, type Agent, type OfficeEvent } from '@office/shared'
import { create } from 'zustand'
import { CAMERA_PRESETS } from '../world/layout'

type Tuple3 = [number, number, number]

export type CameraShot = { position: Tuple3; target: Tuple3; nonce: number }

export type RenderStats = { fps: number; calls: number; triangles: number }

/** Short-lived floating text in the 3D world ("+100 Coins", hearts). */
export type FloatEffect = { id: number; anchorId: string; text: string; kind: 'coins' | 'love' }

export type CatActivity = 'wandering' | 'napping' | 'visiting' | 'watching' | 'begging' | 'purring'

export type CatState = {
  activity: CatActivity
  /** Human-readable place, e.g. "the lounge sofa" or "Alex's desk". */
  place: string
  pets: number
}

export const CAT_ID = 'cat'

type OfficeState = {
  agents: Agent[]
  cat: CatState
  hoveredId: string | null
  selectedId: string | null
  followId: string | null
  cameraShot: CameraShot | null
  activeView: string | null
  introDone: boolean
  showStats: boolean
  stats: RenderStats
  effects: FloatEffect[]
  /** performance.now() of each agent's last reward, drives the cheer animation. */
  lastRewardAt: Record<string, number>

  /** The only way company state changes. Phase 3 feeds this from the server. */
  applyEvent: (event: OfficeEvent) => void
  /** Phase 2: events originate locally. Phase 3 swaps this for an API call. */
  dispatch: (event: OfficeEvent) => void

  setHovered: (id: string | null) => void
  select: (id: string | null) => void
  focusAgent: (id: string) => void
  follow: (id: string | null) => void
  goToPreset: (id: string) => void
  finishIntro: () => void
  clearActiveView: () => void
  toggleStats: () => void
  setStats: (stats: RenderStats) => void
  setCat: (patch: Partial<CatState>) => void
  petCat: () => void
}

let nonce = 0
let effectId = 0
const EFFECT_MS = 1800

/** Camera shot framing an agent from a 3/4 front angle. */
function agentShot(agent: Agent): CameraShot {
  const yaw = HOME_SEATS[agent.id]?.rotationY ?? 0
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)
  const { x, z } = agent.position
  return {
    position: [x + fx * 2.6 + fz * 1.6, 2.6, z + fz * 2.6 - fx * 1.6],
    target: [x + fx * 0.3, 1.0, z + fz * 0.3],
    nonce: ++nonce,
  }
}

export const useOfficeStore = create<OfficeState>((set, get) => {
  const spawnEffect = (anchorId: string, text: string, kind: FloatEffect['kind']) => {
    const effect = { id: ++effectId, anchorId, text, kind }
    set((s) => ({ effects: [...s.effects, effect] }))
    setTimeout(() => set((s) => ({ effects: s.effects.filter((e) => e.id !== effect.id) })), EFFECT_MS)
  }
  const updateAgent = (id: string, patch: (a: Agent) => Partial<Agent>) =>
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch(a) } : a)) }))

  return {
    agents: SEED_AGENTS,
    cat: { activity: 'wandering', place: 'the office', pets: 0 },
    hoveredId: null,
    selectedId: null,
    followId: null,
    cameraShot: null,
    activeView: null,
    introDone: false,
    showStats: false,
    stats: { fps: 0, calls: 0, triangles: 0 },
    effects: [],
    lastRewardAt: {},

    applyEvent: (event) => {
      switch (event.type) {
        case 'AGENT_STATUS_CHANGED':
          updateAgent(event.agentId, () => ({ status: event.status }))
          break
        case 'AGENT_REWARDED':
          updateAgent(event.agentId, (a) => ({ coins: a.coins + event.coins }))
          set((s) => ({ lastRewardAt: { ...s.lastRewardAt, [event.agentId]: performance.now() } }))
          spawnEffect(event.agentId, `+${event.coins} Coins`, 'coins')
          break
        default:
          // Task / project events arrive with the Task Engine (Phase 3).
          break
      }
    },
    dispatch: (event) => get().applyEvent(event),

    setHovered: (id) => set({ hoveredId: id }),
    select: (id) => set({ selectedId: id }),
    focusAgent: (id) => {
      const agent = get().agents.find((a) => a.id === id)
      if (agent) set({ cameraShot: agentShot(agent), activeView: `agent:${id}`, selectedId: id, followId: null })
    },
    follow: (id) => set({ followId: id, activeView: id ? `follow:${id}` : null }),
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
  }
})
