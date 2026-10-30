import { HOME_SEATS, type Seat } from '@office/shared'
import * as THREE from 'three'
import { useAssets } from '../../assets/AssetProvider'
import { MAT } from '../../assets/materials'
import { Box, Cylinder, GEO } from '../../assets/primitives'
import { DESK_TOP_Y } from '../../assets/procedural/furniture'
import { signTexture, type ScreenKind } from '../../assets/textures'
import { CEILING_H } from '../layout'

const DESK_DEPTH = { employee: 0.8, manager: 0.9, executive: 1.0 }
const ACCENTS = ['#c0735a', '#33415a', '#8fa38c', '#e0b04c']

/**
 * Chair + desk + monitor laid out in the seat's local frame: the agent sits at the
 * origin facing +z, so the desk sits just in front of them.
 */
export function Workstation({
  seat,
  variant = 'employee',
  screen = 'idle',
  seed = 0,
}: {
  seat: Seat
  variant?: 'employee' | 'manager' | 'executive'
  screen?: ScreenKind
  seed?: number
}) {
  const { Desk, Monitor, Chair, Plant } = useAssets()
  const d = DESK_DEPTH[variant]
  const front = -d / 2 + 0.2
  return (
    <group position={[seat.position.x, 0, seat.position.z]} rotation-y={seat.rotationY}>
      <Chair variant={variant === 'executive' ? 'executive' : 'task'} />
      <group position={[0, 0, 0.4 + d / 2]}>
        <Desk variant={variant} />
        <Monitor screen={screen} position={[variant === 'manager' ? -0.25 : 0, DESK_TOP_Y, d / 2 - 0.3]} />
        {variant === 'manager' && (
          <Monitor screen="dashboard" width={0.5} position={[0.42, DESK_TOP_Y, d / 2 - 0.3]} rotation-y={-0.3} />
        )}
        <Box size={[0.42, 0.015, 0.13]} position={[0, DESK_TOP_Y + 0.008, front]} material={MAT.keyboard} cast={false} />
        <Box size={[0.06, 0.022, 0.1]} position={[0.32, DESK_TOP_Y + 0.011, front]} material={MAT.keyboard} cast={false} />
        <mesh
          geometry={GEO.cylinder}
          scale={[0.04, 0.1, 0.04]}
          position={[-0.55, DESK_TOP_Y + 0.05, front + 0.05]}
          material={seed % 2 ? MAT.ceramic : MAT.potTerracotta}
        />
        <Box
          size={[0.2, 0.018, 0.28]}
          position={[-0.32, DESK_TOP_Y + 0.009, front + 0.08]}
          rotation-y={0.2}
          material={notebookMaterial(ACCENTS[seed % ACCENTS.length])}
          cast={false}
        />
        {seed % 3 !== 1 && <Plant variant="small" pot="white" position={[0.62, DESK_TOP_Y, d / 2 - 0.18]} />}
      </group>
    </group>
  )
}

const notebookMaterials = new Map<string, THREE.Material>()
const notebookMaterial = (c: string) => {
  if (!notebookMaterials.has(c)) notebookMaterials.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }))
  return notebookMaterials.get(c)!
}

/** Department sign hanging over a pod, facing south (toward the main camera). */
export function HangingSign({
  title,
  subtitle,
  accent,
  position,
  rotationY = 0,
  width = 2.4,
}: {
  title: string
  subtitle?: string
  accent: string
  position: [number, number, number]
  rotationY?: number
  width?: number
}) {
  const h = width / 4
  const drop = CEILING_H - position[1] - h / 2
  return (
    <group position={position} rotation-y={rotationY}>
      <Box size={[width + 0.08, h + 0.08, 0.04]} material={MAT.walnut} cast={false} />
      <mesh geometry={GEO.plane} scale={[width, h, 1]} position={[0, 0, 0.022]}>
        <meshBasicMaterial map={signTexture(title, subtitle, accent)} transparent toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <Cylinder
          key={s}
          r={0.004}
          h={drop}
          position={[s * width * 0.4, h / 2 + drop / 2, 0]}
          material={MAT.blackMetal}
          cast={false}
        />
      ))}
    </group>
  )
}

export function Workspace() {
  const { Plant, Bookshelf, Armchair, CoffeeTable, Rug, FloorLamp, Stool } = useAssets()
  return (
    <group>
      <Workstation seat={HOME_SEATS['eng-manager']} variant="manager" screen="dashboard" seed={1} />
      <Workstation seat={HOME_SEATS['eng-a']} screen="idle" seed={2} />
      <Workstation seat={HOME_SEATS['eng-b']} screen="idle" seed={3} />
      <Workstation seat={HOME_SEATS['eng-c']} screen="idle" seed={4} />
      <Workstation seat={HOME_SEATS['research-manager']} variant="manager" screen="dashboard" seed={5} />
      <Workstation seat={HOME_SEATS['research-a']} screen="idle" seed={6} />
      <Workstation seat={HOME_SEATS['research-b']} screen="idle" seed={7} />
      <Workstation seat={HOME_SEATS['qa-agent']} screen="idle" seed={8} />

      <HangingSign title="ENGINEERING" accent="#3b9fd8" position={[-10, 2.55, -0.6]} />
      <HangingSign title="RESEARCH" accent="#e08a3c" position={[4, 2.55, -0.6]} />

      {/* Planted divider between the two pods */}
      <Bookshelf width={2.4} height={1.05} seed={3} position={[-2.8, 0, 0.2]} rotation-y={Math.PI / 2} />
      <Plant variant="small" pot="charcoal" position={[-2.8, 1.05, -0.6]} />
      <Plant variant="olive" pot="stone" position={[-2.8, 0, -2.3]} />
      <Plant variant="fiddle" pot="white" position={[-2.8, 0, 2.6]} rotation-y={1.2} />
      <Plant variant="bush" pot="terracotta" position={[-14.6, 0, 3.6]} />
      <Plant variant="snake" pot="charcoal" position={[8.6, 0, 3.6]} />

      {/* Window reading nook (west) */}
      <Rug width={3.6} depth={3.2} color="#cbbba4" border="#a8957b" position={[-17.6, 0, -0.3]} />
      <Armchair position={[-19, 0, -0.9]} rotation-y={Math.PI / 2} />
      <Armchair position={[-19, 0, 0.6]} rotation-y={Math.PI / 2} fabric={MAT.fabricTerracotta} />
      <CoffeeTable shape="round" width={0.7} position={[-17.7, 0, -0.15]} />
      <FloorLamp position={[-19.3, 0, 1.7]} />
      <Plant variant="fiddle" pot="terracotta" position={[-19.2, 0, -2.6]} rotation-y={2} />
      <Bookshelf width={1.8} height={1.6} seed={9} position={[-16.2, 0, -3.6]} />

      {/* Huddle table (east) */}
      <Cylinder r={0.45} h={0.04} position={[10, 1.03, -0.2]} material={MAT.oak} />
      <Cylinder r={0.04} h={1.0} position={[10, 0.5, -0.2]} material={MAT.blackMetal} />
      <Cylinder r={0.25} h={0.03} position={[10, 0.015, -0.2]} material={MAT.blackMetal} />
      <Stool position={[10, 0, 0.55]} rotation-y={Math.PI} />
      <Stool position={[10, 0, -0.95]} />
    </group>
  )
}
