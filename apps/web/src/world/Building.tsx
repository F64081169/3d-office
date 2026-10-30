import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { floorWoodFor, MAT } from '../assets/materials'
import { Box, GEO, StaticInstances, worldBox, type InstanceItem, type V3 } from '../assets/primitives'
import { facadeTexture } from '../assets/textures'
import { registerOccluder } from '../agents/tags'
import { CEILING_H, FLOOR, FLOOR_D, FLOOR_W, ZONES } from './layout'

const H = CEILING_H
const CX = (FLOOR.minX + FLOOR.maxX) / 2
const CZ = (FLOOR.minZ + FLOOR.maxZ) / 2

type Axis = 'x' | 'z'

/**
 * A straight run of glazing. `axis` is the direction the wall runs along;
 * `at` is its fixed coordinate on the other axis. `gaps` are door openings.
 */
export function GlassWall({
  axis,
  at,
  from,
  to,
  spacing = 1.6,
  exterior = false,
  gaps = [],
}: {
  axis: Axis
  at: number
  from: number
  to: number
  spacing?: number
  exterior?: boolean
  gaps?: [number, number][]
}) {
  const segments = useMemo(() => {
    const segs: [number, number][] = []
    let start = from
    for (const [g0, g1] of [...gaps].sort((a, b) => a[0] - b[0])) {
      if (g0 > start) segs.push([start, g0])
      start = g1
    }
    if (to > start) segs.push([start, to])
    return segs
  }, [from, to, gaps])

  const mullions = useMemo(() => {
    const items: InstanceItem[] = []
    for (const [a, b] of segments) {
      const n = Math.max(1, Math.round((b - a) / spacing))
      for (let i = 0; i <= n; i++) items.push({ position: placeAlong(axis, at, a + ((b - a) * i) / n, H / 2) })
    }
    return items
  }, [segments, spacing, axis, at])

  const place = (along: number, y: number) => placeAlong(axis, at, along, y)
  const size = (len: number, h: number, thick: number): V3 => (axis === 'x' ? [len, h, thick] : [thick, h, len])

  const frameMat = exterior ? MAT.aluminium : MAT.blackMetal
  const mullionGeo = exterior ? GEO_MULLION_EXT : GEO_MULLION_INT
  return (
    <group>
      <StaticInstances
        geometry={axis === 'x' ? mullionGeo.x : mullionGeo.z}
        material={frameMat}
        items={mullions}
        receive={false}
      />
      {segments.map(([a, b]) => {
        const len = b - a
        const mid = (a + b) / 2
        return (
          <group key={`${a}:${b}`}>
            <Box size={size(len, H - 0.1, 0.02)} position={place(mid, H / 2)} material={MAT.glass} cast={false} receive={false} />
            <Box size={size(len, 0.08, exterior ? 0.16 : 0.06)} position={place(mid, 0.04)} material={frameMat} cast={false} />
            <Box size={size(len, 0.06, exterior ? 0.16 : 0.06)} position={place(mid, H - 0.03)} material={frameMat} cast={false} />
            {!exterior && (
              <Box size={size(len, 0.32, 0.025)} position={place(mid, 1.25)} material={MAT.frosted} cast={false} receive={false} />
            )}
          </group>
        )
      })}
    </group>
  )
}

const placeAlong = (axis: Axis, at: number, along: number, y: number): V3 =>
  axis === 'x' ? [along, y, at] : [at, y, along]

const GEO_MULLION_EXT = {
  x: new THREE.BoxGeometry(0.07, H, 0.16),
  z: new THREE.BoxGeometry(0.16, H, 0.07),
}
const GEO_MULLION_INT = {
  x: new THREE.BoxGeometry(0.04, H, 0.06),
  z: new THREE.BoxGeometry(0.06, H, 0.04),
}

/** Solid wall with world-scaled texture UVs. */
export function SolidWall({
  x0,
  z0,
  x1,
  z1,
  thickness = 0.2,
  height = H,
  material = MAT.plaster,
  tile = 2.4,
}: {
  x0: number
  z0: number
  x1: number
  z1: number
  thickness?: number
  height?: number
  material?: THREE.Material
  tile?: number
}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0)
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0)
  const w = alongX ? len : thickness
  const d = alongX ? thickness : len
  return (
    <mesh
      ref={registerOccluder}
      geometry={worldBox(w, height, d, tile)}
      material={material}
      position={[(x0 + x1) / 2, height / 2, (z0 + z1) / 2]}
      castShadow
      receiveShadow
    />
  )
}

/** Hides ceiling-mounted items whenever the camera is above the roof line (dollhouse view). */
function CeilingGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame(({ camera }) => {
    ref.current.visible = camera.position.y < H - 0.05
  })
  return <group ref={ref}>{children}</group>
}

function Ceiling() {
  const slotLights = useMemo(() => {
    const items: InstanceItem[] = []
    for (let x = -18; x <= 8; x += 3.2) for (const z of [-11, -8, -3, 0, 3, 7, 10]) items.push({ position: [x, H - 0.01, z] })
    return items
  }, [])
  const baffles = useMemo(() => {
    const items: InstanceItem[] = []
    for (let x = 0.4; x < FLOOR.maxX - 0.2; x += 0.22) items.push({ position: [x, H - 0.16, -9] })
    return items
  }, [])
  return (
    <CeilingGroup>
      <mesh
        geometry={GEO.plane}
        material={MAT.ceiling}
        position={[CX, H, CZ]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[FLOOR_W, FLOOR_D, 1]}
      />
      <StaticInstances geometry={SLOT_GEO} material={MAT.lightStrip} items={slotLights} cast={false} receive={false} />
      <StaticInstances geometry={BAFFLE_GEO} material={MAT.oak} items={baffles} cast={false} receive={false} />
    </CeilingGroup>
  )
}

const SLOT_GEO = new THREE.BoxGeometry(2.4, 0.02, 0.07)
const BAFFLE_GEO = new THREE.BoxGeometry(0.05, 0.3, 8)

export function Building() {
  const floorMat = useMemo(() => floorWoodFor(FLOOR_W, FLOOR_D), [])
  const towerMat = useMemo(() => {
    const t = facadeTexture().clone()
    t.repeat.set(10, 26)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: t, color: '#b9c6d1', roughness: 0.35, metalness: 0.4 })
  }, [])
  const bath = ZONES.bathroom
  const core = ZONES.elevators
  return (
    <group>
      {/* Floor & structure */}
      <mesh
        geometry={GEO.plane}
        material={floorMat}
        position={[CX, 0, CZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[FLOOR_W, FLOOR_D, 1]}
        receiveShadow
      />
      <Box size={[FLOOR_W + 0.6, 0.5, FLOOR_D + 0.6]} position={[CX, -0.26, CZ]} material={MAT.charcoal} cast={false} />
      <mesh position={[CX, -80.5, CZ]} scale={[FLOOR_W + 0.4, 160, FLOOR_D + 0.4]} geometry={GEO.box} material={towerMat} />
      {/* Roof edge fascia: crisp outline of the building from above */}
      {(
        [
          [[FLOOR_W + 0.6, 0.3, 0.3], [CX, H + 0.15, FLOOR.minZ - 0.15]],
          [[FLOOR_W + 0.6, 0.3, 0.3], [CX, H + 0.15, FLOOR.maxZ + 0.15]],
          [[0.3, 0.3, FLOOR_D], [FLOOR.minX - 0.15, H + 0.15, CZ]],
          [[0.3, 0.3, FLOOR_D], [FLOOR.maxX + 0.15, H + 0.15, CZ]],
        ] as [V3, V3][]
      ).map(([size, pos], i) => (
        <Box key={i} size={size} position={pos} material={MAT.charcoal} cast={false} />
      ))}

      {/* Exterior glazing */}
      <GlassWall exterior axis="x" at={FLOOR.minZ} from={FLOOR.minX} to={FLOOR.maxX} />
      <GlassWall exterior axis="z" at={FLOOR.minX} from={FLOOR.minZ} to={FLOOR.maxZ} />
      <GlassWall exterior axis="z" at={FLOOR.maxX} from={FLOOR.minZ} to={bath.minZ} />
      <GlassWall exterior axis="x" at={FLOOR.maxZ} from={FLOOR.minX} to={core.minX} />
      <GlassWall exterior axis="x" at={FLOOR.maxZ} from={core.maxX} to={bath.minX} />

      {/* Bathroom stone envelope (entrance gap on the west wall) */}
      <SolidWall x0={bath.minX} z0={bath.minZ} x1={bath.maxX} z1={bath.minZ} material={MAT.travertine} />
      <SolidWall x0={bath.maxX} z0={bath.minZ} x1={bath.maxX} z1={bath.maxZ} material={MAT.travertine} />
      <SolidWall x0={bath.minX} z0={bath.maxZ} x1={bath.maxX} z1={bath.maxZ} material={MAT.travertine} />
      <SolidWall x0={bath.minX} z0={bath.minZ} x1={bath.minX} z1={5.7} material={MAT.travertine} />
      <SolidWall x0={bath.minX} z0={7.2} x1={bath.minX} z1={bath.maxZ} material={MAT.travertine} />

      <Ceiling />
    </group>
  )
}
