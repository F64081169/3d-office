import { HOME_SEATS } from '@office/shared'
import { useMemo } from 'react'
import { useAssets } from '../../assets/AssetProvider'
import { MAT } from '../../assets/materials'
import { Box, cached, GEO, mergeParts, StaticInstances, type InstanceItem } from '../../assets/primitives'
import { GlassWall, SolidWall } from '../Building'
import { CEILING_H, ZONES } from '../layout'
import { HangingSign, Workstation } from './Workspace'

const Z = ZONES.director

/** Small gold cups on the credenza: the company's performance culture, made visible. */
const trophyGeometry = () =>
  cached('trophies', () =>
    mergeParts(
      [0, 1, 2].flatMap((i) => {
        const x = i * 0.32
        const s = 1 - i * 0.18
        return [
          { geo: GEO.box, at: [x, 0.03 * s, 0] as [number, number, number], scale: [0.12 * s, 0.06 * s, 0.12 * s] as [number, number, number] },
          { geo: GEO.cylinder, at: [x, 0.12 * s, 0] as [number, number, number], scale: [0.015, 0.12 * s, 0.015] as [number, number, number] },
          { geo: GEO.sphere, at: [x, 0.26 * s, 0] as [number, number, number], scale: [0.08 * s, 0.1 * s, 0.08 * s] as [number, number, number] },
        ]
      }),
    ),
  )

export function DirectorOffice() {
  const { Chair, Sofa, CoffeeTable, Rug, Plant, FloorLamp } = useAssets()
  const seat = HOME_SEATS.director
  const slats = useMemo(() => {
    const items: InstanceItem[] = []
    for (let z = Z.minZ + 0.1; z < Z.maxZ - 0.05; z += 0.12) {
      items.push({ position: [Z.maxX - 0.12, CEILING_H / 2, z], scale: [0.04, CEILING_H, 0.06] })
    }
    return items
  }, [])
  return (
    <group>
      <SolidWall x0={Z.maxX} z0={Z.minZ} x1={Z.maxX} z1={Z.maxZ} thickness={0.16} />
      <StaticInstances geometry={GEO.box} material={MAT.walnut} items={slats} />
      <GlassWall axis="x" at={Z.maxZ} from={Z.minX} to={Z.maxX - 0.08} spacing={1.25} gaps={[[-12.9, -11.7]]} />
      <HangingSign title="DIRECTOR" subtitle="EXECUTIVE OFFICE" accent="#c9a24d" position={[-14.8, 2.75, -5.85]} width={1.8} />

      <Rug width={4.2} depth={3.4} color="#d6c9b5" border="#9c8a70" position={[seat.position.x, 0, -9.3]} />
      <Workstation seat={seat} variant="executive" screen="dashboard" />
      <Chair variant="meeting" position={[seat.position.x - 0.55, 0, -8.05]} rotation-y={Math.PI} />
      <Chair variant="meeting" position={[seat.position.x + 0.55, 0, -8.05]} rotation-y={Math.PI} />

      {/* Credenza with trophies under the north window */}
      <Box size={[3.6, 0.62, 0.45]} position={[seat.position.x, 0.31, Z.minZ + 0.45]} material={MAT.walnut} />
      <Box size={[3.62, 0.012, 0.47]} position={[seat.position.x, 0.626, Z.minZ + 0.45]} material={MAT.brass} cast={false} />
      <mesh geometry={trophyGeometry()} material={MAT.brass} position={[seat.position.x - 1.3, 0.632, Z.minZ + 0.45]} castShadow />
      <Plant variant="small" pot="charcoal" position={[seat.position.x + 1.4, 0.632, Z.minZ + 0.45]} />

      {/* Lounge corner by the west window */}
      <Rug width={2.6} depth={3.2} color="#e3d9ca" border="#c2b39c" position={[-18.3, 0, -9.6]} />
      <Sofa width={2.4} position={[-19.35, 0, -9.6]} rotation-y={Math.PI / 2} fabric={MAT.fabricNavy} />
      <CoffeeTable shape="round" width={0.8} position={[-17.8, 0, -9.6]} />
      <FloorLamp position={[-19.4, 0, -11.4]} />
      <Plant variant="fiddle" pot="white" position={[-11.3, 0, -12.3]} />
      <Plant variant="bush" pot="stone" position={[-19.3, 0, -6.8]} />
    </group>
  )
}
