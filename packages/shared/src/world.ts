import { directReports, HOME_SEATS, type Seat } from './org'
import type { Agent, AgentStatus } from './types'

/**
 * The walkable world, shared by server and browser.
 *
 * The server uses it to know how long a walk takes (a kickoff meeting starts when the
 * farthest manager has arrived); the browser animates avatars along exactly the same
 * routes. Coordinates are metres, [x, z] on the floor (+x east, -z north).
 */
export type XZ = [number, number]

/** Walking speed in m/s at simulation speed 1 (brisk office pace). */
export const WALK_SPEED = 1.6
/** Seconds to stand up from / sit down on a seat. */
export const POSTURE_SECONDS = 0.45

// ------------------------------------------------------------------ meeting room

export const MEETING_TABLE = { x: -5.75, z: -9.5, length: 5.6, width: 1.5 }
const T = MEETING_TABLE

/**
 * 0–9: five seats per long side (even = north row facing south, odd = south row facing north),
 * 10: east head, 11: west head in front of the wall screen (where the Director leads).
 */
export const MEETING_SEATS: Seat[] = [
  ...[-2.2, -1.1, 0, 1.1, 2.2].flatMap((dx) => [
    { position: { x: T.x + dx, y: 0, z: T.z - 1.15 }, rotationY: 0 },
    { position: { x: T.x + dx, y: 0, z: T.z + 1.15 }, rotationY: Math.PI },
  ]),
  { position: { x: T.x + 3.35, y: 0, z: T.z }, rotationY: -Math.PI / 2 },
  { position: { x: T.x - 3.35, y: 0, z: T.z }, rotationY: Math.PI / 2 },
]

/** Door gap (x range) in the meeting room's south glass wall at z = -6. */
export const MEETING_DOOR: [number, number] = [-9.8, -8.6]
const DOOR_X = (MEETING_DOOR[0] + MEETING_DOOR[1]) / 2

/** Who sits where at a kickoff: the Director leads from the screen end, managers beside her. */
const MEETING_SEAT_OF: Record<string, number> = {
  director: 11,
  'research-manager': 1,
  'eng-manager': 3,
  'eng-a': 5,
  'eng-b': 7,
  'eng-c': 9,
  'research-a': 0,
  'research-b': 2,
  'qa-agent': 4,
}

// ------------------------------------------------------------------ walkable graph

/**
 * Polylines that are known to be clear of furniture and walls. Consecutive points are
 * edges; identical points in different lines are the same node.
 */
const LINES: XZ[][] = [
  // North corridor: between the glass rooms / lounge divider and the manager desks.
  [[-14, -4.3], [-12.3, -4.3], [DOOR_X, -4.3], [-5, -4.3], [-0.6, -4.3], [8.2, -4.3], [10.2, -4.3]],
  // Work row: between the manager desks and the employee desks (where reports happen).
  [[-13.95, -1.4], [-11.2, -1.4], [-8.8, -1.4], [-5, -1.4], [-0.6, -1.4], [2.8, -1.4], [5.2, -1.4], [8.15, -1.4]],
  // South corridor: behind the employee chairs.
  [[-13.8, 2.9], [-12, 3.4], [-11.2, 3.4], [-8.8, 3.4], [-5, 3.4], [-0.6, 3.4], [2.8, 3.4], [5.2, 3.4], [8, 3.2]],
  // Aisles.
  [[-14, -4.3], [-13.95, -1.4], [-13.8, 2.9]],
  [[-5, -4.3], [-5, -1.4], [-5, 3.4]],
  [[-0.6, -4.3], [-0.6, -1.4], [-0.6, 3.4]],
  [[8.2, -4.3], [8.15, -1.4], [8, 3.2]],
  // Gaps between neighbouring desks.
  [[-11.2, 3.4], [-11.2, -1.4]],
  [[-8.8, 3.4], [-8.8, -1.4]],
  [[2.8, 3.4], [2.8, -1.4]],
  [[5.2, 3.4], [5.2, -1.4]],
]

const keyOf = ([x, z]: XZ) => `${x.toFixed(2)},${z.toFixed(2)}`
const dist = (a: XZ, b: XZ) => Math.hypot(a[0] - b[0], a[1] - b[1])

type Graph = Map<string, { at: XZ; edges: Map<string, number> }>

function link(g: Graph, a: XZ, b: XZ) {
  for (const p of [a, b]) if (!g.has(keyOf(p))) g.set(keyOf(p), { at: p, edges: new Map() })
  const d = dist(a, b)
  g.get(keyOf(a))!.edges.set(keyOf(b), d)
  g.get(keyOf(b))!.edges.set(keyOf(a), d)
}

const GRAPH: Graph = new Map()
for (const line of LINES) for (let i = 0; i < line.length - 1; i++) link(GRAPH, line[i], line[i + 1])

/** Every corridor edge, for debug drawing. */
export const NAV_SEGMENTS: [XZ, XZ][] = LINES.flatMap((l) => l.slice(0, -1).map((p, i) => [p, l[i + 1]] as [XZ, XZ]))

function closestOnSegment(p: XZ, a: XZ, b: XZ): XZ {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)))
  return [a[0] + dx * t, a[1] + dz * t]
}

/** Copy of the graph with `points` spliced into whichever corridor edge they lie on. */
function withEntries(points: XZ[]): Graph {
  const g: Graph = new Map([...GRAPH].map(([k, v]) => [k, { at: v.at, edges: new Map(v.edges) }]))
  for (const p of points) {
    if (g.has(keyOf(p))) continue
    let best: { a: XZ; b: XZ; d: number } | null = null
    for (const [a, b] of NAV_SEGMENTS) {
      const d = dist(p, closestOnSegment(p, a, b))
      if (!best || d < best.d) best = { a, b, d }
    }
    if (!best || best.d > 0.25) throw new Error(`Entry ${keyOf(p)} is not on the walkable graph`)
    link(g, p, best.a)
    link(g, p, best.b)
  }
  return g
}

/** Shortest corridor route between two entry points (inclusive). */
function shortest(from: XZ, to: XZ): XZ[] {
  if (keyOf(from) === keyOf(to)) return [from]
  const g = withEntries([from, to])
  const start = keyOf(from)
  const goal = keyOf(to)
  const best = new Map<string, number>([[start, 0]])
  const prev = new Map<string, string>()
  const open = new Set([start])
  while (open.size) {
    let cur = ''
    for (const k of open) if (!cur || best.get(k)! < best.get(cur)!) cur = k
    open.delete(cur)
    if (cur === goal) break
    for (const [next, w] of g.get(cur)!.edges) {
      const d = best.get(cur)! + w
      if (d < (best.get(next) ?? Infinity)) {
        best.set(next, d)
        prev.set(next, cur)
        open.add(next)
      }
    }
  }
  const path: XZ[] = []
  for (let k: string | undefined = goal; k; k = prev.get(k)) path.unshift(g.get(k)!.at)
  return path
}

/** Drop repeated points and immediate back-tracks (A → B → A) where two spurs share a stem. */
export function simplifyRoute<P extends XZ>(points: P[]): P[] {
  const pts = [...points]
  const same = (a: XZ, b: XZ) => dist(a, b) < 0.05
  for (let i = 1; i < pts.length; i++) {
    if (same(pts[i], pts[i - 1])) {
      pts.splice(i--, 1)
    } else if (i + 1 < pts.length && same(pts[i - 1], pts[i + 1])) {
      pts.splice(i, 2)
      i = Math.max(0, i - 2)
    }
  }
  return pts
}

// ------------------------------------------------------------------ places

export type Place = {
  /** Identity: two statuses with the same key mean "stay where you are". */
  key: string
  /** Point on the corridor graph where this place's spur starts. */
  entry: XZ
  /** Spur from `entry` to `position` (exclusive). */
  via: XZ[]
  position: XZ
  rotationY: number
  pose: 'sit' | 'stand'
  /** Places in the same room connect directly, without the corridor. */
  room?: string
}

/** A walk between two places: corridor route plus both spurs. */
export function routeBetween(from: Place, to: Place): XZ[] {
  if (from.key === to.key) return [from.position]
  if (from.room && from.room === to.room) return [from.position, to.position]
  return simplifyRoute([
    from.position,
    ...[...from.via].reverse(),
    ...shortest(from.entry, to.entry),
    ...to.via,
    to.position,
  ])
}

export const routeLength = (route: XZ[]) => route.slice(1).reduce((sum, p, i) => sum + dist(route[i], p), 0)

const DIRECTOR_DESK = 'director-desk'

function homePlace(agent: Agent): Place {
  const seat = HOME_SEATS[agent.id]
  const { x, z } = seat.position
  const base = { key: `home:${agent.id}`, position: [x, z] as XZ, rotationY: seat.rotationY, pose: 'sit' as const }
  if (agent.level >= 3) {
    return { ...base, entry: [-12.3, -4.3], via: [[-12.3, -7.1], [-12.4, z]], room: DIRECTOR_DESK }
  }
  // Approach the chair from its side, coming off the corridor behind it.
  const ax = x + (agent.level === 2 ? 0.6 : 0.55)
  const corridorZ = agent.level === 2 ? -4.3 : 3.4
  return { ...base, entry: [ax, corridorZ], via: [[ax, z]] }
}

function meetingPlace(agent: Agent, agents: Agent[]): Place {
  const fallback = 5 + (agents.findIndex((a) => a.id === agent.id) % 5)
  const index = MEETING_SEAT_OF[agent.id] ?? fallback
  const seat = MEETING_SEATS[index]
  const sx = seat.position.x
  const sz = seat.position.z
  const via: XZ[] = [[DOOR_X, -6.9]]
  if (index === 11) via.push([-9.25, -8.9])
  else if (index === 10) via.push([-1.55, -7.4], [-1.55, sz])
  else if (index % 2 === 1) via.push([sx + 0.55, -7.35], [sx + 0.55, sz])
  else via.push([-1.55, -7.4], [-1.55, -11.75], [sx + 0.55, -11.75], [sx + 0.55, sz])
  return { key: `meeting:${index}`, entry: [DOOR_X, -4.3], via, position: [sx, sz], rotationY: seat.rotationY, pose: 'sit' }
}

/** Visitor chairs facing the Director's desk, one per manager. */
const GUEST_CHAIRS_X = [-14.55, -13.45]

function reportPlace(agent: Agent, agents: Agent[]): Place {
  if (agent.level >= 3) {
    // The Director reports to the Owner from her desk: she stands up behind it.
    const home = homePlace(agent)
    return { ...home, key: 'report:director', position: [home.position[0], -10.85], rotationY: 0, pose: 'stand' }
  }
  const manager = agents.find((a) => a.id === agent.managerId)
  if (!manager) return homePlace(agent)
  if (agent.level === 2) {
    const peers = directReports(agents, manager.id).map((a) => a.id)
    const gx = GUEST_CHAIRS_X[Math.max(0, peers.indexOf(agent.id)) % GUEST_CHAIRS_X.length]
    return {
      key: `report:${agent.id}`,
      entry: [-12.3, -4.3],
      via: [[-12.3, -7.1], [gx, -7.35]],
      position: [gx, -8.05],
      rotationY: Math.PI,
      pose: 'sit',
    }
  }
  // Employees stand in front of their manager's desk, side by side.
  const team = directReports(agents, manager.id).sort((a, b) => HOME_SEATS[a.id].position.x - HOME_SEATS[b.id].position.x)
  const i = Math.max(0, team.findIndex((a) => a.id === agent.id))
  const x = HOME_SEATS[manager.id].position.x + (i - (team.length - 1) / 2) * 0.75
  return { key: `report:${agent.id}`, entry: [x, -1.4], via: [], position: [x, -1.4], rotationY: Math.PI, pose: 'stand' }
}

const LOUNGE: XZ[] = [
  [10.2, -6.4],
  [7.2, -7.9],
]
const COFFEE: XZ[] = [
  [12.6, -5.4],
  [13.5, -7.0],
]

/** Everyone has a favourite break spot: sofas, armchairs, the coffee bar or the window. */
const BREAK_SPOTS: Record<string, Omit<Place, 'key'>> = {
  'eng-a': { entry: [10.2, -4.3], via: [...LOUNGE, [4.15, -7.85]], position: [4.15, -7.05], rotationY: Math.PI, pose: 'sit' },
  'eng-b': { entry: [10.2, -4.3], via: [...LOUNGE, [6.25, -7.85]], position: [6.25, -7.05], rotationY: Math.PI, pose: 'sit' },
  'eng-c': { entry: [10.2, -4.3], via: [...LOUNGE, [7.45, -8.3]], position: [8.22, -8.3], rotationY: -Math.PI / 2, pose: 'sit' },
  'research-a': { entry: [10.2, -4.3], via: [...LOUNGE, [7.45, -9.8]], position: [8.22, -9.8], rotationY: -Math.PI / 2, pose: 'sit' },
  'research-b': {
    entry: [10.2, -4.3],
    via: [...LOUNGE, [3.7, -8.2], [3.7, -8.84]],
    position: [2.83, -8.84],
    rotationY: Math.PI / 2,
    pose: 'sit',
  },
  'qa-agent': {
    entry: [10.2, -4.3],
    via: [...LOUNGE, [3.7, -8.2], [3.7, -9.76]],
    position: [2.83, -9.76],
    rotationY: Math.PI / 2,
    pose: 'sit',
  },
  'eng-manager': { entry: [10.2, -4.3], via: [...COFFEE], position: [13.5, -9.6], rotationY: Math.PI / 2, pose: 'stand' },
  'research-manager': { entry: [10.2, -4.3], via: [COFFEE[0]], position: [13.5, -7.5], rotationY: Math.PI / 2, pose: 'stand' },
  // The Director takes her breaks at her own office window, looking out over the city.
  director: {
    entry: [-12.3, -4.3],
    via: [[-12.3, -7.1], [-12.4, -10.85], [-16, -11.6]],
    position: [-16.8, -12.3],
    rotationY: Math.PI,
    pose: 'stand',
    room: DIRECTOR_DESK,
  },
}

function breakPlace(agent: Agent): Place {
  const spot = BREAK_SPOTS[agent.id]
  return spot ? { key: `break:${agent.id}`, ...spot } : homePlace(agent)
}

/** Where an agent belongs while in a given status. */
export function placeFor(agent: Agent, status: AgentStatus, agents: Agent[]): Place {
  switch (status) {
    case 'meeting':
      return meetingPlace(agent, agents)
    case 'reporting':
      return reportPlace(agent, agents)
    case 'break':
      return breakPlace(agent)
    default:
      return homePlace(agent)
  }
}

/** Seconds (at speed 1) for an agent to get from one status's place to another's, posture included. */
export function travelSeconds(agent: Agent, from: AgentStatus, to: AgentStatus, agents: Agent[]) {
  const a = placeFor(agent, from, agents)
  const b = placeFor(agent, to, agents)
  if (a.key === b.key) return 0
  const posture = (a.pose === 'sit' ? POSTURE_SECONDS : 0) + (b.pose === 'sit' ? POSTURE_SECONDS : 0)
  return routeLength(routeBetween(a, b)) / WALK_SPEED + posture
}
