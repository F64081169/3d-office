import * as THREE from 'three'
import { MAT } from '../materials'
import { cached, GEO, mergeParts, type Part } from '../primitives'
import { mulberry32 } from '../../util/random'
import type { PlantProps, PlantVariant, PotStyle } from '../AssetProvider'

const GREENS = ['#2f5d3a', '#3e7445', '#56894a', '#6d9a55']
const leafGeo = new THREE.IcosahedronGeometry(1, 0)
const blobGeo = new THREE.IcosahedronGeometry(1, 1)
const bladeGeo = new THREE.ConeGeometry(1, 1, 4)

const POTS: Record<PotStyle, THREE.Material> = {
  white: MAT.potWhite,
  terracotta: MAT.potTerracotta,
  charcoal: MAT.potCharcoal,
  stone: MAT.potStone,
}

type PlantSpec = { pot: [number, number, number]; build: (rnd: () => number, top: number) => Part[] }

const SPECS: Record<PlantVariant, PlantSpec> = {
  fiddle: {
    pot: [0.24, 0.19, 0.5],
    build: (rnd, top) => {
      const parts: Part[] = [{ geo: GEO.cylinder, at: [0, top + 0.6, 0], scale: [0.025, 1.2, 0.025], color: '#5a4030' }]
      for (let i = 0; i < 11; i++) {
        const a = rnd() * Math.PI * 2
        const y = top + 0.75 + (i / 11) * 1.0
        const r = 0.12 + rnd() * 0.18
        parts.push({
          geo: leafGeo,
          at: [Math.cos(a) * r, y, Math.sin(a) * r],
          rot: [rnd(), a, rnd()],
          scale: [0.2, 0.06, 0.26],
          color: GREENS[i % 3],
        })
      }
      return parts
    },
  },
  bush: {
    pot: [0.34, 0.28, 0.42],
    build: (rnd, top) =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        const s = 0.22 + rnd() * 0.12
        return {
          geo: blobGeo,
          at: [Math.cos(a) * 0.14, top + 0.2 + rnd() * 0.25, Math.sin(a) * 0.14] as [number, number, number],
          scale: [s, s * 0.9, s] as [number, number, number],
          color: GREENS[(i + 1) % 4],
        }
      }),
  },
  snake: {
    pot: [0.17, 0.14, 0.34],
    build: (rnd, top) =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2
        const h = 0.45 + rnd() * 0.4
        return {
          geo: bladeGeo,
          at: [Math.cos(a) * 0.06, top + h / 2, Math.sin(a) * 0.06] as [number, number, number],
          rot: [Math.sin(a) * 0.15, a, Math.cos(a) * 0.15] as [number, number, number],
          scale: [0.045, h, 0.012] as [number, number, number],
          color: i % 3 === 0 ? '#7f9a4a' : '#2f5a3c',
        }
      }),
  },
  olive: {
    pot: [0.3, 0.25, 0.58],
    build: (rnd, top) => {
      const parts: Part[] = [{ geo: GEO.cylinder, at: [0, top + 0.55, 0], scale: [0.035, 1.1, 0.035], color: '#6b5847' }]
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const s = 0.24 + rnd() * 0.14
        parts.push({
          geo: blobGeo,
          at: [Math.cos(a) * 0.22, top + 1.15 + rnd() * 0.45, Math.sin(a) * 0.22],
          scale: [s, s * 0.85, s],
          color: ['#7c9470', '#8ea37f', '#6b8562'][i % 3],
        })
      }
      return parts
    },
  },
  small: {
    pot: [0.07, 0.055, 0.09],
    build: (rnd, top) =>
      Array.from({ length: 5 }, (_, i) => ({
        geo: blobGeo,
        at: [(rnd() - 0.5) * 0.06, top + 0.03 + rnd() * 0.05, (rnd() - 0.5) * 0.06] as [number, number, number],
        scale: [0.045, 0.045, 0.045] as [number, number, number],
        color: GREENS[i % 4],
      })),
  },
}

function plantGeometry(variant: PlantVariant) {
  return cached(`plant:${variant}`, () => {
    const spec = SPECS[variant]
    const [rTop, rBottom, h] = spec.pot
    const pot = new THREE.CylinderGeometry(rTop, rBottom, h, 24)
    pot.translate(0, h / 2, 0)
    const foliage = mergeParts(
      [
        { geo: GEO.cylinder, at: [0, h - 0.02, 0], scale: [rTop * 0.92, 0.02, rTop * 0.92], color: '#3b2e25' },
        ...spec.build(mulberry32(variant.length * 13), h),
      ],
      true,
    )
    return { pot, foliage }
  })
}

export function Plant({ variant = 'bush', pot = 'white', ...props }: PlantProps) {
  const g = plantGeometry(variant)
  return (
    <group {...props}>
      <mesh geometry={g.pot} material={POTS[pot]} castShadow receiveShadow />
      <mesh geometry={g.foliage} material={MAT.foliage} castShadow />
    </group>
  )
}
