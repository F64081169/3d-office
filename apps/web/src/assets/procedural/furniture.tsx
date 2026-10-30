import * as THREE from 'three'
import { MAT } from '../materials'
import { Box, cached, Cylinder, GEO, mergeParts, roundedBox, type Part } from '../primitives'
import { rugTexture, screenTexture, type ScreenKind } from '../textures'
import { mulberry32 } from '../../util/random'
import type {
  BookshelfProps,
  ChairProps,
  CoffeeTableProps,
  DeskProps,
  LampProps,
  MonitorProps,
  PendantProps,
  RugProps,
  SofaProps,
  StoolProps,
} from '../AssetProvider'

export const DESK_TOP_Y = 0.75

const DESKS = {
  employee: { w: 1.6, d: 0.8, top: MAT.oak, t: 0.035 },
  manager: { w: 1.9, d: 0.9, top: MAT.oak, t: 0.04 },
  executive: { w: 2.2, d: 1.0, top: MAT.walnut, t: 0.05 },
}

function deskFrameGeometry(variant: 'employee' | 'manager', w: number, d: number, legH: number) {
  return cached(`deskframe:${variant}`, () => {
    const parts: Part[] = []
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - 0.08)
      parts.push(
        { geo: GEO.box, at: [x, legH / 2, -d / 2 + 0.1], scale: [0.05, legH, 0.05] },
        { geo: GEO.box, at: [x, legH / 2, d / 2 - 0.1], scale: [0.05, legH, 0.05] },
        { geo: GEO.box, at: [x, 0.02, 0], scale: [0.05, 0.04, d - 0.15] },
        { geo: GEO.box, at: [x, legH - 0.03, 0], scale: [0.05, 0.05, d - 0.15] },
      )
    }
    return mergeParts(parts)
  })
}

export function Desk({ variant = 'employee', ...props }: DeskProps) {
  const { w, d, top, t } = DESKS[variant]
  const legH = DESK_TOP_Y - t
  return (
    <group {...props}>
      <Box size={[w, t, d]} position={[0, DESK_TOP_Y - t / 2, 0]} material={top} />
      {variant === 'executive' ? (
        <>
          <Box size={[0.08, legH, d - 0.06]} position={[-w / 2 + 0.12, legH / 2, 0]} material={MAT.walnut} />
          <Box size={[0.08, legH, d - 0.06]} position={[w / 2 - 0.12, legH / 2, 0]} material={MAT.walnut} />
          <Box size={[w - 0.3, 0.5, 0.03]} position={[0, legH - 0.27, d / 2 - 0.1]} material={MAT.walnut} />
          <Box size={[w - 0.3, 0.012, 0.035]} position={[0, legH - 0.52, d / 2 - 0.1]} material={MAT.brass} />
        </>
      ) : (
        <>
          <mesh geometry={deskFrameGeometry(variant, w, d, legH)} material={MAT.blackMetal} castShadow receiveShadow />
          {variant === 'employee' && (
            <Box size={[w, 0.42, 0.03]} position={[0, DESK_TOP_Y + 0.21, d / 2 - 0.015]} material={MAT.felt} />
          )}
          {variant === 'manager' && (
            <Box size={[0.42, 0.6, d - 0.2]} position={[w / 2 - 0.36, 0.3, 0]} material={MAT.white} />
          )}
        </>
      )}
    </group>
  )
}

const screenMaterials = new Map<ScreenKind, THREE.MeshBasicMaterial>()
const screenMaterial = (kind: ScreenKind) => {
  if (!screenMaterials.has(kind)) {
    screenMaterials.set(kind, new THREE.MeshBasicMaterial({ map: screenTexture(kind), toneMapped: false }))
  }
  return screenMaterials.get(kind)!
}

/** Monitor standing on a desk top; the screen faces -z (toward the user). */
const monitorBody = (width: number, h: number, cy: number) =>
  cached(`monitor:${width}`, () =>
    mergeParts([
      { geo: GEO.box, at: [0, 0.006, 0.04], scale: [0.24, 0.012, 0.17] },
      { geo: GEO.box, at: [0, 0.16, 0.07], scale: [0.045, 0.3, 0.025] },
      { geo: GEO.box, at: [0, cy, 0.045], scale: [width, h, 0.022] },
    ]),
  )

/** Monitor standing on a desk top; the screen faces -z (toward the user). */
export function Monitor({ screen = 'idle', width = 0.62, ...props }: MonitorProps) {
  const h = width * 0.58
  const cy = 0.12 + h / 2
  return (
    <group {...props}>
      <mesh geometry={monitorBody(width, h, cy)} material={MAT.screenBezel} castShadow receiveShadow />
      <mesh
        geometry={GEO.plane}
        material={screenMaterial(screen)}
        position={[0, cy, 0.033]}
        rotation={[0, Math.PI, 0]}
        scale={[width - 0.02, h - 0.02, 1]}
      />
    </group>
  )
}

const CHAIRS = {
  task: { frame: MAT.blackMetal, fabric: MAT.fabricCharcoal, back: 0.52 },
  meeting: { frame: MAT.aluminium, fabric: MAT.fabricCream, back: 0.46 },
  executive: { frame: MAT.chrome, fabric: MAT.leatherCognac, back: 0.68 },
}

function chairGeometry(back: number) {
  return cached(`chair:${back}`, () => {
    const frame: Part[] = []
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      frame.push({ geo: GEO.box, at: [Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15], rot: [0, a, 0], scale: [0.04, 0.035, 0.3] })
      frame.push({ geo: GEO.sphere, at: [Math.sin(a) * 0.29, 0.028, Math.cos(a) * 0.29], scale: [0.028, 0.028, 0.028] })
    }
    frame.push({ geo: GEO.cylinder, at: [0, 0.24, 0], scale: [0.026, 0.33, 0.026] })
    frame.push({ geo: GEO.box, at: [0, 0.4, 0], scale: [0.3, 0.03, 0.3] })
    frame.push({ geo: GEO.box, at: [0, 0.5, -0.25], rot: [-0.1, 0, 0], scale: [0.05, 0.3, 0.03] })
    for (const s of [-1, 1]) {
      frame.push({ geo: GEO.box, at: [s * 0.25, 0.53, 0.02], scale: [0.03, 0.18, 0.03] })
      frame.push({ geo: GEO.box, at: [s * 0.25, 0.63, 0.02], scale: [0.06, 0.025, 0.26] })
    }
    const fabric: Part[] = [
      { geo: roundedBox(0.5, 0.08, 0.48, 0.035), at: [0, 0.45, 0.02] },
      { geo: roundedBox(0.46, back, 0.06, 0.03), at: [0, 0.62 + back / 2, -0.28], rot: [-0.12, 0, 0] },
    ]
    return { frame: mergeParts(frame), fabric: mergeParts(fabric) }
  })
}

export function Chair({ variant = 'task', ...props }: ChairProps) {
  const c = CHAIRS[variant]
  const g = chairGeometry(c.back)
  return (
    <group {...props}>
      <mesh geometry={g.frame} material={c.frame} castShadow receiveShadow />
      <mesh geometry={g.fabric} material={c.fabric} castShadow receiveShadow />
    </group>
  )
}

const stoolGeometry = () =>
  cached('stool', () => {
    const metal = mergeParts([
      { geo: GEO.cylinder, at: [0, 0.36, 0], scale: [0.028, 0.72, 0.028] },
      { geo: GEO.cylinder, at: [0, 0.012, 0], scale: [0.21, 0.024, 0.21] },
      { geo: new THREE.TorusGeometry(0.16, 0.011, 8, 32), at: [0, 0.3, 0], rot: [Math.PI / 2, 0, 0] },
    ])
    return metal
  })

export function Stool(props: StoolProps) {
  return (
    <group {...props}>
      <mesh geometry={stoolGeometry()} material={MAT.brass} castShadow />
      <mesh geometry={roundedBox(0.4, 0.07, 0.4, 0.03)} position={[0, 0.75, 0]} material={MAT.leatherCognac} castShadow />
    </group>
  )
}

function sofaGeometry(w: number, d: number) {
  return cached(`sofa:${w}:${d}`, () => {
    const arm = 0.18
    const inner = w - arm * 2
    const n = Math.max(1, Math.round(inner / 0.75))
    const cw = inner / n
    const fabric: Part[] = [
      { geo: roundedBox(w, 0.22, d, 0.04), at: [0, 0.2, 0] },
      { geo: roundedBox(arm, 0.5, d, 0.06), at: [-w / 2 + arm / 2, 0.36, 0] },
      { geo: roundedBox(arm, 0.5, d, 0.06), at: [w / 2 - arm / 2, 0.36, 0] },
      { geo: roundedBox(w - 0.02, 0.48, 0.18, 0.06), at: [0, 0.5, -d / 2 + 0.1] },
    ]
    for (let i = 0; i < n; i++) {
      const x = -inner / 2 + cw * (i + 0.5)
      fabric.push({ geo: roundedBox(cw - 0.02, 0.14, d - 0.22, 0.05), at: [x, 0.38, 0.08] })
      fabric.push({ geo: roundedBox(cw - 0.04, 0.4, 0.16, 0.07), at: [x, 0.62, -d / 2 + 0.24], rot: [-0.14, 0, 0] })
    }
    const legs: Part[] = []
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      legs.push({ geo: GEO.cylinder, at: [sx * (w / 2 - 0.08), 0.045, sz * (d / 2 - 0.08)], scale: [0.025, 0.09, 0.025] })
    }
    return { fabric: mergeParts(fabric), legs: mergeParts(legs) }
  })
}

export function Sofa({ width = 2.2, depth = 0.92, fabric = MAT.fabricCream, ...props }: SofaProps) {
  const g = sofaGeometry(width, depth)
  return (
    <group {...props}>
      <mesh geometry={g.fabric} material={fabric} castShadow receiveShadow />
      <mesh geometry={g.legs} material={MAT.brass} />
    </group>
  )
}

export function Armchair({ width = 0.95, depth = 0.85, fabric = MAT.fabricSage, ...props }: SofaProps) {
  return <Sofa width={width} depth={depth} fabric={fabric} {...props} />
}

export function CoffeeTable({ shape = 'round', width = 1.0, depth = 0.6, ...props }: CoffeeTableProps) {
  if (shape === 'round') {
    return (
      <group {...props}>
        <Cylinder r={width / 2} h={0.04} position={[0, 0.4, 0]} material={MAT.marble} />
        <Cylinder r={0.09} h={0.36} position={[0, 0.2, 0]} material={MAT.brass} />
        <Cylinder r={0.28} h={0.02} position={[0, 0.01, 0]} material={MAT.brass} />
      </group>
    )
  }
  return (
    <group {...props}>
      <Box size={[width, 0.05, depth]} position={[0, 0.38, 0]} material={MAT.walnut} />
      <Box size={[width - 0.1, 0.02, depth - 0.1]} position={[0, 0.12, 0]} material={MAT.walnut} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.035, 0.36, 0.035]}
            position={[sx * (width / 2 - 0.05), 0.18, sz * (depth / 2 - 0.05)]}
            material={MAT.blackMetal}
          />
        )),
      )}
    </group>
  )
}

const rugMaterials = new Map<string, THREE.MeshStandardMaterial>()
export function Rug({ width, depth, color = '#d9cfc0', border = '#b9ab97', ...props }: RugProps) {
  const key = color + border
  if (!rugMaterials.has(key)) {
    rugMaterials.set(key, new THREE.MeshStandardMaterial({ map: rugTexture(color, border), roughness: 1 }))
  }
  return (
    <group {...props}>
      <Box size={[width, 0.012, depth]} position={[0, 0.006, 0]} material={rugMaterials.get(key)} cast={false} />
    </group>
  )
}

const shadeGeometry = new THREE.CylinderGeometry(0.2, 0.24, 0.3, 28, 1, true)

export function FloorLamp(props: LampProps) {
  return (
    <group {...props}>
      <Cylinder r={0.17} h={0.04} position={[0, 0.02, 0]} material={MAT.marble} />
      <Cylinder r={0.012} h={1.42} position={[0, 0.72, 0]} material={MAT.brass} />
      <mesh geometry={shadeGeometry} material={MAT.lampShade} position={[0, 1.5, 0]} />
    </group>
  )
}

const domeGeometry = new THREE.SphereGeometry(0.22, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)
const domeMaterial = new THREE.MeshStandardMaterial({ color: '#c9a35b', metalness: 1, roughness: 0.3, side: THREE.DoubleSide })

/** Hangs from its origin (put the origin at ceiling height). */
export function Pendant({ drop = 1.2, style = 'dome', ...props }: PendantProps) {
  return (
    <group {...props}>
      <Cylinder r={0.004} h={drop} position={[0, -drop / 2, 0]} material={MAT.blackMetal} cast={false} />
      {style === 'dome' ? (
        <group position={[0, -drop, 0]}>
          <mesh geometry={domeGeometry} material={domeMaterial} position={[0, -0.12, 0]} scale={[1, 0.7, 1]} />
          <mesh geometry={GEO.sphere} material={MAT.warmGlow} position={[0, -0.1, 0]} scale={0.07} />
        </group>
      ) : (
        <mesh geometry={GEO.sphere} material={MAT.glowGlass} position={[0, -drop - 0.14, 0]} scale={0.15} />
      )}
    </group>
  )
}

const BOOK_COLORS = ['#7d4b3a', '#2f4858', '#c9b79c', '#8c6d46', '#3d5a45', '#b5654a', '#e8e0d2', '#58534c']

function bookshelfGeometry(w: number, h: number, d: number, seed: number) {
  return cached(`shelf:${w}:${h}:${d}:${seed}`, () => {
    const rnd = mulberry32(seed)
    const t = 0.03
    const rows = Math.max(1, Math.round(h / 0.38))
    const frame: Part[] = [
      { geo: GEO.box, at: [-w / 2 + t / 2, h / 2, 0], scale: [t, h, d] },
      { geo: GEO.box, at: [w / 2 - t / 2, h / 2, 0], scale: [t, h, d] },
    ]
    const books: Part[] = []
    for (let r = 0; r <= rows; r++) {
      const y = (r / rows) * (h - t) + t / 2
      frame.push({ geo: GEO.box, at: [0, y, 0], scale: [w, t, d] })
      if (r === rows) break
      let x = -w / 2 + t + 0.02
      const rowTop = ((r + 1) / rows) * (h - t)
      const maxH = Math.min(0.3, rowTop - y - 0.04)
      while (x < w / 2 - t - 0.06) {
        if (rnd() < 0.12) {
          x += 0.12 + rnd() * 0.15
          continue
        }
        const bw = 0.025 + rnd() * 0.03
        const bh = maxH * (0.7 + rnd() * 0.3)
        books.push({
          geo: GEO.box,
          at: [x + bw / 2, y + t / 2 + bh / 2, 0.02],
          scale: [bw, bh, d * 0.75],
          color: BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)],
        })
        x += bw + 0.003
      }
    }
    return { frame: mergeParts(frame), books: mergeParts(books, true) }
  })
}

export function Bookshelf({ width = 1.6, height = 1.1, depth = 0.38, seed = 1, ...props }: BookshelfProps) {
  const g = bookshelfGeometry(width, height, depth, seed)
  return (
    <group {...props}>
      <mesh geometry={g.frame} material={MAT.walnut} castShadow receiveShadow />
      <mesh geometry={g.books} material={MAT.decor} castShadow />
    </group>
  )
}
