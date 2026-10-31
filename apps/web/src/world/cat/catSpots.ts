import { HOME_SEATS, SEED_AGENTS, type Place, type XZ } from '@office/shared'

/** Where Mochi likes to be. Spots are ordinary places on the shared walkable graph. */
export type SpotKind = 'nap' | 'watch' | 'beg' | 'visit'

export type CatSpot = Place & {
  id: string
  label: string
  kind: SpotKind
  /** Relative chance of being picked. */
  weight: number
  /** Height of the resting surface (the lounge sofa); Mochi jumps up to it. */
  height?: number
}

const facing = ([x, z]: XZ, [tx, tz]: XZ) => Math.atan2(tx - x, tz - z)

const spot = (s: Omit<CatSpot, 'key' | 'pose'>): CatSpot => ({ ...s, key: `cat:${s.id}`, pose: 'stand' })

/** One "visit" spot beside every employee and manager desk, looking at its owner. */
const visits: CatSpot[] = SEED_AGENTS.filter((a) => a.level < 3).map((a) => {
  const seat = HOME_SEATS[a.id].position
  const employee = a.level === 1
  const x = seat.x + (employee ? 0.8 : 1.35)
  const position: XZ = [x, employee ? 2.75 : -3.5]
  return spot({
    id: `visit-${a.id}`,
    label: `${a.name}'s desk`,
    kind: 'visit',
    entry: [x, employee ? 3.4 : -4.3],
    via: [],
    position,
    rotationY: facing(position, [seat.x, seat.z]),
    weight: 1,
  })
})

const director = HOME_SEATS.director.position

export const CAT_SPOTS: CatSpot[] = [
  spot({
    id: 'lounge-sofa',
    label: 'the lounge sofa',
    kind: 'nap',
    entry: [10.2, -4.3],
    via: [
      [10.2, -6.4],
      [7.2, -7.9],
      [5.2, -7.85],
    ],
    position: [5.2, -7.0],
    height: 0.46,
    rotationY: Math.PI / 2,
    weight: 3,
  }),
  spot({
    id: 'north-window',
    label: 'the north window',
    kind: 'watch',
    entry: [10.2, -4.3],
    via: [
      [10.2, -6.4],
      [9.6, -11.6],
    ],
    position: [8.4, -12.35],
    rotationY: Math.PI,
    weight: 2,
  }),
  spot({
    id: 'coffee',
    label: 'the coffee bar',
    kind: 'beg',
    entry: [10.2, -4.3],
    via: [[12.6, -5.4]],
    position: [13.4, -8.6],
    rotationY: Math.PI / 2,
    weight: 2,
  }),
  spot({
    id: 'west-window',
    label: 'a sunny spot by the window',
    kind: 'nap',
    entry: [-13.8, 2.9],
    via: [],
    position: [-18.9, 2.6],
    rotationY: -Math.PI / 2,
    weight: 3,
  }),
  spot({
    id: 'reception',
    label: 'the reception rug',
    kind: 'nap',
    entry: [-12, 3.4],
    via: [],
    position: [-12.6, 7.9],
    rotationY: 0.4,
    weight: 2,
  }),
  spot({
    id: 'visit-director',
    label: "Aria's office",
    kind: 'visit',
    entry: [-12.3, -4.3],
    via: [[-12.3, -7.1]],
    position: [-16.4, -7.4],
    rotationY: facing([-16.4, -7.4], [director.x, director.z]),
    weight: 2,
  }),
  ...visits,
]
