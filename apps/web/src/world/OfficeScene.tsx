import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { Agents } from '../agents/Agents'
import { TagProjector } from '../agents/tags'
import { CameraRig } from '../camera/CameraRig'
import { useOfficeStore } from '../store/officeStore'
import { Building } from './Building'
import { OfficeCat } from './cat/OfficeCat'
import { Exterior, FOG } from './Exterior'
import { Lighting } from './Lighting'
import { NavDebug, SHOW_NAV } from './NavDebug'
import { Bathroom } from './rooms/Bathroom'
import { CoffeeBar } from './rooms/CoffeeBar'
import { DirectorOffice } from './rooms/DirectorOffice'
import { Lobby } from './rooms/Lobby'
import { Lounge } from './rooms/Lounge'
import { MeetingRoom } from './rooms/MeetingRoom'
import { Workspace } from './rooms/Workspace'

export function OfficeScene() {
  return (
    <>
      <fog attach="fog" args={[FOG.color, FOG.near, FOG.far]} />
      <Lighting />
      <Exterior />
      <Building />
      <DirectorOffice />
      <MeetingRoom />
      <Workspace />
      <Lounge />
      <CoffeeBar />
      <Lobby />
      <Bathroom />
      <Agents />
      <OfficeCat />
      {SHOW_NAV && <NavDebug />}
      <TagProjector />
      <CameraRig />
      <StatsProbe />
    </>
  )
}

/** Samples FPS / draw calls twice a second while the stats overlay is open. */
function StatsProbe() {
  const gl = useThree((s) => s.gl)
  const acc = useRef({ frames: 0, time: 0 })
  useFrame((_, dt) => {
    const { showStats, setStats } = useOfficeStore.getState()
    if (!showStats) return
    acc.current.frames++
    acc.current.time += dt
    if (acc.current.time >= 0.5) {
      setStats({
        fps: Math.round(acc.current.frames / acc.current.time),
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      })
      acc.current = { frames: 0, time: 0 }
    }
  })
  return null
}
