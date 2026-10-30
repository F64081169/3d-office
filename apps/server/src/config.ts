/** Runtime configuration from environment variables (all optional). */
const num = (v: string | undefined, fallback: number) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fallback)

export const config = {
  port: num(process.env.PORT, 8787),
  host: process.env.HOST ?? '127.0.0.1',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./office.db',
  /** mock (default) · claude · openai — only mock exists in the MVP. */
  provider: process.env.LLM_PROVIDER ?? 'mock',
  /** Simulation speed multiplier for both thinking time and walking/meeting pauses. */
  speed: num(process.env.SIM_SPEED, 1),
  /** Chance that a non-demo task blocks on its first attempt (Mock provider). */
  blockRate: num(process.env.MOCK_BLOCK_RATE, 0.1),
  /** Idle agents occasionally take breaks so the office never looks frozen. AMBIENT=0 disables it. */
  ambient: process.env.AMBIENT !== '0',
  /** Serve the built web app (apps/web/dist) when it exists. Set SERVE_WEB=0 to disable. */
  serveWeb: process.env.SERVE_WEB !== '0',
}
