import type { AssetProvider } from '../AssetProvider'
import {
  Armchair,
  Bookshelf,
  Chair,
  CoffeeTable,
  Desk,
  FloorLamp,
  Monitor,
  Pendant,
  Rug,
  Sofa,
  Stool,
} from './furniture'
import { Plant } from './plants'

/** Default provider: everything built from primitives at runtime (no downloads). */
export const ProceduralAssets: AssetProvider = {
  Desk,
  Monitor,
  Chair,
  Stool,
  Plant,
  Sofa,
  Armchair,
  CoffeeTable,
  Rug,
  FloorLamp,
  Pendant,
  Bookshelf,
}
