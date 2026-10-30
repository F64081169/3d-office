import * as THREE from 'three'
import {
  floorPlanksTexture,
  marbleTexture,
  oakTexture,
  travertineTexture,
  walnutTexture,
} from './textures'

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)

/** Shared material palette: one instance per look keeps GPU state changes low. */
export const MAT = {
  floorWood: std({ map: floorPlanksTexture(), roughness: 0.42, metalness: 0 }),
  oak: std({ map: oakTexture(), roughness: 0.55 }),
  walnut: std({ map: walnutTexture(), roughness: 0.5 }),
  travertine: std({ map: travertineTexture(), roughness: 0.7 }),
  marble: std({ map: marbleTexture(), roughness: 0.18 }),

  plaster: std({ color: '#efebe5', roughness: 0.95 }),
  ceiling: std({ color: '#f4f2ee', roughness: 1 }),
  white: std({ color: '#f5f3ef', roughness: 0.6 }),
  charcoal: std({ color: '#2b2c2f', roughness: 0.7 }),

  blackMetal: std({ color: '#1f2124', roughness: 0.38, metalness: 0.6 }),
  aluminium: std({ color: '#b8bdc3', roughness: 0.32, metalness: 0.85 }),
  brass: std({ color: '#c9a35b', roughness: 0.28, metalness: 1 }),
  chrome: std({ color: '#dfe3e8', roughness: 0.1, metalness: 1 }),

  glass: std({
    color: '#cfe3e6',
    roughness: 0.04,
    metalness: 0.15,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    envMapIntensity: 1.6,
  }),
  frosted: std({ color: '#ffffff', roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false }),
  mirror: std({ color: '#e9eef0', roughness: 0.03, metalness: 1, envMapIntensity: 1.3 }),

  fabricCharcoal: std({ color: '#3a3d42', roughness: 0.95 }),
  fabricCream: std({ color: '#e8dfd1', roughness: 0.95 }),
  fabricSage: std({ color: '#8fa38c', roughness: 0.95 }),
  fabricTerracotta: std({ color: '#c0735a', roughness: 0.95 }),
  fabricNavy: std({ color: '#33415a', roughness: 0.95 }),
  leatherCognac: std({ color: '#9a5b34', roughness: 0.55 }),
  felt: std({ color: '#6f8a76', roughness: 1 }),

  ceramic: std({ color: '#fbfaf8', roughness: 0.12 }),
  screenBezel: std({ color: '#121417', roughness: 0.3, metalness: 0.3 }),
  keyboard: std({ color: '#e4e4e2', roughness: 0.6 }),

  potWhite: std({ color: '#f1efe9', roughness: 0.5 }),
  potTerracotta: std({ color: '#b5684b', roughness: 0.85 }),
  potCharcoal: std({ color: '#323335', roughness: 0.6 }),
  potStone: std({ color: '#b9b2a6', roughness: 0.9 }),

  /** Vertex-coloured foliage (merged plant geometry carries per-leaf colours). */
  foliage: std({ vertexColors: true, roughness: 0.8, flatShading: true }),
  /** Vertex-coloured books, cups and other small merged decor. */
  decor: std({ vertexColors: true, roughness: 0.75 }),

  /** Opal glass globe lights: emissive but still shaded, so they read as spheres. */
  glowGlass: std({ color: '#fff6ea', emissive: '#ffd49a', emissiveIntensity: 0.75, roughness: 0.35 }),

  lightStrip: new THREE.MeshBasicMaterial({ color: '#fff5e6', toneMapped: false }),
  warmGlow: new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }),
}

/** Floor plank texture tile is 3m; repeat it across a floor of the given size. */
export function floorWoodFor(width: number, depth: number) {
  const m = MAT.floorWood.clone()
  m.map = MAT.floorWood.map!.clone()
  m.map.repeat.set(width / 3, depth / 3)
  m.map.needsUpdate = true
  return m
}
