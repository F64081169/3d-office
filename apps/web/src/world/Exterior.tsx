import { useMemo } from 'react'
import * as THREE from 'three'
import { StaticInstances, type InstanceItem } from '../assets/primitives'
import { cloudTexture, facadeTexture } from '../assets/textures'
import { mulberry32 } from '../util/random'
import { SUN_DIR } from './Lighting'

/** Our floor sits ~160m above street level. */
export const GROUND_Y = -160
export const FOG = { color: '#d8e0e5', near: 150, far: 4800 }

const SKY = { zenith: '#6d9dcc', horizon: FOG.color, ground: '#cbd2d3', sun: '#fff1d6' }

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  toneMapped: false,
  uniforms: {
    zenith: { value: new THREE.Color(SKY.zenith) },
    horizon: { value: new THREE.Color(SKY.horizon) },
    ground: { value: new THREE.Color(SKY.ground) },
    sunColor: { value: new THREE.Color(SKY.sun) },
    sunDir: { value: SUN_DIR },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 zenith; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunColor; uniform vec3 sunDir;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float h = d.y;
      vec3 col = h > 0.0
        ? mix(horizon, zenith, pow(smoothstep(0.0, 1.0, h), 0.6))
        : mix(horizon, ground, smoothstep(0.0, -0.2, h));
      float s = max(dot(d, normalize(sunDir)), 0.0);
      col += sunColor * (pow(s, 1200.0) * 4.0 + pow(s, 60.0) * 0.35 + pow(s, 6.0) * 0.12);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }
  `,
})

/** Sea lies to the west-south-west beyond this shoreline. */
const SEA_NORMAL = new THREE.Vector2(-0.94, 0.34).normalize()
const SHORE = 430
const isSea = (x: number, z: number) => x * SEA_NORMAL.x + z * SEA_NORMAL.y > SHORE

const BUILDING_COLORS = ['#cfd7de', '#b6c2cc', '#dbd3c6', '#a8b5bf', '#e3ded6', '#9eaebb', '#c8c0b4', '#8fa0ad']

function useCity() {
  return useMemo(() => {
    const rnd = mulberry32(99)
    const items: InstanceItem[] = []
    const step = 46
    for (let gx = -1500; gx <= 1500; gx += step) {
      for (let gz = -1500; gz <= 1500; gz += step) {
        const x = gx + (rnd() - 0.5) * 14
        const z = gz + (rnd() - 0.5) * 14
        const r = Math.hypot(x, z)
        if (r < 90 || r > 1500 || isSea(x + 40, z) || rnd() < 0.16) continue
        // Our penthouse (160m) should top its neighbours: low blocks nearby, a few peers further out.
        const nearCap = THREE.MathUtils.smoothstep(r, 120, 520)
        const downtown = Math.max(0, 1 - r / 900)
        const landmark = r > 320 && rnd() < 0.04 ? 60 + rnd() * 90 : 0
        const h = 18 + rnd() * 45 + downtown * rnd() * (40 + 110 * nearCap) + landmark
        const w = 14 + rnd() * 22
        const d = 14 + rnd() * 22
        items.push({
          position: [x, GROUND_Y + h / 2, z],
          scale: [w, h, d],
          color: BUILDING_COLORS[Math.floor(rnd() * BUILDING_COLORS.length)],
        })
      }
    }
    return items
  }, [])
}

/** A layered mountain silhouette: a vertical "curtain" whose top edge is ridged noise. */
function ridgeGeometry(radius: number, a0: number, a1: number, hMin: number, hMax: number, seed: number, top: string, bottom: string) {
  const rnd = mulberry32(seed)
  const segs = 220
  const ph = Array.from({ length: 4 }, () => rnd() * 10)
  const pos: number[] = []
  const col: number[] = []
  const cTop = new THREE.Color(top)
  const cBot = new THREE.Color(bottom)
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const a = a0 + (a1 - a0) * t
    const n =
      0.45 * (1 - Math.abs(Math.sin(t * 7.0 + ph[0]))) +
      0.3 * (1 - Math.abs(Math.sin(t * 17.0 + ph[1]))) +
      0.15 * Math.sin(t * 41.0 + ph[2]) +
      0.1 * Math.sin(t * 3.0 + ph[3])
    const edgeFade = Math.min(1, Math.min(t, 1 - t) * 6)
    const h = (hMin + (hMax - hMin) * Math.max(0, n)) * edgeFade
    const r = radius + Math.sin(t * 11 + ph[1]) * 120
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    pos.push(x, GROUND_Y - 5, z, x, GROUND_Y + h, z)
    col.push(cBot.r, cBot.g, cBot.b, cTop.r, cTop.g, cTop.b)
  }
  const idx: number[] = []
  for (let i = 0; i < segs; i++) {
    const b = i * 2
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

const mountainMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })

export function Exterior() {
  const city = useCity()
  const cityMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: facadeTexture(), roughness: 0.35, metalness: 0.35, envMapIntensity: 0.9 })
    // One texture tile = 28m × 90m of facade (8 bays × 24 floors), whatever the block size.
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #if defined( USE_MAP ) && defined( USE_INSTANCING )
          vec3 bs = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          float faceW = abs(normal.x) > 0.5 ? bs.z : bs.x;
          vMapUv = abs(normal.y) > 0.5 ? vec2(0.001, 0.001) : uv * vec2(faceW / 28.0, bs.y / 90.0);
        #endif`,
      )
    }
    return m
  }, [])
  const ridges = useMemo(
    () => [
      ridgeGeometry(3100, -Math.PI * 0.98, -Math.PI * 0.08, 420, 980, 3, '#9fb3c4', '#b9c6cf'),
      ridgeGeometry(2200, -Math.PI * 0.9, -Math.PI * 0.18, 180, 520, 7, '#5e7684', '#7d909a'),
    ],
    [],
  )
  const clouds = useMemo(() => {
    const rnd = mulberry32(17)
    return Array.from({ length: 14 }, () => {
      const a = -Math.PI * (0.05 + rnd() * 1.4)
      const r = 2400 + rnd() * 1400
      return {
        position: [Math.cos(a) * r, 450 + rnd() * 700, Math.sin(a) * r] as [number, number, number],
        scale: [700 + rnd() * 700, 220 + rnd() * 160, 1] as [number, number, number],
      }
    })
  }, [])
  const seaAngle = Math.atan2(-SEA_NORMAL.y, SEA_NORMAL.x)
  return (
    <group>
      <mesh material={skyMaterial} renderOrder={-1}>
        <sphereGeometry args={[4500, 48, 24]} />
      </mesh>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.position} scale={c.scale}>
          <spriteMaterial map={cloudTexture()} transparent depthWrite={false} fog={false} opacity={0.85} />
        </sprite>
      ))}

      <mesh position={[0, GROUND_Y, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[9000, 9000]} />
        <meshLambertMaterial color="#9ea795" />
      </mesh>
      <group
        position={[SEA_NORMAL.x * (SHORE + 3000), GROUND_Y + 0.6, SEA_NORMAL.y * (SHORE + 3000)]}
        rotation-y={seaAngle}
      >
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[6000, 9000]} />
          <meshStandardMaterial color="#5f8fae" roughness={0.18} metalness={0.25} />
        </mesh>
      </group>

      <StaticInstances geometry={BUILDING_GEO} material={cityMaterial} items={city} cast={false} receive={false} />
      {ridges.map((g, i) => (
        <mesh key={i} geometry={g} material={mountainMaterial} />
      ))}
    </group>
  )
}

const BUILDING_GEO = new THREE.BoxGeometry(1, 1, 1)
