# assets

Phase 1 ships **zero binary assets**: furniture, avatars, textures, sky and city are generated at runtime
(`apps/web/src/assets/procedural`, `apps/web/src/assets/textures.ts`).

When real models arrive, put them here:

- `office/`: architectural pieces (walls, glazing, fixtures)
- `furniture/`: desks, chairs, sofas, plants (GLTF/GLB)
- `avatars/`: humanoid GLTF with idle / sit / walk clips

Then implement a GLTF `AssetProvider` (same interface as `ProceduralAssets`) and wrap the scene in
`<AssetProviderScope provider={GltfAssets}>`. Room layouts do not change.
