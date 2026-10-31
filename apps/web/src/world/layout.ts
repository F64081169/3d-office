export { MEETING_DOOR, MEETING_SEATS, MEETING_TABLE } from '@office/shared'

/**
 * One-floor penthouse office, metres. +x = east, -z = north (the main window wall).
 *
 *   z=-13 ┌──────────── north windows (city + mountains) ─────────────┐
 *         │ Director │ Meeting Room │      Lounge       │ Coffee Bar  │
 *   z=-6  ├──glass───┴────glass─────┘                   │             │
 *         │        Engineering pod         Research pod               │  east windows
 *   west  │        (mgr + 3 desks)        (mgr + 3 desks)              │
 *   (sea) ├──────────────────┬──────────────┬───┬───────────────────┤ z=5
 *         │ Reception lounge │ Elevator core│   │ Premium Bathroom   │
 *   z=13  └──────────────────┴──────────────┴───┴───────────────────┘
 */
export const FLOOR = { minX: -20, maxX: 20, minZ: -13, maxZ: 13 }
export const FLOOR_W = FLOOR.maxX - FLOOR.minX
export const FLOOR_D = FLOOR.maxZ - FLOOR.minZ
export const CEILING_H = 3.4

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number }

export const ZONES = {
  director: { minX: -20, maxX: -10.5, minZ: -13, maxZ: -6 },
  meeting: { minX: -10.5, maxX: -1, minZ: -13, maxZ: -6 },
  lounge: { minX: 0, maxX: 11, minZ: -13, maxZ: -5 },
  coffee: { minX: 11.5, maxX: 20, minZ: -13, maxZ: -4 },
  workspace: { minX: -15, maxX: 9, minZ: -4.5, maxZ: 4.5 },
  reception: { minX: -20, maxX: -5, minZ: 5, maxZ: 13 },
  elevators: { minX: -5, maxX: 5, minZ: 8, maxZ: 13 },
  bathroom: { minX: 8, maxX: 20, minZ: 5, maxZ: 13 },
} satisfies Record<string, Rect>


export type CameraPreset = {
  id: string
  label: string
  position: [number, number, number]
  target: [number, number, number]
}

export const OVERVIEW: CameraPreset = {
  id: 'overview',
  label: 'Overview',
  position: [15, 24, 31],
  target: [-3.5, 0, 0.5],
}

export const CAMERA_PRESETS: CameraPreset[] = [
  OVERVIEW,
  { id: 'workspace', label: 'Workspace', position: [6.6, 4.4, 7.4], target: [-3.5, 0.6, -0.3] },
  { id: 'director', label: 'Director', position: [-11.4, 2.1, -6.6], target: [-15.5, 0.9, -10.5] },
  { id: 'meeting', label: 'Meeting Room', position: [-2.4, 2.9, -12.2], target: [-8.2, 0.7, -8.4] },
  { id: 'lounge', label: 'Lounge', position: [9.5, 2.0, -3.6], target: [5, 0.7, -9.5] },
  { id: 'coffee', label: 'Coffee Bar', position: [12.2, 1.9, -3.2], target: [17, 1.0, -9.5] },
  { id: 'bathroom', label: 'Bathroom', position: [18.9, 1.85, 9.7], target: [12.8, 1.05, 5.9] },
  { id: 'view', label: 'City View', position: [6.2, 1.7, -6.0], target: [1.5, 1.2, -40] },
]

/** Where the intro fly-in starts: high above the city, looking at the tower. */
export const INTRO_START: [number, number, number] = [150, 110, 260]
