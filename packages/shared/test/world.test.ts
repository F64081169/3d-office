import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createCompanyState,
  HOME_SEATS,
  MEETING_SEATS,
  MEETING_TABLE,
  placeFor,
  routeBetween,
  travelSeconds,
  type AgentStatus,
  type XZ,
} from '../src/index'

/** [minX, maxX, minZ, maxZ]. Mirrors the furniture in apps/web/src/world/rooms. */
type Rect = { name: string; r: [number, number, number, number]; chair?: boolean }

const box = (name: string, cx: number, cz: number, w: number, d: number, chair = false): Rect => ({
  name,
  r: [cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2],
  chair,
})

const agents = createCompanyState().agents
const T = MEETING_TABLE

const OBSTACLES: Rect[] = [
  // Workstations: desks in front of each seat, plus every chair.
  ...agents.flatMap((a) => {
    const { position: p, rotationY } = HOME_SEATS[a.id]
    const [w, d] = a.level === 3 ? [2.2, 1.0] : a.level === 2 ? [1.9, 0.9] : [1.6, 0.8]
    const off = 0.4 + d / 2
    const deskZ = p.z + Math.cos(rotationY) * off
    return [box(`desk ${a.id}`, p.x, deskZ, w, d), box(`chair ${a.id}`, p.x, p.z, 0.6, 0.6, true)]
  }),
  box('meeting table', T.x, T.z, T.length, T.width),
  ...MEETING_SEATS.map((s, i) => box(`meeting chair ${i}`, s.position.x, s.position.z, 0.6, 0.6, true)),
  box('meeting credenza', -10.2, T.z, 0.42, 3.4),
  box('director credenza', -14, -12.55, 3.6, 0.45),
  box('director sofa', -19.35, -9.6, 0.92, 2.4),
  box('guest chair 1', -14.55, -8.05, 0.6, 0.6, true),
  box('guest chair 2', -13.45, -8.05, 0.6, 0.6, true),
  box('lounge sofa', 5.2, -6.95, 3.2, 0.92, true),
  box('lounge sofa B', 2.75, -9.3, 0.92, 2.2, true),
  box('armchair 1', 8.3, -8.3, 0.85, 0.95, true),
  box('armchair 2', 8.3, -9.8, 0.85, 0.95, true),
  box('lounge table', 5.4, -9.0, 1.1, 1.1),
  box('lounge divider', 5.4, -5.0, 7.6, 0.36),
  box('workspace divider', -2.8, 0.2, 0.38, 2.4),
  box('workspace olive', -2.8, -3.0, 0.6, 0.6),
  box('workspace fiddle', -2.8, 2.6, 0.5, 0.5),
  box('coffee island', 15.2, -8.6, 1.15, 3.8),
  box('stools', 14.25, -8.6, 0.4, 2.8),
  box('back counter', 19.58, -9.4, 0.66, 5.7),
  box('huddle', 10, -0.2, 0.9, 1.9),
  box('nook bookshelf', -16.2, -3.6, 1.8, 0.38),
  box('elevator core', 0, 10.5, 10, 5),
  box('bathroom', 14, 9, 12, 8),
  // Solid / glass walls (door gaps left open).
  { name: 'director glass W', r: [-20, -12.9, -6.05, -5.95] },
  { name: 'director glass E', r: [-11.7, -10.5, -6.05, -5.95] },
  { name: 'meeting glass W', r: [-10.5, -9.8, -6.05, -5.95] },
  { name: 'meeting glass E', r: [-8.6, -1, -6.05, -5.95] },
  { name: 'meeting glass east wall', r: [-1.05, -0.95, -13, -6] },
  { name: 'partition', r: [-10.6, -10.4, -13, -6] },
]

const MARGIN = 0.1

/** Liang–Barsky: does segment a→b touch the rectangle? */
function hits(a: XZ, b: XZ, [x0, x1, z0, z1]: Rect['r']) {
  const [minX, maxX, minZ, maxZ] = [x0 - MARGIN, x1 + MARGIN, z0 - MARGIN, z1 + MARGIN]
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  let t0 = 0
  let t1 = 1
  for (const [p, q] of [
    [-dx, a[0] - minX],
    [dx, maxX - a[0]],
    [-dz, a[1] - minZ],
    [dz, maxZ - a[1]],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false
    } else {
      const t = q / p
      if (p < 0) t0 = Math.max(t0, t)
      else t1 = Math.min(t1, t)
      if (t0 > t1) return false
    }
  }
  return true
}

const inside = ([x, z]: XZ, [x0, x1, z0, z1]: Rect['r']) => x >= x0 && x <= x1 && z >= z0 && z <= z1
const STATUSES: AgentStatus[] = ['idle', 'meeting', 'reporting', 'break']

test('every agent can walk between all of its places without touching furniture', () => {
  const problems: string[] = []
  for (const agent of agents) {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        if (from === to) continue
        const route = routeBetween(placeFor(agent, from, agents), placeFor(agent, to, agents))
        const start = route[0]
        const end = route[route.length - 1]
        for (let i = 0; i < route.length - 1; i++) {
          for (const o of OBSTACLES) {
            // Your own seat (where the route starts or ends) is allowed.
            if (o.chair && (inside(start, o.r) || inside(end, o.r))) continue
            if (hits(route[i], route[i + 1], o.r)) {
              problems.push(`${agent.id} ${from}→${to}: segment ${route[i]} → ${route[i + 1]} hits ${o.name}`)
            }
          }
        }
      }
    }
  }
  assert.deepEqual(problems, [])
})

test('walks that gate the timeline stay short', () => {
  // Kickoffs wait for the farthest participant; reports wait for the walk to the manager.
  for (const agent of agents) {
    if (agent.level >= 2) {
      const s = travelSeconds(agent, 'idle', 'meeting', agents)
      assert.ok(s < 16, `${agent.id} → meeting takes ${s.toFixed(1)}s`)
    }
    const r = travelSeconds(agent, 'working', 'reporting', agents)
    assert.ok(r < 16, `${agent.id} → reporting takes ${r.toFixed(1)}s`)
    const b = travelSeconds(agent, 'idle', 'break', agents)
    assert.ok(b < 35, `${agent.id} → break takes ${b.toFixed(1)}s`)
  }
})

test('nobody shares a seat or a standing spot', () => {
  for (const status of ['meeting', 'reporting', 'break'] as const) {
    const spots = agents.map((a) => placeFor(a, status, agents).position.join(','))
    assert.equal(new Set(spots).size, spots.length, `${status}: ${spots.join(' | ')}`)
  }
})
