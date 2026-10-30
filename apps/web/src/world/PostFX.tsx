import { PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect } from 'react'
import { setPostProcessing } from '../assets/materials'
import { useOfficeStore } from '../store/officeStore'

/**
 * "High" graphics: lamps, light strips and globe pendants glow (bloom on HDR values
 * above 1.6, so lit walls and the floor stay crisp), with MSAA and a light vignette. The
 * composer turns the renderer's own tone mapping off, so ACES moves here as the last
 * colour step.
 *
 * Screen-space AO (N8AO) was tried and dropped: it erased the transparent contact
 * shadows under agents, which ground them better than AO did.
 *
 * A sustained frame-rate drop switches to "Standard" once, unless the viewer chose High.
 */
export function PostFX() {
  const graphics = useOfficeStore((s) => s.graphics)
  const lowerGraphics = useOfficeStore((s) => s.lowerGraphics)
  useEffect(() => setPostProcessing(graphics === 'high'), [graphics])
  return (
    <>
      <PerformanceMonitor bounds={() => [40, 75]} flipflops={2} onDecline={lowerGraphics} />
      {graphics === 'high' && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={1.6} luminanceSmoothing={0.3} intensity={0.9} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.32} darkness={0.32} />
        </EffectComposer>
      )}
    </>
  )
}
