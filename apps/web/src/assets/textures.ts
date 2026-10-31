import * as THREE from 'three'
import { lazy, mulberry32 } from '../util/random'

/**
 * Procedural canvas textures. Everything is generated at runtime so the MVP ships
 * with zero binary assets; swap any of these for real texture files later.
 */

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

export function canvasTexture(w: number, h: number, draw: Draw, { srgb = true, repeat = true } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export const FONT = '-apple-system, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif'

function wobblyLine(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, amp: number, freq: number, phase: number) {
  ctx.beginPath()
  ctx.moveTo(x0, y)
  for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, y + Math.sin(x * freq + phase) * amp)
  ctx.stroke()
}

/** Light oak planks. One texture tile = 3m × 3m, 12 rows of 25cm planks. */
export const floorPlanksTexture = lazy(() =>
  canvasTexture(1024, 1024, (ctx, w, h) => {
    const rnd = mulberry32(7)
    const rows = 12
    const rh = h / rows
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 500
      const y = r * rh
      while (x < w) {
        const len = 380 + rnd() * 420
        const light = 0.9 + rnd() * 0.16
        const grains = Array.from({ length: 16 }, () => ({
          y: y + rnd() * rh,
          a: 0.04 + rnd() * 0.09,
          lw: 0.6 + rnd() * 1.8,
          amp: 0.5 + rnd() * 2.5,
          freq: 0.004 + rnd() * 0.012,
          ph: rnd() * 6,
        }))
        // Draw at x and wrapped copies so the tile repeats seamlessly.
        for (const off of [0, -w, w]) {
          const px = x + off
          if (px > w || px + len < 0) continue
          ctx.fillStyle = `rgb(${[206, 168, 126].map((c) => Math.min(255, c * light)).join(',')})`
          ctx.fillRect(px, y, len, rh)
          for (const g of grains) {
            ctx.strokeStyle = `rgba(112,72,38,${g.a})`
            ctx.lineWidth = g.lw
            wobblyLine(ctx, px, px + len, g.y, g.amp, g.freq, g.ph)
          }
          ctx.fillStyle = 'rgba(80,52,30,0.45)'
          ctx.fillRect(px, y, 2, rh)
        }
        x += len
      }
      ctx.fillStyle = 'rgba(80,52,30,0.5)'
      ctx.fillRect(0, y, w, 2)
    }
  }),
)

function woodGrain(base: string, grain: string, seed: number) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const rnd = mulberry32(seed)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`
      ctx.fillRect(0, rnd() * h, w, 10 + rnd() * 40)
    }
    ctx.strokeStyle = grain
    for (let i = 0; i < 140; i++) {
      ctx.globalAlpha = 0.05 + rnd() * 0.18
      ctx.lineWidth = 0.5 + rnd() * 1.5
      wobblyLine(ctx, 0, w, rnd() * h, 1 + rnd() * 3, 0.005 + rnd() * 0.01, rnd() * 6)
    }
    ctx.globalAlpha = 1
  })
}

export const oakTexture = lazy(() => woodGrain('#c9a37d', '#7a5032', 11))
export const walnutTexture = lazy(() => woodGrain('#6e4a33', '#2e1b10', 12))

/** Warm travertine with horizontal strata, used for premium stone walls. */
export const travertineTexture = lazy(() =>
  canvasTexture(1024, 1024, (ctx, w, h) => {
    const rnd = mulberry32(21)
    ctx.fillStyle = '#d8cebf'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 140; i++) {
      const light = rnd() > 0.5
      ctx.strokeStyle = light ? 'rgba(240,233,222,0.5)' : `rgba(170,152,128,${0.15 + rnd() * 0.3})`
      ctx.lineWidth = 1 + rnd() * 7
      wobblyLine(ctx, 0, w, rnd() * h, 1 + rnd() * 4, 0.003 + rnd() * 0.01, rnd() * 6)
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(120,100,80,${0.1 + rnd() * 0.25})`
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 4, 1 + rnd() * 2)
    }
    // Slab joints: 2 × 4 slabs per tile.
    ctx.fillStyle = 'rgba(120,104,86,0.55)'
    for (let x = 0; x < w; x += w / 2) ctx.fillRect(x, 0, 2, h)
    for (let y = 0; y < h; y += h / 4) ctx.fillRect(0, y, w, 2)
  }),
)

/** Large-format dark stone tiles for the bathroom floor. */
export const darkStoneTexture = lazy(() =>
  canvasTexture(1024, 1024, (ctx, w, h) => {
    const rnd = mulberry32(31)
    ctx.fillStyle = '#4b4845'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 260; i++) {
      const x = rnd() * w
      const y = rnd() * h
      const r = 20 + rnd() * 120
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      const c = rnd() > 0.5 ? '255,250,240' : '0,0,0'
      g.addColorStop(0, `rgba(${c},${0.03 + rnd() * 0.05})`)
      g.addColorStop(1, `rgba(${c},0)`)
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    ctx.fillStyle = '#2c2a28'
    for (let x = 0; x < w; x += w / 2) ctx.fillRect(x, 0, 3, h)
    for (let y = 0; y < h; y += h / 2) ctx.fillRect(0, y, w, 3)
  }),
)

/** White marble with soft grey veining (counters, tables). */
export const marbleTexture = lazy(() =>
  canvasTexture(1024, 1024, (ctx, w, h) => {
    const rnd = mulberry32(41)
    ctx.fillStyle = '#f2efea'
    ctx.fillRect(0, 0, w, h)
    ctx.filter = 'blur(1.2px)'
    for (let i = 0; i < 34; i++) {
      ctx.strokeStyle = `rgba(130,124,118,${0.12 + rnd() * 0.3})`
      ctx.lineWidth = 0.6 + rnd() * 2.6
      ctx.beginPath()
      const x = rnd() * w
      ctx.moveTo(x, -20)
      ctx.bezierCurveTo(x + (rnd() - 0.5) * 600, h * 0.3, x + (rnd() - 0.5) * 600, h * 0.7, x + (rnd() - 0.5) * 400, h + 20)
      ctx.stroke()
    }
    ctx.filter = 'none'
  }),
)

const rugCache = new Map<string, THREE.CanvasTexture>()
export function rugTexture(color: string, border: string) {
  const key = color + border
  if (!rugCache.has(key)) {
    rugCache.set(
      key,
      canvasTexture(
        512,
        512,
        (ctx, w, h) => {
          const rnd = mulberry32(5)
          ctx.fillStyle = color
          ctx.fillRect(0, 0, w, h)
          for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},0.05)`
            ctx.fillRect(rnd() * w, rnd() * h, 2, 2)
          }
          ctx.strokeStyle = border
          ctx.lineWidth = 10
          ctx.strokeRect(26, 26, w - 52, h - 52)
          ctx.lineWidth = 3
          ctx.strokeRect(46, 46, w - 92, h - 92)
        },
        { repeat: false },
      ),
    )
  }
  return rugCache.get(key)!
}

/** Radial white→transparent gradient; tint it for light pools, cove glows and halos. */
export const glowTexture = lazy(() =>
  canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    },
    { repeat: false },
  ),
)

/** Soft contact shadow under avatars (cheaper than real dynamic shadows). */
export const blobShadowTexture = lazy(() =>
  canvasTexture(
    128,
    128,
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
      g.addColorStop(0, 'rgba(0,0,0,0.42)')
      g.addColorStop(0.6, 'rgba(0,0,0,0.16)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    },
    { repeat: false },
  ),
)

/** Curtain-wall facade (near-white so per-building instance colours tint it). */
export const facadeTexture = lazy(() =>
  canvasTexture(256, 512, (ctx, w, h) => {
    const rnd = mulberry32(51)
    ctx.fillStyle = '#9aa5b0'
    ctx.fillRect(0, 0, w, h)
    const cols = 8
    const rows = 24
    const cw = w / cols
    const rh = h / rows
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = 200 + rnd() * 50
        ctx.fillStyle = `rgb(${v - 8},${v},${v + 6})`
        ctx.fillRect(c * cw + 2, r * rh + 4, cw - 4, rh - 6)
      }
    }
  }),
)

export type ScreenKind = 'idle' | 'code' | 'dashboard' | 'docs' | 'error'

function drawScreen(kind: ScreenKind, ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rnd = mulberry32(kind.length * 97)
  if (kind === 'idle') {
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#1f3b57')
    g.addColorStop(0.55, '#3f6f84')
    g.addColorStop(1, '#d99a6c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + i * 0.05})`
      ctx.lineWidth = 18 - i * 4
      ctx.beginPath()
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * (0.55 + i * 0.1) + Math.sin(x / 70 + i) * 18)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = `200 72px ${FONT}`
    ctx.fillText('09:41', 34, 100)
    ctx.font = `500 20px ${FONT}`
    ctx.fillText('Claude Office · standing by', 38, 134)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(w / 2 - 110, h - 34, 220, 22)
    return
  }
  if (kind === 'error') {
    ctx.fillStyle = '#2a1416'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#e05a4f'
    ctx.fillRect(0, 0, w, 34)
    ctx.fillStyle = '#ffffff'
    ctx.font = `600 20px ${FONT}`
    ctx.fillText('BLOCKED — needs input', 18, 24)
    ctx.fillStyle = 'rgba(224,90,79,0.9)'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 + 18, 46, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 64px ${FONT}`
    ctx.fillText('!', w / 2 - 9, h / 2 + 41)
    return
  }
  if (kind === 'code') {
    ctx.fillStyle = '#1d1f24'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#262930'
    ctx.fillRect(0, 0, 90, h)
    const palette = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#d4d4d4']
    for (let y = 18; y < h - 10; y += 15) {
      let x = 100 + Math.floor(rnd() * 4) * 18
      const tokens = 1 + Math.floor(rnd() * 5)
      for (let t = 0; t < tokens; t++) {
        const len = 20 + rnd() * 80
        ctx.fillStyle = palette[Math.floor(rnd() * palette.length)]
        ctx.fillRect(x, y, len, 6)
        x += len + 8
      }
    }
    return
  }
  if (kind === 'dashboard') {
    ctx.fillStyle = '#16202c'
    ctx.fillRect(0, 0, w, h)
    const cards = ['#3b9fd8', '#e08a3c', '#5fbf8f']
    cards.forEach((c, i) => {
      ctx.fillStyle = '#1f2c3b'
      ctx.fillRect(16 + i * (w - 32) / 3, 16, (w - 32) / 3 - 10, 70)
      ctx.fillStyle = c
      ctx.fillRect(28 + i * (w - 32) / 3, 66, 40 + rnd() * 80, 8)
    })
    ctx.strokeStyle = '#5fbf8f'
    ctx.lineWidth = 4
    ctx.beginPath()
    for (let x = 0; x <= w - 40; x += 20) ctx.lineTo(20 + x, h - 40 - (Math.sin(x / 60) * 30 + x * 0.25) * 0.6)
    ctx.stroke()
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = '#3b9fd8'
      const bh = 20 + rnd() * 60
      ctx.fillRect(w - 200 + i * 22, h - 30 - bh, 14, bh)
    }
    return
  }
  ctx.fillStyle = '#f7f7f5'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#2b2f36'
  ctx.fillRect(40, 30, 220, 14)
  for (let y = 66; y < h - 20; y += 16) {
    ctx.fillStyle = '#b9bec6'
    ctx.fillRect(40, y, (w - 80) * (0.6 + rnd() * 0.4), 6)
  }
}

const screenCache = new Map<ScreenKind, THREE.CanvasTexture>()
export function screenTexture(kind: ScreenKind) {
  if (!screenCache.has(kind)) {
    screenCache.set(kind, canvasTexture(512, 300, (ctx, w, h) => drawScreen(kind, ctx, w, h), { repeat: false }))
  }
  return screenCache.get(kind)!
}

const signCache = new Map<string, THREE.CanvasTexture>()
/** Wayfinding / brand signage rendered as transparent text textures. */
export function signTexture(title: string, subtitle = '', accent = '#d97757') {
  const key = `${title}|${subtitle}|${accent}`
  if (!signCache.has(key)) {
    signCache.set(
      key,
      canvasTexture(
        1024,
        256,
        (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h)
          ctx.fillStyle = accent
          ctx.beginPath()
          ctx.arc(70, subtitle ? 104 : h / 2, 26, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.font = `600 84px ${FONT}`
          ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px'
          ctx.fillText(title, 120, subtitle ? 134 : h / 2 + 30)
          if (subtitle) {
            ctx.font = `400 34px ${FONT}`
            ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px'
            ctx.fillStyle = 'rgba(255,255,255,0.75)'
            ctx.fillText(subtitle, 124, 196)
          }
        },
        { repeat: false },
      ),
    )
  }
  return signCache.get(key)!
}

/** Warm abstract art for walls. */
export const artTexture = lazy(() =>
  canvasTexture(
    512,
    640,
    (ctx, w, h) => {
      ctx.fillStyle = '#efe6d8'
      ctx.fillRect(0, 0, w, h)
      const shapes: [string, number, number, number][] = [
        ['#d97757', 0.35, 0.38, 150],
        ['#2f4f4f', 0.68, 0.62, 120],
        ['#e8b86d', 0.4, 0.75, 90],
        ['#8aa39b', 0.72, 0.28, 70],
      ]
      for (const [c, x, y, r] of shapes) {
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc(x * w, y * h, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = '#2b2b2b'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(60, h - 120)
      ctx.bezierCurveTo(200, h - 300, 320, h - 40, w - 60, h - 260)
      ctx.stroke()
    },
    { repeat: false },
  ),
)

/** Soft cumulus blob for sky sprites. */
export const cloudTexture = lazy(() =>
  canvasTexture(
    256,
    128,
    (ctx, w, h) => {
      const rnd = mulberry32(71)
      for (let i = 0; i < 26; i++) {
        const x = w * (0.15 + rnd() * 0.7)
        const y = h * (0.45 + (rnd() - 0.5) * 0.35)
        const r = 18 + rnd() * 34
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, 'rgba(255,255,255,0.55)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
      }
    },
    { repeat: false },
  ),
)
