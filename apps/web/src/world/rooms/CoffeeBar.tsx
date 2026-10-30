import { useAssets } from '../../assets/AssetProvider'
import { MAT } from '../../assets/materials'
import { Box, cached, Cylinder, GEO, mergeParts } from '../../assets/primitives'
import { CEILING_H, ZONES } from '../layout'
import { HangingSign } from './Workspace'

const Z = ZONES.coffee
const ISLAND = { x: 15.2, z: -8.6, length: 3.8 }
const BACK_X = Z.maxX - 0.42

const cupsGeometry = () =>
  cached('cups', () =>
    mergeParts(
      Array.from({ length: 12 }, (_, i) => ({
        geo: GEO.cylinder,
        at: [0, 0.045 + Math.floor(i / 6) * 0.1, (i % 6) * 0.11] as [number, number, number],
        scale: [0.04, 0.09, 0.04] as [number, number, number],
        color: i % 3 === 0 ? '#c0735a' : '#f4f1ea',
      })),
      true,
    ),
  )

export function CoffeeBar() {
  const { Stool, Pendant, Plant } = useAssets()
  return (
    <group>
      <HangingSign title="COFFEE BAR" accent="#d97757" position={[15.6, 2.75, -4.4]} width={1.8} />

      {/* Island */}
      <Box size={[1.0, 0.88, ISLAND.length - 0.2]} position={[ISLAND.x, 0.44, ISLAND.z]} material={MAT.walnut} />
      <Box size={[1.15, 0.05, ISLAND.length]} position={[ISLAND.x, 0.905, ISLAND.z]} material={MAT.marble} />
      {[-1.2, 0, 1.2].map((dz) => (
        <Stool key={dz} position={[ISLAND.x - 0.95, 0, ISLAND.z + dz]} rotation-y={Math.PI / 2} />
      ))}
      {[-1.2, 0, 1.2].map((dz) => (
        <Pendant key={dz} style="dome" drop={1.3} position={[ISLAND.x, CEILING_H, ISLAND.z + dz]} />
      ))}
      <mesh geometry={cupsGeometry()} material={MAT.decor} position={[ISLAND.x + 0.25, 0.93, ISLAND.z - 0.6]} castShadow />

      {/* Back counter along the east glazing */}
      <Box size={[0.62, 0.88, 5.6]} position={[BACK_X, 0.44, -9.4]} material={MAT.white} />
      <Box size={[0.66, 0.05, 5.7]} position={[BACK_X, 0.905, -9.4]} material={MAT.marble} />
      <group position={[BACK_X, 0.93, -10.6]} rotation-y={-Math.PI / 2}>
        <Box size={[0.7, 0.42, 0.5]} position={[0, 0.21, 0]} material={MAT.chrome} />
        <Box size={[0.72, 0.06, 0.52]} position={[0, 0.45, 0]} material={MAT.blackMetal} />
        {[-0.17, 0.17].map((x) => (
          <Cylinder key={x} r={0.04} h={0.08} position={[x, 0.16, 0.27]} material={MAT.blackMetal} />
        ))}
      </group>
      <Cylinder r={0.08} h={0.38} position={[BACK_X, 1.12, -9.7]} material={MAT.blackMetal} />
      <Box size={[0.4, 0.03, 0.5]} position={[BACK_X, 0.945, -8.6]} material={MAT.walnut} />
      <mesh geometry={cupsGeometry()} material={MAT.decor} position={[BACK_X - 0.05, 0.96, -8.86]} castShadow />
      <Box size={[0.75, 1.9, 0.75]} position={[Z.maxX - 0.5, 0.95, -5.9]} material={MAT.chrome} />

      <Plant variant="bush" pot="white" position={[12.3, 0, -12.3]} />
      <Plant variant="snake" pot="terracotta" position={[19.4, 0, -12.5]} />
    </group>
  )
}
