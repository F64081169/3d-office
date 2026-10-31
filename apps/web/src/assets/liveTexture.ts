import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * A canvas texture that redraws only when `data` changes (compared as JSON), for
 * in-world displays driven by the company state (wall board, task board).
 */
export function useLiveTexture<T>(width: number, height: number, data: T, draw: (ctx: CanvasRenderingContext2D, data: T) => void) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
  }, [width, height])
  const key = JSON.stringify(data)

  useEffect(() => {
    draw((texture.image as HTMLCanvasElement).getContext('2d')!, JSON.parse(key) as T)
    texture.needsUpdate = true
  }, [key, texture, draw])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

/** Shortens text with an ellipsis to fit `width` pixels in the current font. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t}…`
}
