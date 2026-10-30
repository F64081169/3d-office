import type { Agent } from '@office/shared'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { CAT_ID, useOfficeStore, type FloatEffect } from '../store/officeStore'
import { CAT_ACTIVITY, CAT_COLOR, CAT_NAME } from '../world/cat/catInfo'
import { CoinIcon, PawIcon } from '../ui/icons'
import { DEPT_COLOR, STATUS_META } from './status'

/**
 * Name tags and floating effects live in one plain DOM layer (rendered by the HUD),
 * not in separate drei <Html> roots. 3D objects register an anchor, the HUD registers
 * DOM elements, and <TagProjector> moves each element to its anchor every frame.
 */
const anchors = new Map<string, THREE.Object3D>()
const tagElements = new Map<string, HTMLDivElement>()
const effectElements = new Map<HTMLDivElement, string>()
/** Opaque walls that hide tags behind them (glass does not). */
const occluders: THREE.Object3D[] = []

export const registerTagAnchor = (id: string, obj: THREE.Object3D | null) => {
  if (obj) anchors.set(id, obj)
  else anchors.delete(id)
}

/** World position of a registered anchor (agents, the cat). Used by the camera follow mode. */
export const getAnchorPosition = (id: string, out: THREE.Vector3) => {
  const anchor = anchors.get(id)
  if (!anchor) return false
  anchor.getWorldPosition(out)
  return true
}

export const registerOccluder = (obj: THREE.Object3D) => {
  occluders.push(obj)
  return () => {
    occluders.splice(occluders.indexOf(obj), 1)
  }
}

const registerTag = (id: string) => (el: HTMLDivElement | null) => {
  if (el) tagElements.set(id, el)
  else tagElements.delete(id)
}

/** Distance thresholds for the label level-of-detail. */
const LOD = { near: 16, far: 75 }

export function TagProjector() {
  const size = useThree((s) => s.size)
  const v = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const ray = useMemo(() => new THREE.Raycaster(), [])

  useFrame(({ camera }) => {
    const { hoveredId, selectedId } = useOfficeStore.getState()

    /** Projects an anchor; returns distance, or -1 when off-screen / behind a wall. */
    const project = (id: string) => {
      const anchor = anchors.get(id)
      if (!anchor) return -1
      anchor.getWorldPosition(v)
      const dist = camera.position.distanceTo(v)
      ray.set(camera.position, dir.subVectors(v, camera.position).normalize())
      ray.far = dist
      if (ray.intersectObjects(occluders, false).length > 0) return -1
      v.project(camera)
      if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) return -1
      return dist
    }
    const place = (el: HTMLElement, z: number) => {
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
      el.style.zIndex = String(z)
    }

    for (const [id, el] of tagElements) {
      const dist = project(id)
      const focus = id === hoveredId || id === selectedId
      const lod = dist < 0 ? 'hidden' : focus || dist < LOD.near ? 'near' : dist < LOD.far ? 'far' : 'hidden'
      if (el.dataset.lod !== lod) el.dataset.lod = lod
      if (lod !== 'hidden') place(el, focus ? 1000 : 900 - Math.round(dist))
    }
    for (const [el, anchorId] of effectElements) {
      const dist = project(anchorId)
      el.style.display = dist < 0 ? 'none' : ''
      if (dist >= 0) place(el, 1100)
    }
  })
  return null
}

export function AgentTags() {
  const agents = useOfficeStore((s) => s.agents)
  const effects = useOfficeStore((s) => s.effects)
  return (
    <div className="tag-layer">
      {agents.map((a) => (
        <AgentTag key={a.id} agent={a} />
      ))}
      <CatTag />
      {effects.map((e) => (
        <FloatingEffect key={e.id} effect={e} />
      ))}
    </div>
  )
}

function AgentTag({ agent }: { agent: Agent }) {
  const selected = useOfficeStore((s) => s.selectedId === agent.id)
  const status = STATUS_META[agent.status]
  return (
    <div
      ref={registerTag(agent.id)}
      className="agent-tag"
      data-lod="hidden"
      data-status={agent.status}
      data-selected={selected || undefined}
      style={{ '--dept': DEPT_COLOR[agent.department], '--status': status.color } as React.CSSProperties}
    >
      <div className="agent-tag__name">{agent.name}</div>
      <div className="agent-tag__role">{agent.role}</div>
      <div className="agent-tag__status">
        <i />
        {status.label}
      </div>
    </div>
  )
}

function CatTag() {
  const cat = useOfficeStore((s) => s.cat)
  const selected = useOfficeStore((s) => s.selectedId === CAT_ID)
  const activity = CAT_ACTIVITY[cat.activity]
  return (
    <div
      ref={registerTag(CAT_ID)}
      className="agent-tag agent-tag--cat"
      data-lod="hidden"
      data-selected={selected || undefined}
      style={{ '--dept': CAT_COLOR, '--status': activity.color } as React.CSSProperties}
    >
      <div className="agent-tag__name">
        <PawIcon /> {CAT_NAME}
      </div>
      <div className="agent-tag__role">Office Cat</div>
      <div className="agent-tag__status">
        <i />
        {activity.label}
      </div>
    </div>
  )
}

function FloatingEffect({ effect }: { effect: FloatEffect }) {
  return (
    <div
      ref={(el) => {
        if (!el) return
        effectElements.set(el, effect.anchorId)
        return () => {
          effectElements.delete(el)
        }
      }}
      className="float-effect"
      data-kind={effect.kind}
      style={{ display: 'none' }}
    >
      <span>
        {effect.kind === 'coins' && <CoinIcon />}
        {effect.text}
      </span>
    </div>
  )
}
