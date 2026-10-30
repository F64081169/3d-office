import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { useAssets } from '../../assets/AssetProvider'
import { MAT } from '../../assets/materials'
import { Box, cached, Cylinder, GEO, mergeParts, roundedBox } from '../../assets/primitives'
import { darkStoneTexture, glowTexture, signTexture } from '../../assets/textures'
import { CEILING_H, ZONES } from '../layout'

const B = ZONES.bathroom
const WALL_N = B.minZ + 0.1 // interior face of the north wall
const WALL_S = B.maxZ - 0.1
const WALL_E = B.maxX - 0.1
const VANITY = { x: 14.2, length: 7.0, depth: 0.58 }
const STALL_FRONT_Z = 10.4
const STALL_XS = [11.0, 13.95, 16.9, WALL_E]

const glowMat = (color: string, opacity: number) =>
  new THREE.MeshBasicMaterial({
    map: glowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })

const COVE_GLOW = glowMat('#ffbf7a', 0.55)
const MIRROR_HALO = glowMat('#ffd29a', 0.6)

const bowlGeometry = new THREE.CylinderGeometry(0.21, 0.14, 0.13, 36, 1, true)
const ceramicDouble = MAT.ceramic.clone()
ceramicDouble.side = THREE.DoubleSide

function VesselSink({ x }: { x: number }) {
  const z = WALL_N + VANITY.depth / 2 + 0.03
  const top = 0.88
  return (
    <group position={[x, top, z]}>
      <mesh geometry={bowlGeometry} material={ceramicDouble} position={[0, 0.065, 0]} castShadow />
      <Cylinder r={0.14} h={0.01} position={[0, 0.01, 0]} material={MAT.ceramic} cast={false} />
      <Cylinder r={0.02} h={0.004} position={[0, 0.017, 0]} material={MAT.blackMetal} cast={false} />
      {/* Wall-side brass faucet arcing over the bowl */}
      <Cylinder r={0.013} h={0.32} position={[0, 0.16, -0.24]} material={MAT.brass} />
      <Box size={[0.026, 0.026, 0.2]} position={[0, 0.31, -0.15]} material={MAT.brass} />
    </group>
  )
}

/** Wall-hung "smart" toilet: concealed cistern panel, elongated bowl, side control panel. */
const toiletGeometry = () =>
  cached('toilet', () => ({
    body: mergeParts([
      { geo: GEO.sphere, at: [0, 0.36, 0.3], scale: [0.2, 0.15, 0.3] },
      { geo: roundedBox(0.4, 0.16, 0.22, 0.06), at: [0, 0.38, 0.06] },
      { geo: roundedBox(0.4, 0.05, 0.56, 0.025), at: [0, 0.52, 0.28] },
      { geo: roundedBox(0.36, 0.035, 0.5, 0.02), at: [0, 0.56, 0.3] },
    ]),
    panel: mergeParts([{ geo: roundedBox(0.62, 1.05, 0.12, 0.02), at: [0, 0.525, 0] }]),
  }))

function SmartToilet({ x }: { x: number }) {
  const g = toiletGeometry()
  return (
    <group position={[x, 0, WALL_S - 0.06]} rotation-y={Math.PI}>
      <mesh geometry={g.panel} material={MAT.travertine} castShadow receiveShadow />
      <mesh geometry={g.body} material={MAT.ceramic} castShadow />
      <Box size={[0.2, 0.12, 0.012]} position={[0, 0.85, 0.066]} material={MAT.chrome} cast={false} />
      <Box size={[0.05, 0.03, 0.14]} position={[0.25, 0.52, 0.3]} material={MAT.white} cast={false} />
      <Box size={[0.02, 0.005, 0.02]} position={[0.25, 0.537, 0.33]} material={MAT.lightStrip} cast={false} />
    </group>
  )
}

function Stalls() {
  const stalls = STALL_XS.slice(0, -1).map((x0, i) => ({ x0, x1: STALL_XS[i + 1] }))
  const depth = WALL_S - STALL_FRONT_Z
  const h = 2.6
  return (
    <group>
      {STALL_XS.slice(0, -1).map((x) => (
        <Box key={x} size={[0.06, h, depth]} position={[x, h / 2, STALL_FRONT_Z + depth / 2]} material={MAT.walnut} />
      ))}
      {stalls.map(({ x0, x1 }, i) => {
        const w = x1 - x0
        const doorW = 0.85
        const doorX = x0 + 0.35 + doorW / 2
        const open = i === 0
        return (
          <group key={x0}>
            <Box size={[0.35, h, 0.05]} position={[x0 + 0.175, h / 2, STALL_FRONT_Z]} material={MAT.walnut} />
            <Box
              size={[w - 0.35 - doorW, h, 0.05]}
              position={[x0 + 0.35 + doorW + (w - 0.35 - doorW) / 2, h / 2, STALL_FRONT_Z]}
              material={MAT.walnut}
            />
            <group position={[doorX - doorW / 2, 0, STALL_FRONT_Z]} rotation-y={open ? -1.25 : 0}>
              <Box size={[doorW, h - 0.05, 0.04]} position={[doorW / 2, h / 2, 0]} material={MAT.walnut} />
              <Box size={[0.02, 0.22, 0.03]} position={[doorW - 0.08, 1.05, -0.03]} material={MAT.brass} cast={false} />
              <Box
                size={[0.05, 0.05, 0.01]}
                position={[doorW - 0.08, 1.25, -0.025]}
                material={open ? MAT.lightStrip : occupiedMat}
                cast={false}
              />
            </group>
            <SmartToilet x={(x0 + x1) / 2 + 0.25} />
          </group>
        )
      })}
      {/* Cove light along the top of the stall fronts */}
      <Box size={[WALL_E - STALL_XS[0], 0.02, 0.03]} position={[(WALL_E + STALL_XS[0]) / 2, h + 0.01, STALL_FRONT_Z - 0.02]} material={MAT.warmGlow} cast={false} />
    </group>
  )
}

const insideBathroom = (p: THREE.Vector3) =>
  p.x > B.minX && p.x < B.maxX && p.z > B.minZ && p.z < B.maxZ && p.y < CEILING_H

/**
 * A real planar reflection (extra render pass) only while the camera is inside the
 * bathroom; from anywhere else an env-mapped stand-in costs nothing.
 */
function Mirror({ width, height, position }: { width: number; height: number; position: [number, number, number] }) {
  const reflector = useMemo(
    () =>
      new Reflector(new THREE.PlaneGeometry(width, height), {
        textureWidth: 1024,
        textureHeight: Math.round((1024 * height) / width),
        color: 0xc9d1d3,
        clipBias: 0.003,
      }),
    [width, height],
  )
  useEffect(() => () => reflector.dispose(), [reflector])
  const standIn = useRef<THREE.Mesh>(null!)
  useFrame(({ camera }) => {
    const inside = insideBathroom(camera.position)
    reflector.visible = inside
    standIn.current.visible = !inside
  })
  return (
    <group position={position}>
      <Box size={[width + 0.04, height + 0.04, 0.02]} position={[0, 0, -0.012]} material={MAT.blackMetal} cast={false} />
      <primitive object={reflector} />
      <mesh ref={standIn} geometry={GEO.plane} scale={[width, height, 1]} material={MAT.mirror} />
    </group>
  )
}

const occupiedMat = new THREE.MeshBasicMaterial({ color: '#d96a5a', toneMapped: false })

export function Bathroom() {
  const { Plant } = useAssets()
  const floorMat = useMemo(() => {
    const t = darkStoneTexture().clone()
    t.repeat.set((B.maxX - B.minX) / 2.4, (B.maxZ - B.minZ) / 2.4)
    t.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.28, metalness: 0.05 })
  }, [])
  const vanityZ = WALL_N + VANITY.depth / 2
  return (
    <group>
      <mesh
        geometry={GEO.plane}
        material={floorMat}
        position={[(B.minX + B.maxX) / 2, 0.004, (B.minZ + B.maxZ) / 2]}
        rotation-x={-Math.PI / 2}
        scale={[B.maxX - B.minX - 0.2, B.maxZ - B.minZ - 0.2, 1]}
        receiveShadow
      />

      {/* Floating marble vanity with walnut drawer and under-cabinet cove light */}
      <Box size={[VANITY.length, 0.12, VANITY.depth]} position={[VANITY.x, 0.82, vanityZ]} material={MAT.marble} />
      <Box size={[VANITY.length - 0.4, 0.3, VANITY.depth - 0.08]} position={[VANITY.x, 0.61, vanityZ - 0.03]} material={MAT.walnut} />
      <Box size={[VANITY.length - 0.6, 0.012, 0.02]} position={[VANITY.x, 0.455, vanityZ + 0.2]} material={MAT.warmGlow} cast={false} />
      <mesh
        geometry={GEO.plane}
        material={COVE_GLOW}
        position={[VANITY.x, 0.012, vanityZ + 0.25]}
        rotation-x={-Math.PI / 2}
        scale={[VANITY.length + 1.5, 1.6, 1]}
      />
      {[-2.2, 0, 2.2].map((dx) => (
        <VesselSink key={dx} x={VANITY.x + dx} />
      ))}
      <mesh geometry={vanityAccessories()} material={MAT.decor} position={[VANITY.x, 0.88, vanityZ]} castShadow />

      {/* Large mirror with backlit halo */}
      <mesh
        geometry={GEO.plane}
        material={MIRROR_HALO}
        position={[VANITY.x, 1.9, WALL_N + 0.005]}
        scale={[VANITY.length + 1.4, 2.4, 1]}
      />
      <Mirror width={VANITY.length - 0.4} height={1.4} position={[VANITY.x, 1.9, WALL_N + 0.03]} />

      {[-3.3, 3.3].map((dx) => (
        <group key={dx} position={[VANITY.x + dx, CEILING_H, vanityZ + 0.15]}>
          <Cylinder r={0.004} h={1.1} position={[0, -0.55, 0]} material={MAT.blackMetal} cast={false} />
          <mesh geometry={GEO.sphere} material={MAT.glowGlass} position={[0, -1.2, 0]} scale={0.1} />
        </group>
      ))}

      <Stalls />

      {/* Stone bench, towels, plants */}
      <Box size={[1.8, 0.42, 0.5]} position={[17.6, 0.21, 7.9]} material={MAT.travertine} />
      <group position={[WALL_E - 0.2, 0, 7.9]}>
        <Box size={[0.36, 0.03, 1.4]} position={[0, 1.0, 0]} material={MAT.walnut} />
        <Box size={[0.36, 0.03, 1.4]} position={[0, 1.4, 0]} material={MAT.walnut} />
        <mesh geometry={towelGeometry()} material={MAT.decor} position={[0, 1.015, -0.55]} castShadow />
      </group>
      <Plant variant="olive" pot="stone" position={[WALL_E - 0.45, 0, WALL_N + 0.45]} />
      <Plant variant="snake" pot="charcoal" position={[B.minX + 0.5, 0, WALL_S - 0.5]} />
      <Plant variant="small" pot="white" position={[VANITY.x + 3.1, 0.88, vanityZ]} />
      <Plant variant="small" pot="charcoal" position={[VANITY.x - 3.1, 0.88, vanityZ]} />

      {/* Wayfinding + warm local light (the bathroom has no windows) */}
      <group position={[B.minX - 0.12, 2.3, 8.3]} rotation-y={-Math.PI / 2}>
        <Box size={[1.5, 0.4, 0.03]} material={MAT.walnut} cast={false} />
        <mesh geometry={GEO.plane} scale={[1.44, 0.36, 1]} position={[0, 0, 0.016]}>
          <meshBasicMaterial map={signTexture('RESTROOM')} transparent toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[14, 2.7, 7.2]} color="#ffd6a8" intensity={9} distance={10} decay={2} />
      <pointLight position={[15.5, 2.4, 11.6]} color="#ffd6a8" intensity={4} distance={7} decay={2} />
    </group>
  )
}

const towelGeometry = () =>
  cached('towels', () =>
    mergeParts(
      Array.from({ length: 8 }, (_, i) => ({
        geo: GEO.cylinder,
        at: [0, 0.06 + Math.floor(i / 4) * 0.12, (i % 4) * 0.16] as [number, number, number],
        rot: [0, 0, Math.PI / 2] as [number, number, number],
        scale: [0.06, 0.3, 0.06] as [number, number, number],
        color: i % 4 === 3 ? '#d9cfc0' : '#f7f5f0',
      })),
      true,
    ),
  )

/**
 * Small things on the vanity, merged into one mesh: an amber soap pump beside each
 * sink, a walnut tray of rolled hand towels and a reed diffuser between the sinks.
 */
const vanityAccessories = () =>
  cached('vanity-accessories', () => {
    const parts: Parameters<typeof mergeParts>[0] = []
    for (const dx of [-2.2, 0, 2.2]) {
      const x = dx + 0.42
      parts.push(
        { geo: GEO.cylinder, at: [x, 0.08, -0.12], scale: [0.035, 0.16, 0.035], color: '#7a4a1e' },
        { geo: GEO.cylinder, at: [x, 0.18, -0.12], scale: [0.011, 0.04, 0.011], color: '#c9a24d' },
        { geo: GEO.box, at: [x - 0.025, 0.2, -0.12], scale: [0.05, 0.012, 0.014], color: '#c9a24d' },
      )
    }
    parts.push({ geo: GEO.box, at: [-1.05, 0.012, -0.05], scale: [0.42, 0.024, 0.28], color: '#6e4a33' })
    for (let i = 0; i < 3; i++) {
      parts.push({ geo: GEO.cylinder, at: [-1.05, 0.064, -0.14 + i * 0.09], rot: [0, 0, Math.PI / 2], scale: [0.04, 0.34, 0.04], color: '#f4f1ea' })
    }
    parts.push(
      { geo: GEO.cylinder, at: [1.25, 0.06, -0.1], scale: [0.045, 0.12, 0.045], color: '#3d4a44' },
      ...[-0.5, -0.18, 0.15, 0.45].map((tilt, i) => ({
        geo: GEO.cylinder,
        at: [1.25 + tilt * 0.08, 0.26, -0.1 + (i % 2 ? 0.02 : -0.02)] as [number, number, number],
        rot: [0, 0, tilt * 0.35] as [number, number, number],
        scale: [0.003, 0.3, 0.003] as [number, number, number],
        color: '#2b2118',
      })),
    )
    return mergeParts(parts, true)
  })
