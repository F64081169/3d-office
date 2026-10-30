import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { blobShadowTexture } from '../../assets/textures'
import { registerTagAnchor } from '../../agents/anchors'
import { CAT_ID, useOfficeStore, type CatActivity } from '../../store/officeStore'
import { mulberry32 } from '../../util/random'
import { routeBetween } from '@office/shared'
import { CAT_SPOTS, type CatSpot, type SpotKind } from './catSpots'
import { CAT_COLOR } from './catInfo'

const SCALE = 1.3
const WALK_SPEED = 1.05 // m/s
const JUMP_SECONDS = 0.5
const TAIL_SEGMENTS = 7

const G = {
  body: new THREE.CapsuleGeometry(0.085, 0.2, 6, 14),
  stripe: new THREE.TorusGeometry(0.087, 0.012, 6, 18, Math.PI),
  chest: new THREE.SphereGeometry(0.07, 14, 10),
  head: new THREE.SphereGeometry(0.08, 18, 14),
  muzzle: new THREE.SphereGeometry(0.036, 12, 8),
  nose: new THREE.SphereGeometry(0.012, 8, 6),
  eye: new THREE.SphereGeometry(0.014, 8, 6),
  ear: new THREE.ConeGeometry(0.032, 0.065, 4),
  leg: new THREE.CapsuleGeometry(0.022, 0.09, 4, 8),
  paw: new THREE.SphereGeometry(0.026, 8, 6),
  tail: new THREE.CapsuleGeometry(0.02, 0.045, 4, 8),
  ring: new THREE.RingGeometry(0.34, 0.4, 40),
  blob: new THREE.PlaneGeometry(1, 1),
}

const M = {
  fur: new THREE.MeshStandardMaterial({ color: '#e0954f', roughness: 0.85 }),
  stripe: new THREE.MeshStandardMaterial({ color: '#b8692c', roughness: 0.85 }),
  cream: new THREE.MeshStandardMaterial({ color: '#f6ecdf', roughness: 0.9 }),
  nose: new THREE.MeshStandardMaterial({ color: '#e59a9a', roughness: 0.6 }),
  eye: new THREE.MeshStandardMaterial({ color: '#23301f', roughness: 0.2 }),
  blob: new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }),
  ring: new THREE.MeshBasicMaterial({ color: CAT_COLOR, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
}

/** Pose targets; the rig eases toward them every frame. */
type Pose = {
  pelvisY: number
  spinePitch: number
  frontLeg: number
  backLeg: number
  headY: number
  headPitch: number
  headYaw: number
  tailBase: number
  tailCurlX: number
  tailCurlZ: number
  eyes: number
}

const WALK: Pose = { pelvisY: 0.17, spinePitch: 0, frontLeg: 0, backLeg: 0, headY: 0.1, headPitch: 0, headYaw: 0, tailBase: -0.45, tailCurlX: 0.14, tailCurlZ: 0, eyes: 1 }
const SIT: Pose = { pelvisY: 0.14, spinePitch: -0.5, frontLeg: 0.5, backLeg: -0.95, headY: 0.1, headPitch: 0.45, headYaw: 0, tailBase: -1.9, tailCurlX: 0, tailCurlZ: 0.32, eyes: 1 }
const LOAF: Pose = { pelvisY: 0.1, spinePitch: 0, frontLeg: -1.5, backLeg: 1.5, headY: 0.05, headPitch: 0.25, headYaw: 0.55, tailBase: -1.62, tailCurlX: 0, tailCurlZ: 0.48, eyes: 0.12 }

const ACTIVITY: Record<SpotKind, CatActivity> = { nap: 'napping', watch: 'watching', beg: 'begging', visit: 'visiting' }
const STAY_SECONDS: Record<SpotKind, [number, number]> = { nap: [14, 24], watch: [8, 14], beg: [6, 9], visit: [6, 10] }

/** Spot A → spot B along the shared walkable graph; only the ends leave the floor (sofa). */
function buildPath(from: CatSpot, to: CatSpot, start: THREE.Vector3) {
  const route = routeBetween(from, to)
  return route.map(([x, z], i) =>
    i === 0 ? start.clone() : new THREE.Vector3(x, i === route.length - 1 ? (to.height ?? 0) : 0, z),
  )
}

const spotPosition = (s: CatSpot) => new THREE.Vector3(s.position[0], s.height ?? 0, s.position[1])

const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k

/**
 * Mochi, the office cat. Not on the org chart: wanders the navigation graph between
 * nap spots, the windows, the coffee bar and visits to whoever is at their desk.
 */
export function OfficeCat() {
  const rnd = useMemo(() => mulberry32(2024), [])
  const start = CAT_SPOTS.find((s) => s.id === 'reception')!
  const sim = useRef({
    mode: 'stay' as 'stay' | 'walk',
    spot: start,
    path: [] as THREE.Vector3[],
    seg: 0,
    segT: 0,
    until: 3,
    pos: spotPosition(start),
    yaw: start.rotationY,
    targetYaw: start.rotationY,
    walkPhase: 0,
    pets: 0,
    purrUntil: 0,
  })
  const pose = useRef<Pose>({ ...LOAF })
  useEffect(() => useOfficeStore.getState().setCat({ activity: 'napping', place: start.label }), [start])

  const root = useRef<THREE.Group>(null!)
  const pelvis = useRef<THREE.Group>(null!)
  const spine = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const eyes = useRef<THREE.Group>(null!)
  const legs = useRef<THREE.Group[]>([])
  const tail = useRef<THREE.Group[]>([])
  const ring = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.25)
    const now = clock.elapsedTime
    const s = sim.current
    const store = useOfficeStore.getState()

    // Petting: purr for a few seconds wherever Mochi is.
    if (store.cat.pets !== s.pets) {
      s.pets = store.cat.pets
      s.purrUntil = now + 3
      if (s.mode === 'stay') store.setCat({ activity: 'purring' })
    }
    if (s.purrUntil && now > s.purrUntil) {
      s.purrUntil = 0
      if (s.mode === 'stay') store.setCat({ activity: ACTIVITY[s.spot.kind] })
    }

    if (s.mode === 'stay' && now > s.until && !s.purrUntil) {
      const options = CAT_SPOTS.filter((o) => o.id !== s.spot.id)
      let r = rnd() * options.reduce((sum, o) => sum + o.weight, 0)
      const next = options.find((o) => (r -= o.weight) <= 0) ?? options[0]
      s.path = buildPath(s.spot, next, s.pos)
      s.spot = next
      s.seg = 0
      s.segT = 0
      s.mode = 'walk'
      store.setCat({ activity: 'wandering', place: next.label })
    }

    let target = SIT
    if (s.mode === 'walk') {
      target = WALK
      let budget = WALK_SPEED * dt
      while (s.mode === 'walk' && budget > 0) {
        const a = s.path[s.seg]
        const b = s.path[s.seg + 1]
        const len = Math.hypot(b.x - a.x, b.z - a.z)
        if (Math.abs(b.y - a.y) > 0.2) {
          s.segT += dt / JUMP_SECONDS
          budget = 0
        } else {
          const step = budget / Math.max(len, 1e-3)
          if (s.segT + step >= 1) {
            budget -= (1 - s.segT) * len
            s.segT = 1
          } else {
            s.segT += step
            budget = 0
          }
        }
        if (len > 0.01) s.targetYaw = Math.atan2(b.x - a.x, b.z - a.z)
        if (s.segT >= 1) {
          s.seg++
          s.segT = 0
          if (s.seg >= s.path.length - 1) {
            const spot = s.spot
            s.mode = 'stay'
            s.pos.copy(spotPosition(spot))
            const [lo, hi] = STAY_SECONDS[spot.kind]
            s.until = now + lo + rnd() * (hi - lo)
            s.targetYaw = spot.rotationY
            store.setCat({ activity: ACTIVITY[spot.kind], place: spot.label })
          }
        }
      }
      if (s.mode === 'walk') {
        const a = s.path[s.seg]
        const b = s.path[s.seg + 1]
        s.pos.lerpVectors(a, b, s.segT)
        if (Math.abs(b.y - a.y) > 0.2) s.pos.y += Math.sin(s.segT * Math.PI) * 0.28
        s.walkPhase += dt * 13
      }
    }
    if (s.mode === 'stay') target = s.spot.kind === 'nap' && !s.purrUntil ? LOAF : SIT

    // Ease the rig toward the pose.
    const k = 1 - Math.exp(-dt * 6)
    const p = pose.current
    for (const key of Object.keys(p) as (keyof Pose)[]) p[key] += (target[key] - p[key]) * k

    s.yaw = lerpAngle(s.yaw, s.targetYaw, 1 - Math.exp(-dt * 8))
    root.current.position.copy(s.pos)
    root.current.rotation.y = s.yaw

    const walking = s.mode === 'walk'
    const swing = walking ? Math.sin(s.walkPhase) * 0.6 : 0
    const breathe = s.mode === 'stay' && target === LOAF ? Math.sin(now * 1.6) * 0.03 : 0
    pelvis.current.position.y = p.pelvisY + (walking ? Math.abs(Math.sin(s.walkPhase)) * 0.008 : 0)
    spine.current.rotation.x = p.spinePitch
    spine.current.scale.set(1 + breathe, 1 + breathe, 1)
    legs.current.forEach((leg, i) => {
      const front = i < 2
      const alt = i === 0 || i === 3 ? 1 : -1
      leg.rotation.x = (front ? p.frontLeg : p.backLeg) + swing * alt
    })

    const curious = s.spot.kind === 'beg' || s.spot.kind === 'visit' ? -0.3 : 0
    const look = s.mode === 'stay' && target === SIT ? Math.sin(now * 0.5) * 0.35 : 0
    head.current.position.y = p.headY
    head.current.rotation.set(p.headPitch + (target === SIT ? curious : 0), p.headYaw + look, 0)
    const blink = Math.sin(now * 2.7) > 0.985 ? 0.1 : 1
    eyes.current.scale.y = Math.min(p.eyes, blink) * (s.purrUntil ? 0.35 : 1)

    const swish = s.purrUntil ? 0.35 : walking ? 0.12 : 0.06
    tail.current.forEach((seg, i) => {
      const wave = Math.sin(now * (s.purrUntil ? 6 : 2) - i * 0.6) * swish
      seg.rotation.x = i === 0 ? p.tailBase : p.tailCurlX
      seg.rotation.z = (i === 0 ? 0 : p.tailCurlZ) + wave
    })

    const hovered = store.hoveredId === CAT_ID || store.selectedId === CAT_ID
    M.ring.opacity += ((hovered ? 0.9 : 0) - M.ring.opacity) * 0.2
    ring.current.visible = M.ring.opacity > 0.01
  })

  const setHovered = useOfficeStore((s) => s.setHovered)
  const select = useOfficeStore((s) => s.select)
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(CAT_ID)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    setHovered(null)
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    select(CAT_ID)
  }

  const tailChain = (i: number): React.ReactNode =>
    i >= TAIL_SEGMENTS ? null : (
      <group ref={(g) => void (g && (tail.current[i] = g))} position-y={i === 0 ? 0 : 0.055}>
        <mesh geometry={G.tail} material={i % 2 ? M.stripe : M.fur} position-y={0.03} />
        {tailChain(i + 1)}
      </group>
    )

  return (
    <group ref={root} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      <group scale={SCALE}>
        <mesh geometry={G.blob} material={M.blob} rotation-x={-Math.PI / 2} position-y={0.01} scale={[0.32, 0.48, 1]} />
        <mesh ref={ring} geometry={G.ring} material={M.ring} rotation-x={-Math.PI / 2} position-y={0.015} />
        <group ref={pelvis}>
          <group ref={spine}>
            <mesh geometry={G.body} material={M.fur} rotation-x={Math.PI / 2} position={[0, 0.02, 0.02]} />
            {[-0.06, 0, 0.06].map((z) => (
              <mesh key={z} geometry={G.stripe} material={M.stripe} position={[0, 0.02, z]} />
            ))}
            <mesh geometry={G.chest} material={M.cream} position={[0, -0.01, 0.12]} scale={[0.9, 0.95, 0.8]} />
            {(
              [
                [-0.05, 0.1],
                [0.05, 0.1],
                [-0.05, -0.08],
                [0.05, -0.08],
              ] as const
            ).map(([x, z], i) => (
              <group key={i} ref={(g) => void (g && (legs.current[i] = g))} position={[x, 0, z]}>
                <mesh geometry={G.leg} material={M.fur} position-y={-0.075} />
                <mesh geometry={G.paw} material={M.cream} position={[0, -0.14, 0.008]} />
              </group>
            ))}
            <group ref={head} position={[0, 0.1, 0.19]}>
              <mesh geometry={G.head} material={M.fur} />
              <mesh geometry={G.muzzle} material={M.cream} position={[0, -0.024, 0.06]} scale={[1.25, 0.8, 1]} />
              <mesh geometry={G.nose} material={M.nose} position={[0, -0.006, 0.094]} />
              <group ref={eyes} position={[0, 0.016, 0.066]}>
                {[-1, 1].map((sx) => (
                  <mesh key={sx} geometry={G.eye} material={M.eye} position={[sx * 0.034, 0, 0]} />
                ))}
              </group>
              {[-1, 1].map((sx) => (
                <mesh key={sx} geometry={G.ear} material={M.fur} position={[sx * 0.046, 0.068, -0.006]} rotation-z={-sx * 0.35} />
              ))}
            </group>
            <group position={[0, 0.05, -0.12]}>{tailChain(0)}</group>
          </group>
        </group>
        <group ref={(o) => registerTagAnchor(CAT_ID, o)} position-y={0.42} />
      </group>
    </group>
  )
}
