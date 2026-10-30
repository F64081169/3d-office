# apps/server — 🔜 Phase 3

Node.js + TypeScript + Fastify backend. It will be the single source of truth for agents,
tasks and projects, and stream events to the web client.

Planned:

- `GET /api/state`: snapshot (agents, tasks, projects)
- `POST /api/director/messages`: Owner → Director (creates a project)
- `POST /api/agents/:id/reward`: manual Reward +100
- `GET /api/events`: WebSocket / SSE event stream (`TASK_*`, `AGENT_*`, `PROJECT_COMPLETED`)

See [docs/architecture.md](../../docs/architecture.md) §4–§7.
