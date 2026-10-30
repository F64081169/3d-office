/** Tiny inline icons (no icon font / emoji dependency). */

export function PawIcon({ size = 12 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <ellipse cx="12" cy="16.5" rx="5.2" ry="4.4" fill="currentColor" />
      <ellipse cx="5.2" cy="10.5" rx="2.2" ry="2.8" fill="currentColor" />
      <ellipse cx="9.3" cy="6.2" rx="2.2" ry="2.9" fill="currentColor" />
      <ellipse cx="14.7" cy="6.2" rx="2.2" ry="2.9" fill="currentColor" />
      <ellipse cx="18.8" cy="10.5" rx="2.2" ry="2.8" fill="currentColor" />
    </svg>
  )
}

export function CoinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#e9b949" stroke="#b9851f" strokeWidth="2" />
      <path d="M12 6.5v11M9 9.2c0-1.2 1.3-1.9 3-1.9s3 .7 3 1.9-1.3 1.7-3 2.1-3 1-3 2.3 1.3 1.9 3 1.9 3-.7 3-1.9" fill="none" stroke="#8a5f12" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function HeartIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3.2 1.7-2 3.1-3.2 5.3-3.2 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor" />
    </svg>
  )
}
