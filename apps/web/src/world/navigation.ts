import { HOME_SEATS, SEED_AGENTS } from '@office/shared'

/**
 * Walkable network for anything that moves (the office cat now, agents in Phase 4).
 * Corridor nodes are joined by edges that stay clear of furniture and walls; each
 * destination ("spot") hangs off one node through a short `via` spur.
 *
 *   north corridor  z = -4.3   (between the glass rooms / lounge divider and the manager desks)
 *   south corridor  z ≈  3.3   (behind the employee chairs)
 *   aisles          x = -14, -5, -0.6, 8.2
 */
export type XZ = [number, number]

export const NAV_NODES: Record<string, XZ> = {
  nW: [-14.0, -4.3],
  nDir: [-12.3, -4.3],
  nMid: [-5.0, -4.3],
  nMid2: [-0.6, -4.3],
  nRes: [8.2, -4.3],
  nE: [10.2, -4.3],
  sW: [-13.8, 2.9],
  sA: [-12.0, 3.4],
  sMid: [-5.0, 3.4],
  sMid2: [-0.6, 3.4],
  sE: [8.0, 3.2],
}

export const NAV_EDGES: [string, string][] = [
  ['nW', 'nDir'],
  ['nDir', 'nMid'],
  ['nMid', 'nMid2'],
  ['nMid2', 'nRes'],
  ['nRes', 'nE'],
  ['sW', 'sA'],
  ['sA', 'sMid'],
  ['sMid', 'sMid2'],
  ['sMid2', 'sE'],
  ['nW', 'sW'],
  ['nMid', 'sMid'],
  ['nMid2', 'sMid2'],
  ['nRes', 'sE'],
]

const ADJ = new Map<string, string[]>()
for (const [a, b] of NAV_EDGES) {
  ADJ.set(a, [...(ADJ.get(a) ?? []), b])
  ADJ.set(b, [...(ADJ.get(b) ?? []), a])
}

/** Breadth-first route between two corridor nodes (inclusive). */
export function route(from: string, to: string): string[] {
  const prev = new Map<string, string | null>([[from, null]])
  const queue = [from]
  while (queue.length) {
    const n = queue.shift()!
    if (n === to) break
    for (const m of ADJ.get(n) ?? []) {
      if (!prev.has(m)) {
        prev.set(m, n)
        queue.push(m)
      }
    }
  }
  const path: string[] = []
  for (let n: string | null | undefined = to; n; n = prev.get(n)) path.unshift(n)
  return path[0] === from ? path : [from]
}

export type SpotKind = 'nap' | 'watch' | 'beg' | 'visit'

export type Spot = {
  id: string
  label: string
  kind: SpotKind
  node: string
  /** Waypoints from `node` to the spot (exclusive of both). */
  via: XZ[]
  position: [number, number, number]
  /** Facing when settled; omitted = face `lookAt`. */
  rotationY?: number
  lookAt?: XZ
  /** Relative chance of being picked. */
  weight: number
}

const nearestNode = (x: number, prefix: 'n' | 's') =>
  Object.entries(NAV_NODES)
    .filter(([id]) => id.startsWith(prefix))
    .sort((a, b) => Math.abs(a[1][0] - x) - Math.abs(b[1][0] - x))[0][0]

/** One "visit" spot beside every employee and manager desk. */
const visitSpots: Spot[] = SEED_AGENTS.filter((a) => a.level < 3).map((a) => {
  const seat = HOME_SEATS[a.id].position
  const employee = a.level === 1
  const x = seat.x + (employee ? 0.8 : 1.35)
  const corridorZ = employee ? 3.4 : -4.3
  return {
    id: `visit-${a.id}`,
    label: `${a.name}'s desk`,
    kind: 'visit',
    node: nearestNode(x, employee ? 's' : 'n'),
    via: [[x, corridorZ]],
    position: [x, 0, employee ? 2.75 : -3.5],
    lookAt: [seat.x, seat.z],
    weight: 1,
  }
})

export const SPOTS: Spot[] = [
  {
    id: 'lounge-sofa',
    label: 'the lounge sofa',
    kind: 'nap',
    node: 'nE',
    via: [
      [10.2, -6.4],
      [7.2, -7.9],
      [4.6, -7.85],
    ],
    position: [4.6, 0.46, -7.0],
    rotationY: Math.PI / 2,
    weight: 3,
  },
  {
    id: 'north-window',
    label: 'the north window',
    kind: 'watch',
    node: 'nE',
    via: [
      [10.2, -6.4],
      [9.6, -11.6],
    ],
    position: [8.4, 0, -12.35],
    rotationY: Math.PI,
    weight: 2,
  },
  {
    id: 'coffee',
    label: 'the coffee bar',
    kind: 'beg',
    node: 'nE',
    via: [[12.6, -5.4]],
    position: [13.4, 0, -8.6],
    rotationY: Math.PI / 2,
    weight: 2,
  },
  {
    id: 'west-window',
    label: 'a sunny spot by the window',
    kind: 'nap',
    node: 'sW',
    via: [],
    position: [-18.9, 0, 2.6],
    rotationY: -Math.PI / 2,
    weight: 3,
  },
  {
    id: 'reception',
    label: 'the reception rug',
    kind: 'nap',
    node: 'sA',
    via: [],
    position: [-12.6, 0, 7.9],
    rotationY: 0.4,
    weight: 2,
  },
  {
    id: 'visit-director',
    label: "Aria's office",
    kind: 'visit',
    node: 'nDir',
    via: [[-12.3, -7.1]],
    position: [-16.4, 0, -7.4],
    lookAt: [HOME_SEATS.director.position.x, HOME_SEATS.director.position.z],
    weight: 2,
  },
  ...visitSpots,
]
