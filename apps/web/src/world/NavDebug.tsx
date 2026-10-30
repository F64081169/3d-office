import { useMemo } from 'react'
import * as THREE from 'three'
import { NAV_EDGES, NAV_NODES, SPOTS } from './navigation'

/** Dev overlay (open the app with `?nav`): corridor graph in cyan, spot spurs in pink. */
export function NavDebug() {
  const [corridors, spurs] = useMemo(() => {
    const y = 0.05
    const c: number[] = []
    for (const [a, b] of NAV_EDGES) c.push(NAV_NODES[a][0], y, NAV_NODES[a][1], NAV_NODES[b][0], y, NAV_NODES[b][1])
    const s: number[] = []
    for (const spot of SPOTS) {
      const pts = [NAV_NODES[spot.node], ...spot.via, [spot.position[0], spot.position[2]] as [number, number]]
      for (let i = 0; i < pts.length - 1; i++) s.push(pts[i][0], y, pts[i][1], pts[i + 1][0], y, pts[i + 1][1])
    }
    const geo = (arr: number[]) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    return [geo(c), geo(s)]
  }, [])
  return (
    <group renderOrder={10}>
      <lineSegments geometry={corridors}>
        <lineBasicMaterial color="#00c2ff" depthTest={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={spurs}>
        <lineBasicMaterial color="#ff4fa0" depthTest={false} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

export const SHOW_NAV = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nav')
