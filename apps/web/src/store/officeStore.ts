import { HOME_SEATS, SEED_AGENTS, type Agent } from '@office/shared'
import { create } from 'zustand'
import { CAMERA_PRESETS } from '../world/layout'

type Tuple3 = [number, number, number]

export type CameraShot = { position: Tuple3; target: Tuple3; nonce: number }

export type RenderStats = { fps: number; calls: number; triangles: number }

type OfficeState = {
  agents: Agent[]
  hoveredAgentId: string | null
  cameraShot: CameraShot | null
  activeView: string | null
  introDone: boolean
  showStats: boolean
  stats: RenderStats

  setHovered: (id: string | null) => void
  focusAgent: (id: string) => void
  goToPreset: (id: string) => void
  finishIntro: () => void
  clearActiveView: () => void
  toggleStats: () => void
  setStats: (stats: RenderStats) => void
}

let nonce = 0

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

export const useOfficeStore = create<OfficeState>((set, get) => ({
  agents: SEED_AGENTS,
  hoveredAgentId: null,
  cameraShot: null,
  activeView: null,
  introDone: false,
  showStats: false,
  stats: { fps: 0, calls: 0, triangles: 0 },

  setHovered: (id) => set({ hoveredAgentId: id }),
  focusAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id)
    if (agent) set({ cameraShot: agentShot(agent), activeView: `agent:${id}` })
  },
  goToPreset: (id) => {
    const p = CAMERA_PRESETS.find((c) => c.id === id)
    if (p) set({ cameraShot: { position: p.position, target: p.target, nonce: ++nonce }, activeView: id })
  },
  finishIntro: () => set({ introDone: true, activeView: 'overview' }),
  clearActiveView: () => set({ activeView: null }),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  setStats: (stats) => set({ stats }),
}))
