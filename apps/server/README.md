# apps/server

Fastify 5 API and event stream for Claude Office. It is the single source of truth: it owns
the company state, runs the agents, persists everything to SQLite and streams events to every browser.

```
src/
├─ index.ts     boot: load/seed DB → wire Company + TaskEngine + AgentRuntime → resume → listen
├─ company.ts   state + re-entrancy-safe event pipeline (reduce → persist → runtime → SSE)
├─ routes.ts    REST commands + SSE (/api/events with Last-Event-ID replay)
├─ db.ts        Prisma 7 + better-sqlite3 adapter: per-event upserts + append-only Event log
└─ config.ts    PORT, HOST, DATABASE_URL, LLM_PROVIDER, SIM_SPEED, MOCK_BLOCK_RATE, SERVE_WEB
```

- `npm run dev -w @office/server`: `prisma generate && prisma db push`, then `tsx watch`.
- `npm start -w @office/server`: same without watch. It also serves `apps/web/dist` if it was built.

Endpoints and the event pipeline are documented in [docs/architecture.md](../../docs/architecture.md) §4–§7.
