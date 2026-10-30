import { placeFor, type Agent, type AgentStatus } from '@office/shared'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { blobMaterial } from '../assets/materials'
import { useOfficeStore } from '../store/officeStore'
import { registerTagAnchor } from './anchors'
import { APPEARANCE, DEFAULT_APPEARANCE } from './appearance'
import { AgentMotion } from './motion'
import { DEPT_COLOR, STATUS_META } from './status'

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
  cup: new THREE.CylinderGeometry(0.04, 0.034, 0.09, 14),
  ring: new THREE.RingGeometry(0.46, 0.54, 48),
  alert: new THREE.RingGeometry(0.6, 0.72, 48),
  blob: new THREE.PlaneGeometry(1, 1),
}

const eyeMat = new THREE.MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.3 })
const lensMat = new THREE.MeshStandardMaterial({ color: '#202124', metalness: 0.6, roughness: 0.3 })
const cupMat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.25 })

/** Hip pivot height standing vs seated on a 0.49m chair. */
const HIP = { stand: 0.86, sit: 0.5 }
const CHEER_MS = 1600

/** Upper body: [left arm pitch, left arm roll, right arm pitch, right arm roll, head pitch]. */
type Upper = [number, number, number, number, number]

const AT_DESK: Record<AgentStatus, Upper> = {
  idle: [-0.5, 0.08, -0.5, 0.08, 0],
  thinking: [-0.45, 0.08, -2.35, -0.55, 0.12],
  working: [-1.05, -0.12, -1.05, -0.12, 0.18],
  blocked: [-2.75, -0.35, -2.75, -0.35, -0.08],
  meeting: [-0.9, -0.1, -0.9, -0.1, 0.05],
  reporting: [-0.6, 0.05, -0.6, 0.05, 0],
  break: [-0.25, 0.25, -0.25, 0.25, -0.12],
}
const CHEER: Upper = [-2.95, 0.35, -2.95, 0.35, -0.15]
const STANDING: Upper = [0.05, 0.08, 0.05, 0.08, 0]

/**
 * What the arms and head do, given where the agent is and what it is doing.
 * Talking = a periodic gesture with the right arm.
 */
function upperBody(status: AgentStatus, standing: boolean, t: number): Upper {
  const talking = Math.sin(t * 0.8) > -0.2
  const gesture = talking ? -0.35 + Math.sin(t * 2.6) * 0.3 : 0
  if (standing) {
    if (status === 'reporting') return [0.05, 0.08, -0.85 + gesture, -0.2, 0]
    // Coffee in hand, sipping now and then (a window break just looks out).
    if (status === 'break') return [0.05, 0.1, -1.95 + (Math.sin(t * 0.6) > 0.75 ? -0.35 : 0), -0.55, -0.05]
    return STANDING
  }
  if (status === 'meeting' || status === 'reporting') return [-0.9, -0.1, -1.0 + gesture, -0.15, 0.05]
  return AT_DESK[status]
}

export function AgentAvatar({ agent }: { agent: Agent }) {
  const look = APPEARANCE[agent.id] ?? DEFAULT_APPEARANCE
  const hovered = useOfficeStore((s) => s.hoveredId === agent.id)
  const selected = useOfficeStore((s) => s.selectedId === agent.id)
  const setHovered = useOfficeStore((s) => s.setHovered)
  const focusAgent = useOfficeStore((s) => s.focusAgent)
  const dept = DEPT_COLOR[agent.department]
  const status = agent.status

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.65 }),
      hair: new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.8 }),
      top: new THREE.MeshStandardMaterial({ color: look.top, roughness: 0.85 }),
      bottom: new THREE.MeshStandardMaterial({ color: look.bottom, roughness: 0.9 }),
      shoes: new THREE.MeshStandardMaterial({ color: look.shoes, roughness: 0.6 }),
      ring: new THREE.MeshBasicMaterial({ color: dept, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
      alert: new THREE.MeshBasicMaterial({
        color: STATUS_META.blocked.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [look, dept],
  )

  // Motion: start wherever the current status puts this agent (no walk on first load).
  const motion = useMemo(
    () => new AgentMotion(placeFor(agent, agent.status, useOfficeStore.getState().agents)),
    [agent.id], // one simulator per agent for its whole life
  )
  useEffect(() => {
    motion.goTo(placeFor(agent, status, useOfficeStore.getState().agents))
  }, [motion, agent, status])

  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const torso = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)
  const thighs = useRef<THREE.Group[]>([])
  const knees = useRef<THREE.Group[]>([])
  const cup = useRef<THREE.Mesh>(null!)
  const blob = useRef<THREE.Mesh>(null!)
  const anchor = useRef<THREE.Group>(null!)
  const ringMesh = useRef<THREE.Mesh>(null!)
  const alertMesh = useRef<THREE.Mesh>(null!)
  const phase = useMemo(() => (agent.id.charCodeAt(0) * 7 + agent.id.length * 13) % 100, [agent.id])

  useFrame(({ clock }, rawDt) => {
    // Motion follows real time exactly, however slow the frame: the server schedules
    // meetings and reports around these arrival times.
    motion.update(Math.max(0, rawDt), useOfficeStore.getState().simSpeed)
    const dt = Math.min(rawDt, 0.1)
    const t = clock.elapsedTime + phase
    const k = 1 - Math.exp(-dt * 8)
    const walking = motion.phase === 'walking'
    const sit = motion.sit
    const standing = sit < 0.5

    root.current.position.set(motion.x, 0, motion.z)
    root.current.rotation.y = motion.yaw

    // Legs: seated fold, or a walk cycle driven by distance travelled.
    const cycle = motion.stride * 4.2
    for (let i = 0; i < 2; i++) {
      const swing = walking ? Math.sin(cycle + i * Math.PI) * 0.55 : 0
      thighs.current[i].rotation.x = -Math.PI / 2 * sit + swing
      knees.current[i].rotation.x = (Math.PI / 2) * sit + (walking ? Math.max(0, -Math.sin(cycle + i * Math.PI)) * 0.7 : 0)
    }

    const rewardedAt = useOfficeStore.getState().lastRewardAt[agent.id] ?? -Infinity
    const cheering = performance.now() - rewardedAt < CHEER_MS
    const [lp, lr, rp, rr, hp] = cheering ? CHEER : walking ? STANDING : upperBody(status, standing, t)
    const typing = status === 'working' && !standing && !walking && !cheering
    const armSwing = walking ? Math.sin(cycle) * 0.45 : 0
    armL.current.rotation.x += (lp - armSwing + (typing ? Math.sin(t * 17) * 0.07 : Math.sin(t * 0.8) * 0.03) - armL.current.rotation.x) * k
    armR.current.rotation.x += (rp + armSwing + (typing ? Math.sin(t * 17 + 1.6) * 0.07 : Math.sin(t * 0.8 + 1) * 0.03) - armR.current.rotation.x) * k
    armL.current.rotation.z += (-lr - armL.current.rotation.z) * k
    armR.current.rotation.z += (rr - armR.current.rotation.z) * k
    cup.current.visible = status === 'break' && standing && !walking && motion.phase === 'settled'

    const atRest = !walking && (status === 'idle' || status === 'break')
    const glance = atRest ? Math.sin(t * 0.37) * 0.45 * Math.max(0, Math.sin(t * 0.11)) : 0
    const shake = status === 'blocked' && !walking ? Math.sin(t * 2.2) * 0.3 : 0
    head.current.rotation.y += (glance + shake - head.current.rotation.y) * k
    head.current.rotation.x += (hp + Math.sin(t * (status === 'thinking' ? 0.9 : 0.53)) * 0.05 - head.current.rotation.x) * k

    const hipY = HIP.stand + (HIP.sit - HIP.stand) * sit
    const bob = walking ? Math.abs(Math.sin(cycle)) * 0.035 : 0
    torso.current.scale.y = 1 + Math.sin(t * 1.7) * 0.012
    body.current.position.y = hipY + bob + (cheering ? Math.abs(Math.sin(t * 9)) * 0.06 : 0)
    anchor.current.position.y = hipY + 1.12
    blob.current.scale.setScalar(0.8 + 0.2 * sit)

    const ring = mats.ring
    ring.opacity += ((selected ? 0.95 : hovered ? 0.6 : 0) - ring.opacity) * 0.2
    ringMesh.current.visible = ring.opacity > 0.01

    const alertOn = status === 'blocked'
    mats.alert.opacity += ((alertOn ? 0.5 + Math.sin(t * 5) * 0.35 : 0) - mats.alert.opacity) * 0.25
    alertMesh.current.visible = mats.alert.opacity > 0.01
    alertMesh.current.scale.setScalar(1 + (alertOn ? Math.sin(t * 5) * 0.06 : 0))
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
    <group ref={root} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      <mesh ref={blob} geometry={G.blob} material={blobMaterial()} rotation-x={-Math.PI / 2} position-y={0.012} />
      <mesh ref={ringMesh} geometry={G.ring} material={mats.ring} rotation-x={-Math.PI / 2} position-y={0.02} />
      <mesh ref={alertMesh} geometry={G.alert} material={mats.alert} rotation-x={-Math.PI / 2} position-y={0.022} />

      <group ref={body}>
        {[-1, 1].map((s, i) => (
          <group key={s} ref={(g) => void (g && (thighs.current[i] = g))} position={[s * 0.095, 0, 0]}>
            <mesh geometry={G.thigh} material={mats.bottom} position-y={-0.2} />
            <group ref={(g) => void (g && (knees.current[i] = g))} position-y={-0.4}>
              <mesh geometry={G.shin} material={mats.bottom} position-y={-0.2} />
              <mesh geometry={G.shoe} material={mats.shoes} position={[0, -0.42, 0.04]} />
            </group>
          </group>
        ))}

        <group ref={torso}>
          <mesh geometry={G.torso} material={mats.top} position-y={0.3} />
          {(
            [
              [-1, armL],
              [1, armR],
            ] as const
          ).map(([s, ref]) => (
            <group key={s} ref={ref} position={[s * 0.235, 0.52, 0]} rotation-z={s * 0.08}>
              <mesh geometry={G.arm} material={mats.top} position-y={-0.2} />
              <mesh geometry={G.hand} material={mats.skin} position-y={-0.45} />
              {s === 1 && <mesh ref={cup} geometry={G.cup} material={cupMat} position={[0, -0.47, 0.06]} visible={false} />}
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

      <group
        ref={(o) => {
          anchor.current = o!
          registerTagAnchor(agent.id, o)
        }}
      />
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
