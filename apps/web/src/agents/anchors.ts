import * as THREE from 'three'

/**
 * Live 3D anchors (above each agent's head, and the cat's). Tags project onto them,
 * the camera follows them and "focus agent" frames them where they are right now.
 */
const anchors = new Map<string, THREE.Object3D>()
const v = new THREE.Vector3()

export const registerTagAnchor = (id: string, obj: THREE.Object3D | null) => {
  if (obj) anchors.set(id, obj)
  else anchors.delete(id)
}

export const getAnchor = (id: string) => anchors.get(id)

/** World position of a registered anchor; false if it is not mounted. */
export function getAnchorPosition(id: string, out: THREE.Vector3) {
  const anchor = anchors.get(id)
  if (!anchor) return false
  anchor.getWorldPosition(out)
  return true
}

/** Where an agent stands and which way it faces right now (floor position + yaw). */
export function getAnchorPose(id: string) {
  const anchor = anchors.get(id)
  if (!anchor) return null
  anchor.getWorldPosition(v)
  const { x, z } = v
  anchor.getWorldDirection(v)
  return { x, z, yaw: Math.atan2(v.x, v.z) }
}
