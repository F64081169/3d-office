import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import type * as THREE from 'three'
import type { ScreenKind } from './textures'
import { ProceduralAssets } from './procedural'

type GroupProps = ThreeElements['group']

export type DeskProps = GroupProps & { variant?: 'employee' | 'manager' | 'executive' }
export type MonitorProps = GroupProps & { screen?: ScreenKind; width?: number }
export type ChairProps = GroupProps & { variant?: 'task' | 'meeting' | 'executive' }
export type StoolProps = GroupProps
export type PlantVariant = 'fiddle' | 'bush' | 'snake' | 'olive' | 'small'
export type PotStyle = 'white' | 'terracotta' | 'charcoal' | 'stone'
export type PlantProps = GroupProps & { variant?: PlantVariant; pot?: PotStyle }
export type SofaProps = GroupProps & { width?: number; depth?: number; fabric?: THREE.Material }
export type CoffeeTableProps = GroupProps & { shape?: 'round' | 'rect'; width?: number; depth?: number }
export type RugProps = GroupProps & { width: number; depth: number; color?: string; border?: string }
export type LampProps = GroupProps
export type PendantProps = GroupProps & { drop?: number; style?: 'dome' | 'globe' }
export type BookshelfProps = GroupProps & { width?: number; height?: number; depth?: number; seed?: number }

/**
 * Where every reusable 3D model comes from. Rooms never build furniture themselves:
 * they ask the provider. Today it is procedural primitives; a GLTF / Blender /
 * AI-generated provider can replace it without touching the room layouts.
 *
 * Convention for all models: origin on the floor, "front" faces +z
 * (a chair's sitter faces +z; a desk's user stands at -z).
 */
export interface AssetProvider {
  Desk: ComponentType<DeskProps>
  Monitor: ComponentType<MonitorProps>
  Chair: ComponentType<ChairProps>
  Stool: ComponentType<StoolProps>
  Plant: ComponentType<PlantProps>
  Sofa: ComponentType<SofaProps>
  Armchair: ComponentType<SofaProps>
  CoffeeTable: ComponentType<CoffeeTableProps>
  Rug: ComponentType<RugProps>
  FloorLamp: ComponentType<LampProps>
  Pendant: ComponentType<PendantProps>
  Bookshelf: ComponentType<BookshelfProps>
}

const AssetContext = createContext<AssetProvider>(ProceduralAssets)

export function AssetProviderScope({ provider, children }: { provider: AssetProvider; children: ReactNode }) {
  return <AssetContext.Provider value={provider}>{children}</AssetContext.Provider>
}

export const useAssets = () => useContext(AssetContext)
