import * as THREE from 'three'
import { useAssets } from '../../assets/AssetProvider'
import { MAT } from '../../assets/materials'
import { Box, GEO } from '../../assets/primitives'
import { artTexture, glowTexture, signTexture } from '../../assets/textures'
import { SolidWall } from '../Building'
import { CEILING_H, ZONES } from '../layout'

const C = ZONES.elevators
const FACE_Z = C.minZ - 0.02

/** Elevator core with backlit brand wall, plus the reception lounge (where the Owner arrives). */
export function Lobby() {
  const { Sofa, Armchair, CoffeeTable, Rug, Plant } = useAssets()
  return (
    <group>
      <SolidWall x0={C.minX} z0={(C.minZ + C.maxZ) / 2} x1={C.maxX} z1={(C.minZ + C.maxZ) / 2} thickness={C.maxZ - C.minZ} material={MAT.travertine} />
      <Box size={[C.maxX - C.minX, CEILING_H, 0.04]} position={[0, CEILING_H / 2, FACE_Z]} material={MAT.walnut} cast={false} />

      {[-3.3, 3.3].map((x) => (
        <group key={x} position={[x, 0, FACE_Z - 0.03]}>
          <Box size={[1.5, 2.55, 0.05]} position={[0, 1.275, 0]} material={MAT.blackMetal} cast={false} />
          <Box size={[0.64, 2.36, 0.02]} position={[-0.33, 1.18, -0.03]} material={MAT.aluminium} cast={false} />
          <Box size={[0.64, 2.36, 0.02]} position={[0.33, 1.18, -0.03]} material={MAT.aluminium} cast={false} />
          <Box size={[0.08, 0.18, 0.02]} position={[0.95, 1.2, -0.01]} material={MAT.brass} cast={false} />
        </group>
      ))}

      {/* Backlit brand sign */}
      <mesh geometry={GEO.plane} scale={[5.5, 2.4, 1]} position={[0, 1.9, FACE_Z - 0.03]} rotation-y={Math.PI}>
        <meshBasicMaterial
          map={glowTexture()}
          color="#ffb98a"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={GEO.plane} scale={[3.8, 0.95, 1]} position={[0, 1.95, FACE_Z - 0.05]} rotation-y={Math.PI}>
        <meshBasicMaterial map={signTexture('CLAUDE OFFICE', 'AI AGENT COMPANY')} transparent toneMapped={false} />
      </mesh>

      {/* Art on the west face of the core */}
      <group position={[C.minX - 0.04, 1.65, 10.5]} rotation-y={-Math.PI / 2}>
        <Box size={[1.3, 1.6, 0.04]} material={MAT.walnut} cast={false} />
        <mesh geometry={GEO.plane} scale={[1.2, 1.5, 1]} position={[0, 0, 0.021]}>
          <meshStandardMaterial map={artTexture()} roughness={0.9} />
        </mesh>
      </group>

      {/* Reception lounge */}
      <Rug width={6.2} depth={4.2} color="#d3c6b2" border="#a99577" position={[-12.6, 0, 9.4]} />
      <Sofa width={2.8} position={[-12.6, 0, 11.1]} rotation-y={Math.PI} fabric={MAT.fabricSage} />
      <Armchair position={[-15.1, 0, 8.6]} rotation-y={Math.PI / 2 + 0.3} fabric={MAT.fabricCream} />
      <Armchair position={[-10.1, 0, 8.6]} rotation-y={-Math.PI / 2 - 0.3} fabric={MAT.fabricCream} />
      <CoffeeTable shape="rect" width={1.4} depth={0.7} position={[-12.6, 0, 9.3]} />
      <Plant variant="olive" pot="stone" position={[-19.2, 0, 12.2]} />
      <Plant variant="fiddle" pot="white" position={[-6, 0, 12.3]} />
      <Plant variant="bush" pot="charcoal" position={[-19.2, 0, 5.9]} />
      <Plant variant="snake" pot="white" position={[6.5, 0, 12.4]} />
    </group>
  )
}
