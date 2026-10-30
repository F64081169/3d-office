import type { Agent, Vec3 } from './types'

/** The human Owner. Not an Agent: the Owner only talks to the Director. */
export const OWNER_ID = 'owner'
export const OWNER = { id: OWNER_ID, name: 'You', role: 'Owner' } as const
export const DIRECTOR_ID = 'director'

export type Seat = {
  position: Vec3
  /** Yaw in radians. 0 = facing +z (south), Math.PI = facing -z (north, toward the windows). */
  rotationY: number
}

const NORTH = Math.PI
const SOUTH = 0

/**
 * Each agent's assigned desk seat. The 3D office places desks and chairs from these,
 * so moving a seat here moves the workstation too.
 */
export const HOME_SEATS: Record<string, Seat> = {
  director: { position: { x: -14, y: 0, z: -10.3 }, rotationY: SOUTH },

  'eng-manager': { position: { x: -10, y: 0, z: -3.3 }, rotationY: SOUTH },
  'eng-a': { position: { x: -12.4, y: 0, z: 2.0 }, rotationY: NORTH },
  'eng-b': { position: { x: -10, y: 0, z: 2.0 }, rotationY: NORTH },
  'eng-c': { position: { x: -7.6, y: 0, z: 2.0 }, rotationY: NORTH },

  'research-manager': { position: { x: 4, y: 0, z: -3.3 }, rotationY: SOUTH },
  'research-a': { position: { x: 1.6, y: 0, z: 2.0 }, rotationY: NORTH },
  'research-b': { position: { x: 4, y: 0, z: 2.0 }, rotationY: NORTH },
  'qa-agent': { position: { x: 6.4, y: 0, z: 2.0 }, rotationY: NORTH },
}

const seat = (id: string): Vec3 => ({ ...HOME_SEATS[id].position })

/** Fixed MVP org: Owner → Director → 2 Managers → 6 Employees. */
export const SEED_AGENTS: Agent[] = [
  {
    id: 'director',
    name: 'Aria',
    role: 'Director',
    department: 'Executive',
    level: 3,
    skills: ['Planning', 'Delegation', 'Review', 'Synthesis'],
    status: 'idle',
    performance: 88,
    coins: 1200,
    position: seat('director'),
  },
  {
    id: 'eng-manager',
    name: 'Marcus',
    role: 'Engineering Manager',
    department: 'Engineering',
    level: 2,
    managerId: 'director',
    skills: ['Task breakdown', 'Code review', 'Storage systems'],
    status: 'idle',
    performance: 82,
    coins: 800,
    position: seat('eng-manager'),
  },
  {
    id: 'eng-a',
    name: 'Alex',
    role: 'Senior Engineer',
    department: 'Engineering',
    level: 1,
    managerId: 'eng-manager',
    skills: ['Profiling', 'C++', 'I/O path'],
    status: 'idle',
    performance: 79,
    coins: 420,
    position: seat('eng-a'),
  },
  {
    id: 'eng-b',
    name: 'Priya',
    role: 'Backend Engineer',
    department: 'Engineering',
    level: 1,
    managerId: 'eng-manager',
    skills: ['Rust', 'Concurrency', 'Caching'],
    status: 'idle',
    performance: 76,
    coins: 360,
    position: seat('eng-b'),
  },
  {
    id: 'eng-c',
    name: 'Kenji',
    role: 'Systems Engineer',
    department: 'Engineering',
    level: 1,
    managerId: 'eng-manager',
    skills: ['Linux kernel', 'File systems', 'Tracing'],
    status: 'idle',
    performance: 74,
    coins: 310,
    position: seat('eng-c'),
  },
  {
    id: 'research-manager',
    name: 'Sofia',
    role: 'Research Manager',
    department: 'Research',
    level: 2,
    managerId: 'director',
    skills: ['Research planning', 'Literature review', 'Experiment design'],
    status: 'idle',
    performance: 84,
    coins: 780,
    position: seat('research-manager'),
  },
  {
    id: 'research-a',
    name: 'Leo',
    role: 'Research Scientist',
    department: 'Research',
    level: 1,
    managerId: 'research-manager',
    skills: ['Storage research', 'LSM trees', 'Papers'],
    status: 'idle',
    performance: 77,
    coins: 340,
    position: seat('research-a'),
  },
  {
    id: 'research-b',
    name: 'Mina',
    role: 'Research Analyst',
    department: 'Research',
    level: 1,
    managerId: 'research-manager',
    skills: ['Benchmark analysis', 'Data viz', 'Industry survey'],
    status: 'idle',
    performance: 73,
    coins: 290,
    position: seat('research-b'),
  },
  {
    id: 'qa-agent',
    name: 'Omar',
    role: 'QA Engineer',
    department: 'Research',
    level: 1,
    managerId: 'research-manager',
    skills: ['Test planning', 'fio benchmarks', 'Regression'],
    status: 'idle',
    performance: 75,
    coins: 300,
    position: seat('qa-agent'),
  },
]

export const directReports = (agents: Agent[], managerId: string) =>
  agents.filter((a) => a.managerId === managerId)
