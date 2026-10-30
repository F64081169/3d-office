# packages/agent-runtime — 🔜 Phase 3

Role behaviours as small state machines plus one LLM call each. These are not long-running autonomous loops.

- **Director**: parse → create project → split → assign to managers → wait → review → integrate → report to Owner.
  The Director never executes the work itself.
- **Manager**: split into subtasks → assign employees → track → collect → review → report to Director.
- **Employee**: thinking → plan → working → result → reporting → idle.

See [docs/agent-flow.md](../../docs/agent-flow.md).
