import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/** Late-afternoon sun from the west-south-west: long light patches through the west glazing. */
export const SUN_DIR = new THREE.Vector3(-0.74, 0.42, 0.34).normalize()

/**
 * Lighting budget: 1 shadowed sun + hemisphere fill + an image-based environment
 * built from Lightformers (no HDRI download). The scene is static, so the shadow
 * map is rendered once and then frozen ("baked") — moving avatars use blob shadows.
 */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#e4edf7', '#c7ae8e', 0.55]} />
      <directionalLight
        position={SUN_DIR.clone().multiplyScalar(80).toArray()}
        intensity={2.6}
        color="#ffeedb"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-27}
        shadow-camera-right={27}
        shadow-camera-top={27}
        shadow-camera-bottom={-27}
        shadow-camera-near={40}
        shadow-camera-far={130}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <Environment frames={1} resolution={256}>
        <color attach="background" args={['#b8c4cf']} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[40, 26, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#dce9ff" position={[0, 4, -30]} scale={[70, 10, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#e3edff" position={[-30, 4, 0]} rotation-y={Math.PI / 2} scale={[60, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#e3edff" position={[30, 4, 0]} rotation-y={-Math.PI / 2} scale={[60, 10, 1]} />
        <Lightformer form="circle" intensity={4} color="#ffd9ad" position={[-28, 14, 13]} scale={[10, 10, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#d9b68f" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <ShadowBaker />
    </>
  )
}

/** Render the shadow map for the first few frames, then freeze it. */
function ShadowBaker() {
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])
  useFrame(() => {
    if (frames.current < 3) {
      frames.current++
      gl.shadowMap.needsUpdate = true
    }
  })
  return null
}
