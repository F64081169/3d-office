import { useAssets } from '../../assets/AssetProvider'
import { MAT } from '../../assets/materials'

/** Break-out lounge facing the north skyline. Phase 4 sends agents on "break" here. */
export function Lounge() {
  const { Sofa, Armchair, CoffeeTable, Rug, Plant, FloorLamp, Bookshelf } = useAssets()
  return (
    <group>
      <Rug width={6.4} depth={4.6} color="#d8cab4" border="#b39f84" position={[5.4, 0, -8.9]} />
      <Sofa width={3.2} position={[5.2, 0, -6.95]} rotation-y={Math.PI} fabric={MAT.fabricCream} />
      <Sofa width={2.2} position={[2.75, 0, -9.3]} rotation-y={Math.PI / 2} fabric={MAT.fabricCream} />
      <Armchair position={[8.3, 0, -8.3]} rotation-y={-Math.PI / 2} fabric={MAT.fabricTerracotta} />
      <Armchair position={[8.3, 0, -9.8]} rotation-y={-Math.PI / 2} fabric={MAT.fabricSage} />
      <CoffeeTable shape="round" width={1.1} position={[5.4, 0, -9.0]} />
      <FloorLamp position={[2.6, 0, -7.4]} />

      {/* Low planted divider toward the workspace */}
      <Bookshelf width={7.6} height={1.0} depth={0.36} seed={5} position={[5.4, 0, -5.0]} />
      <Plant variant="small" pot="white" position={[2.4, 1.0, -5.0]} />
      <Plant variant="small" pot="charcoal" position={[5.4, 1.0, -5.0]} />
      <Plant variant="small" pot="terracotta" position={[8.4, 1.0, -5.0]} />

      <Plant variant="olive" pot="stone" position={[0.9, 0, -12.3]} />
      <Plant variant="fiddle" pot="white" position={[10.2, 0, -12.3]} rotation-y={0.4} />
      <Plant variant="bush" pot="terracotta" position={[0.7, 0, -5.9]} />
    </group>
  )
}
