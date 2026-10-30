import { useLayoutEffect, useRef } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type V3 = [number, number, number]

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 28),
  sphere: new THREE.SphereGeometry(1, 28, 18),
}

type MeshProps = Omit<ThreeElements['mesh'], 'scale'>

/** Unit box scaled to `size`. Shadows on by default; pass cast/receive={false} to opt out. */
export function Box({
  size,
  cast = true,
  receive = true,
  ...props
}: MeshProps & { size: V3; cast?: boolean; receive?: boolean }) {
  return <mesh geometry={GEO.box} scale={size} castShadow={cast} receiveShadow={receive} {...props} />
}

export function Cylinder({
  r,
  h,
  cast = true,
  receive = true,
  ...props
}: MeshProps & { r: number; h: number; cast?: boolean; receive?: boolean }) {
  return <mesh geometry={GEO.cylinder} scale={[r, h, r]} castShadow={cast} receiveShadow={receive} {...props} />
}

const cache = new Map<string, unknown>()
/** Build-once cache for generated geometry (keyed by its parameters). */
export function cached<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key) as T
}

export const roundedBox = (w: number, h: number, d: number, r = 0.03) =>
  cached(`rb:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r))

/**
 * Box whose UVs are scaled to world units (one texture tile = `tile` metres),
 * so stone/wood textures keep their real-world scale on walls of any length.
 */
export function worldBox(w: number, h: number, d: number, tile = 2.4) {
  return cached(`wb:${w}:${h}:${d}:${tile}`, () => {
    const g = new THREE.BoxGeometry(w, h, d)
    const uv = g.attributes.uv as THREE.BufferAttribute
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each).
    const faceDims: [number, number][] = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ]
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v
        uv.setXY(i, (uv.getX(i) * faceDims[f][0]) / tile, (uv.getY(i) * faceDims[f][1]) / tile)
      }
    }
    return g
  })
}

export type InstanceItem = { position: V3; rotation?: V3; scale?: V3; color?: THREE.ColorRepresentation }

/** Static InstancedMesh: matrices are written once, one draw call for all items. */
export function StaticInstances({
  geometry,
  material,
  items,
  cast = true,
  receive = true,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  items: InstanceItem[]
  cast?: boolean
  receive?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const mesh = ref.current
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      p.set(...it.position)
      q.setFromEuler(e.set(...(it.rotation ?? [0, 0, 0])))
      s.set(...(it.scale ?? [1, 1, 1]))
      mesh.setMatrixAt(i, m.compose(p, q, s))
      if (it.color !== undefined) mesh.setColorAt(i, c.set(it.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={cast} receiveShadow={receive} />
}

export type Part = {
  geo: THREE.BufferGeometry
  at?: V3
  rot?: V3
  scale?: V3
  color?: THREE.ColorRepresentation
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

/**
 * Bake many primitive parts into one geometry (one draw call). With `vertexColors`,
 * each part's `color` is written per-vertex so differently coloured parts can share
 * a single material (see MAT.foliage / MAT.decor).
 */
export function mergeParts(parts: Part[], vertexColors = false) {
  const list = parts.map(({ geo, at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], color = '#ffffff' }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone()
    g.applyMatrix4(_m.compose(_p.set(...at), _q.setFromEuler(_e.set(...rot)), _s.set(...scale)))
    if (vertexColors) {
      const col = new THREE.Color(color)
      const n = g.attributes.position.count
      const arr = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) arr.set([col.r, col.g, col.b], i * 3)
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    }
    return g
  })
  const merged = mergeGeometries(list)!
  merged.computeBoundingSphere()
  return merged
}
