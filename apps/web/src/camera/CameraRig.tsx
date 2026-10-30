import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import * as THREE from 'three'
import { getAnchorPosition } from '../agents/tags'
import { useOfficeStore } from '../store/officeStore'
import { INTRO_START, OVERVIEW } from '../world/layout'

type Flight = {
  curve?: THREE.CatmullRomCurve3
  fromPos: THREE.Vector3
  toPos: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  start: number
  duration: number
  intro: boolean
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const BOUNDS = 40

/**
 * Owns the camera: the opening fly-in, smooth flights to presets/agents,
 * orbit/pan/zoom (OrbitControls) and WASD / arrow-key movement.
 */
export function CameraRig() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null!)
  const camera = useThree((s) => s.camera)
  const clock = useThree((s) => s.clock)
  const flight = useRef<Flight | null>(null)
  const keys = useKeys()
  const shot = useOfficeStore((s) => s.cameraShot)
  const finishIntro = useOfficeStore((s) => s.finishIntro)
  const clearActiveView = useOfficeStore((s) => s.clearActiveView)
  const followId = useOfficeStore((s) => s.followId)
  const follow = useOfficeStore((s) => s.follow)

  // Opening shot: swoop from above the city into the office.
  useEffect(() => {
    const from = new THREE.Vector3(...INTRO_START)
    const to = new THREE.Vector3(...OVERVIEW.position)
    camera.position.copy(from)
    flight.current = {
      curve: new THREE.CatmullRomCurve3([from, new THREE.Vector3(70, 55, 120), new THREE.Vector3(32, 32, 55), to]),
      fromPos: from,
      toPos: to,
      fromTarget: new THREE.Vector3(0, -30, 0),
      toTarget: new THREE.Vector3(...OVERVIEW.target),
      start: clock.elapsedTime + 0.3,
      duration: 4.8,
      intro: true,
    }
  }, [camera, clock])

  useEffect(() => {
    if (!shot || !controls.current) return
    flight.current = {
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...shot.position),
      fromTarget: controls.current.target.clone(),
      toTarget: new THREE.Vector3(...shot.target),
      start: clock.elapsedTime,
      duration: 1.5,
      intro: false,
    }
  }, [shot, camera, clock])

  // Start following: fly to a close 3/4 shot of the subject; the follow loop then keeps it centred.
  useEffect(() => {
    const c = controls.current
    const p = new THREE.Vector3()
    if (!followId || !c || !getAnchorPosition(followId, p)) return
    flight.current = {
      fromPos: camera.position.clone(),
      toPos: p.clone().add(new THREE.Vector3(2.4, 1.6, 2.8)),
      fromTarget: c.target.clone(),
      toTarget: p.clone(),
      start: clock.elapsedTime,
      duration: 1.4,
      intro: false,
    }
  }, [followId, camera, clock])

  // Any manual orbit/zoom ends (or skips) the current flight.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const onStart = () => {
      const f = flight.current
      if (!f) return clearActiveView()
      if (f.intro) {
        camera.position.copy(f.toPos)
        c.target.copy(f.toTarget)
        finishIntro()
      }
      flight.current = null
    }
    c.addEventListener('start', onStart)
    return () => c.removeEventListener('start', onStart)
  }, [camera, finishIntro, clearActiveView])

  const [fwd, right, move] = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], [])
  const followPos = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return
    const f = flight.current
    if (f) {
      const k = THREE.MathUtils.clamp((clock.elapsedTime - f.start) / f.duration, 0, 1)
      const e = ease(k)
      if (f.curve) camera.position.copy(f.curve.getPoint(e))
      else camera.position.lerpVectors(f.fromPos, f.toPos, e)
      c.target.lerpVectors(f.fromTarget, f.toTarget, e)
      if (k >= 1) {
        flight.current = null
        if (f.intro) finishIntro()
      }
      return
    }

    // Follow mode: ease the orbit target onto the subject and carry the camera along.
    const followed = useOfficeStore.getState().followId
    if (followed && getAnchorPosition(followed, followPos)) {
      move.subVectors(followPos, c.target).multiplyScalar(1 - Math.exp(-dt * 4))
      c.target.add(move)
      camera.position.add(move)
    }

    const k = keys.current
    const ax = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
    const az = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    const ay = (k.has('e') ? 1 : 0) - (k.has('q') ? 1 : 0)
    if (!ax && !az && !ay) return
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    right.crossVectors(fwd, camera.up).normalize()
    const speed = THREE.MathUtils.clamp(camera.position.distanceTo(c.target) * 0.8, 3, 22)
    move
      .copy(fwd)
      .multiplyScalar(az)
      .addScaledVector(right, ax)
      .normalize()
      .multiplyScalar(speed * Math.min(dt, 0.05))
    move.y = ay * speed * 0.6 * Math.min(dt, 0.05)
    camera.position.add(move)
    c.target.add(move)
    c.target.x = THREE.MathUtils.clamp(c.target.x, -BOUNDS, BOUNDS)
    c.target.z = THREE.MathUtils.clamp(c.target.z, -BOUNDS, BOUNDS)
    c.target.y = THREE.MathUtils.clamp(c.target.y, 0, 10)
    camera.position.y = Math.max(camera.position.y, 0.6)
    if (followed) follow(null)
    clearActiveView()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={1.2}
      maxDistance={95}
      zoomSpeed={0.9}
      panSpeed={0.9}
      screenSpacePanning={false}
    />
  )
}

/** Held keys, ignoring typing in inputs (the Director chat arrives in Phase 3). */
function useKeys() {
  const keys = useRef(new Set<string>())
  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')
    const down = (e: KeyboardEvent) => {
      if (!typing(e)) keys.current.add(e.key.toLowerCase())
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const clear = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])
  return keys
}
