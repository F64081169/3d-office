import { HOME_SEATS, type Agent } from '@office/shared'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { blobShadowTexture } from '../assets/textures'
import { useOfficeStore } from '../store/officeStore'
import { APPEARANCE, DEFAULT_APPEARANCE } from './appearance'
import { DEPT_COLOR } from './status'
import { registerTagAnchor } from './tags'

/** Shared low-poly body parts (~1.8k triangles per avatar). */
const G = {
  thigh: new THREE.CapsuleGeometry(0.075, 0.28, 4, 10),
  shin: new THREE.CapsuleGeometry(0.065, 0.28, 4, 10),
  shoe: new THREE.BoxGeometry(0.12, 0.07, 0.24),
  torso: new THREE.CapsuleGeometry(0.18, 0.26, 6, 14),
  arm: new THREE.CapsuleGeometry(0.052, 0.34, 4, 10),
  hand: new THREE.SphereGeometry(0.052, 10, 8),
  head: new THREE.SphereGeometry(0.165, 22, 16),
  hairCap: new THREE.SphereGeometry(0.176, 22, 12, 0, Math.PI * 2, 0, 1.35),
  hairBob: new THREE.SphereGeometry(0.184, 22, 14, 0, Math.PI * 2, 0, 1.45),
  hairLong: new THREE.CapsuleGeometry(0.12, 0.2, 4, 12),
  bun: new THREE.SphereGeometry(0.075, 12, 10),
  eye: new THREE.SphereGeometry(0.021, 8, 6),
  lens: new THREE.TorusGeometry(0.038, 0.007, 6, 18),
  ring: new THREE.RingGeometry(0.46, 0.54, 48),
  blob: new THREE.PlaneGeometry(1, 1),
}

const eyeMat = new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.3 })
const lensMat = new THREE.MeshStandardMaterial({ color: '#202124', metalness: 0.6, roughness: 0.3 })
const blobMat = new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false })

/** Rig constants (metres). Hip pivot height: standing vs seated on a 0.49m chair. */
const HIP = { stand: 0.86, sit: 0.5 }

type Pose = 'sit' | 'stand'

export function AgentAvatar({ agent }: { agent: Agent }) {
  const look = APPEARANCE[agent.id] ?? DEFAULT_APPEARANCE
  const seat = HOME_SEATS[agent.id]
  const hovered = useOfficeStore((s) => s.hoveredAgentId === agent.id)
  const setHovered = useOfficeStore((s) => s.setHovered)
  const focusAgent = useOfficeStore((s) => s.focusAgent)

  // Phase 1: everyone is at their desk. Phase 4 derives pose + destination from status.
  const pose: Pose = 'sit'
  const dept = DEPT_COLOR[agent.department]

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.65 }),
      hair: new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.8 }),
      top: new THREE.MeshStandardMaterial({ color: look.top, roughness: 0.85 }),
      bottom: new THREE.MeshStandardMaterial({ color: look.bottom, roughness: 0.9 }),
      shoes: new THREE.MeshStandardMaterial({ color: look.shoes, roughness: 0.6 }),
      ring: new THREE.MeshBasicMaterial({ color: dept, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
    }),
    [look, dept],
  )

  const torso = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)
  const ringMesh = useRef<THREE.Mesh>(null!)
  const phase = useMemo(() => (agent.id.charCodeAt(0) * 7 + agent.id.length * 13) % 100, [agent.id])

  const sitting = pose === 'sit'
  const hipY = sitting ? HIP.sit : HIP.stand
  const armRest = sitting ? -0.5 : 0

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    // Idle life: breathing, occasional glances, small arm shifts.
    torso.current.scale.y = 1 + Math.sin(t * 1.7) * 0.012
    head.current.rotation.y = Math.sin(t * 0.37) * 0.45 * Math.max(0, Math.sin(t * 0.11))
    head.current.rotation.x = Math.sin(t * 0.53) * 0.05
    armL.current.rotation.x = armRest + Math.sin(t * 0.8) * 0.03
    armR.current.rotation.x = armRest + Math.sin(t * 0.8 + 1) * 0.03

    const ring = mats.ring
    ring.opacity += ((hovered ? 0.85 : 0) - ring.opacity) * 0.2
    ringMesh.current.visible = ring.opacity > 0.01
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(agent.id)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    setHovered(null)
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    focusAgent(agent.id)
  }

  return (
    <group
      position={[agent.position.x, agent.position.y, agent.position.z]}
      rotation-y={seat?.rotationY ?? 0}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <mesh geometry={G.blob} material={blobMat} rotation-x={-Math.PI / 2} position-y={0.012} scale={sitting ? 1.0 : 0.8} />
      <mesh ref={ringMesh} geometry={G.ring} material={mats.ring} rotation-x={-Math.PI / 2} position-y={0.02} />

      <group position-y={hipY}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.095, 0, 0]} rotation-x={sitting ? -Math.PI / 2 : 0}>
            <mesh geometry={G.thigh} material={mats.bottom} position-y={-0.2} />
            <group position-y={-0.4} rotation-x={sitting ? Math.PI / 2 : 0}>
              <mesh geometry={G.shin} material={mats.bottom} position-y={-0.2} />
              <mesh geometry={G.shoe} material={mats.shoes} position={[0, -0.42, 0.04]} />
            </group>
          </group>
        ))}

        <group ref={torso}>
          <mesh geometry={G.torso} material={mats.top} position-y={0.3} />
          {([
            [-1, armL],
            [1, armR],
          ] as const).map(([s, ref]) => (
            <group key={s} ref={ref} position={[s * 0.235, 0.52, 0]} rotation-z={s * 0.08}>
              <mesh geometry={G.arm} material={mats.top} position-y={-0.2} />
              <mesh geometry={G.hand} material={mats.skin} position-y={-0.45} />
            </group>
          ))}
        </group>

        <group ref={head} position-y={0.78}>
          <mesh geometry={G.head} material={mats.skin} />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={G.eye} material={eyeMat} position={[s * 0.058, 0.012, 0.152]} />
          ))}
          {look.glasses &&
            [-1, 1].map((s) => (
              <mesh key={s} geometry={G.lens} material={lensMat} position={[s * 0.058, 0.012, 0.168]} />
            ))}
          <Hair style={look.hairStyle} material={mats.hair} />
        </group>
      </group>

      <group ref={(o) => registerTagAnchor(agent.id, o)} position-y={hipY + 1.12} />
    </group>
  )
}

function Hair({ style, material }: { style: string; material: THREE.Material }) {
  if (style === 'bob') {
    return <mesh geometry={G.hairBob} material={material} position={[0, 0.01, -0.015]} rotation-x={-0.62} />
  }
  return (
    <>
      <mesh geometry={G.hairCap} material={material} position={[0, 0.012, -0.01]} rotation-x={-0.28} />
      {style === 'long' && (
        <mesh geometry={G.hairLong} material={material} position={[0, -0.13, -0.08]} scale={[1.25, 1, 0.75]} />
      )}
      {style === 'bun' && <mesh geometry={G.bun} material={material} position={[0, 0.12, -0.13]} />}
    </>
  )
}
