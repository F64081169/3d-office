import { NAV_SEGMENTS, placeFor, type AgentStatus, type Place, type XZ } from '@office/shared'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useOfficeStore } from '../store/officeStore'
import { CAT_SPOTS } from './cat/catSpots'

const STATUSES: AgentStatus[] = ['idle', 'meeting', 'reporting', 'break']

/**
 * Dev overlay (open the app with `?nav`): corridor graph in cyan, agents' place spurs
 * in amber, the cat's spots in pink.
 */
export function NavDebug() {
  const [corridors, agentSpurs, catSpurs] = useMemo(() => {
    const agents = useOfficeStore.getState().agents
    const y = 0.05
    const lines = (segments: [XZ, XZ][]) =>
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(segments.flatMap(([a, b]) => [a[0], y, a[1], b[0], y, b[1]]), 3),
      )
    const spur = (p: Place): [XZ, XZ][] => {
      const pts = [p.entry, ...p.via, p.position]
      return pts.slice(0, -1).map((q, i) => [q, pts[i + 1]] as [XZ, XZ])
    }
    const places = new Map(agents.flatMap((a) => STATUSES.map((st) => placeFor(a, st, agents))).map((p) => [p.key, p]))
    return [lines(NAV_SEGMENTS), lines([...places.values()].flatMap(spur)), lines(CAT_SPOTS.flatMap(spur))]
  }, [])
  return (
    <group renderOrder={10}>
      <lineSegments geometry={corridors}>
        <lineBasicMaterial color="#00c2ff" depthTest={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={agentSpurs}>
        <lineBasicMaterial color="#ffb020" depthTest={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={catSpurs}>
        <lineBasicMaterial color="#ff4fa0" depthTest={false} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

export const SHOW_NAV = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nav')
