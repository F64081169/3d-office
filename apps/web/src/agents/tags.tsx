import type { Agent } from '@office/shared'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useOfficeStore } from '../store/officeStore'
import { DEPT_COLOR, STATUS_META } from './status'

/**
 * Agent name tags live in one plain DOM layer (rendered by the HUD), not in nine
 * separate drei <Html> roots. Avatars register a 3D anchor, the HUD registers a
 * DOM element, and <TagProjector> moves each element to its anchor every frame.
 */
const anchors = new Map<string, THREE.Object3D>()
const elements = new Map<string, HTMLDivElement>()
/** Opaque walls that hide tags behind them (glass does not). */
const occluders: THREE.Object3D[] = []

export const registerOccluder = (obj: THREE.Object3D) => {
  occluders.push(obj)
  return () => {
    occluders.splice(occluders.indexOf(obj), 1)
  }
}

export const registerTagAnchor = (id: string, obj: THREE.Object3D | null) => {
  if (obj) anchors.set(id, obj)
  else anchors.delete(id)
}

const registerTagElement = (id: string, el: HTMLDivElement | null) => {
  if (el) elements.set(id, el)
  else elements.delete(id)
}

/** Distance thresholds for the label level-of-detail. */
const LOD = { near: 16, far: 75 }

export function TagProjector() {
  const size = useThree((s) => s.size)
  const v = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const ray = useMemo(() => new THREE.Raycaster(), [])
  useFrame(({ camera }) => {
    const hovered = useOfficeStore.getState().hoveredAgentId
    for (const [id, el] of elements) {
      const anchor = anchors.get(id)
      if (!anchor) continue
      anchor.getWorldPosition(v)
      const dist = camera.position.distanceTo(v)
      ray.set(camera.position, dir.subVectors(v, camera.position).normalize())
      ray.far = dist
      const occluded = ray.intersectObjects(occluders, false).length > 0
      v.project(camera)
      const visible = !occluded && v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2
      const lod = !visible ? 'hidden' : id === hovered || dist < LOD.near ? 'near' : dist < LOD.far ? 'far' : 'hidden'
      if (el.dataset.lod !== lod) el.dataset.lod = lod
      if (lod === 'hidden') continue
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
      el.style.zIndex = String(id === hovered ? 1000 : 900 - Math.round(dist))
    }
  })
  return null
}

export function AgentTags() {
  const agents = useOfficeStore((s) => s.agents)
  return (
    <div className="tag-layer">
      {agents.map((a) => (
        <AgentTag key={a.id} agent={a} />
      ))}
    </div>
  )
}

function AgentTag({ agent }: { agent: Agent }) {
  const status = STATUS_META[agent.status]
  return (
    <div
      ref={(el) => registerTagElement(agent.id, el)}
      className="agent-tag"
      data-lod="hidden"
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
