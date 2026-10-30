import { useEffect, useRef, useState } from 'react'

/** Animated number that counts toward its value and pulses when it goes up. */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const [bump, setBump] = useState(false)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700)
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3)))
      setShown(v)
      from.current = v
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    if (value > a) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 700)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(t)
      }
    }
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <b className={bump ? 'bump' : ''}>{shown.toLocaleString()}</b>
}
