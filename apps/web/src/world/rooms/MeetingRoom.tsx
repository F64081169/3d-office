import { useAssets } from '../../assets/AssetProvider'
import { MAT } from '../../assets/materials'
import { Box, Cylinder, GEO } from '../../assets/primitives'
import { glowTexture, meetingScreenTexture } from '../../assets/textures'
import { GlassWall } from '../Building'
import { CEILING_H, MEETING_SEATS, MEETING_TABLE, ZONES } from '../layout'
import { HangingSign } from './Workspace'
import * as THREE from 'three'

const Z = ZONES.meeting
const T = MEETING_TABLE

export function MeetingRoom() {
  const { Chair, Plant, Pendant } = useAssets()
  const straight = T.length - T.width
  return (
    <group>
      <GlassWall axis="x" at={Z.maxZ} from={Z.minX + 0.08} to={Z.maxX} spacing={1.25} gaps={[[-2.8, -1.6]]} />
      <GlassWall axis="z" at={Z.maxX} from={Z.minZ} to={Z.maxZ} spacing={1.25} />
      <HangingSign title="MEETING" subtitle="BOARD ROOM" accent="#3b9fd8" position={[-6.5, 2.75, -5.85]} width={1.8} />

      {/* Racetrack table */}
      <group position={[T.x, 0, T.z]}>
        <Box size={[straight, 0.05, T.width]} position={[0, 0.735, 0]} material={MAT.walnut} />
        {[-1, 1].map((s) => (
          <Cylinder key={s} r={T.width / 2} h={0.05} position={[(s * straight) / 2, 0.735, 0]} material={MAT.walnut} />
        ))}
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.5, 0.71, 0.6]} position={[s * 1.4, 0.355, 0]} material={MAT.blackMetal} />
        ))}
        <Box size={[straight * 0.7, 0.008, 0.08]} position={[0, 0.764, 0]} material={MAT.brass} cast={false} />
      </group>
      {MEETING_SEATS.map((s, i) => (
        <Chair key={i} variant="meeting" position={[s.position.x, 0, s.position.z]} rotation-y={s.rotationY} />
      ))}

      {/* Wall display on the shared wall with the Director's office */}
      <group position={[Z.minX + 0.1, 1.55, T.z]} rotation-y={Math.PI / 2}>
        <Box size={[3.3, 1.9, 0.05]} material={MAT.screenBezel} cast={false} />
        <mesh geometry={GEO.plane} scale={[3.2, 1.8, 1]} position={[0, 0, 0.026]}>
          <meshBasicMaterial map={meetingScreenTexture()} toneMapped={false} />
        </mesh>
        <mesh geometry={GEO.plane} scale={[5, 3.2, 1]} position={[0, 0, -0.03]}>
          <meshBasicMaterial
            map={glowTexture()}
            color="#7fb6e6"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <Box size={[0.42, 0.5, 3.4]} position={[Z.minX + 0.3, 0.25, T.z]} material={MAT.walnut} />

      <Pendant style="globe" drop={1.15} position={[T.x - 1.4, CEILING_H, T.z]} />
      <Pendant style="globe" drop={1.15} position={[T.x + 1.4, CEILING_H, T.z]} />
      <Plant variant="snake" pot="charcoal" position={[Z.maxX - 0.5, 0, Z.minZ + 0.5]} />
      <Plant variant="fiddle" pot="white" position={[Z.maxX - 0.6, 0, Z.maxZ - 0.6]} rotation-y={0.7} />
    </group>
  )
}
