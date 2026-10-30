export type HairStyle = 'short' | 'long' | 'bun' | 'bob'

export type Appearance = {
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  bottom: string
  shoes: string
  glasses?: boolean
}

/** Per-agent look. Purely visual, so it lives in the web app, not the shared model. */
export const APPEARANCE: Record<string, Appearance> = {
  director: { skin: '#e8c4a8', hair: '#2a1d18', hairStyle: 'bob', top: '#3a3f58', bottom: '#2a2d36', shoes: '#1b1b1d' },
  'eng-manager': { skin: '#8d5a3b', hair: '#1b1b1b', hairStyle: 'short', top: '#2f6f8f', bottom: '#33363d', shoes: '#2b2b2b' },
  'eng-a': { skin: '#f1c9a5', hair: '#6b4a2b', hairStyle: 'short', top: '#4c9fc4', bottom: '#3c4250', shoes: '#f2f2f2' },
  'eng-b': { skin: '#c58c64', hair: '#1a1110', hairStyle: 'long', top: '#4a7fc1', bottom: '#2f3440', shoes: '#262626' },
  'eng-c': { skin: '#e9c39b', hair: '#121212', hairStyle: 'short', top: '#2a9d8f', bottom: '#3a3f47', shoes: '#f2f2f2', glasses: true },
  'research-manager': { skin: '#f0cfb4', hair: '#7a3b1e', hairStyle: 'long', top: '#b5653a', bottom: '#3b3533', shoes: '#3a2a20' },
  'research-a': { skin: '#f3d3b8', hair: '#c9a063', hairStyle: 'short', top: '#d08a3c', bottom: '#40434b', shoes: '#f2f2f2', glasses: true },
  'research-b': { skin: '#d9a47e', hair: '#2c1a12', hairStyle: 'bun', top: '#c76b5a', bottom: '#2f3138', shoes: '#262626' },
  'qa-agent': { skin: '#a8704a', hair: '#1f1611', hairStyle: 'short', top: '#7a8f3a', bottom: '#33363d', shoes: '#2b2b2b' },
}

export const DEFAULT_APPEARANCE: Appearance = {
  skin: '#e0b896',
  hair: '#3a2a20',
  hairStyle: 'short',
  top: '#8a8f99',
  bottom: '#33363d',
  shoes: '#2b2b2b',
}
