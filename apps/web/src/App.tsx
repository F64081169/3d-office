import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useOfficeStore } from './store/officeStore'
import { Hud } from './ui/Hud'
import { OfficeScene } from './world/OfficeScene'
import { INTRO_START } from './world/layout'

export default function App() {
  return (
    <div className="app">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ fov: 48, near: 0.1, far: 9000, position: INTRO_START }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => useOfficeStore.getState().select(null)}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.0
        }}
      >
        <OfficeScene />
      </Canvas>
      <Hud />
    </div>
  )
}
