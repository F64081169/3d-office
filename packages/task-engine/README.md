# packages/task-engine — 🔜 Phase 3

Task lifecycle `backlog → assigned → working → review → completed` (plus `blocked`),
parent/child roll-up via `parentTaskId`, scoring (base 50 + quality/speed/difficulty/review bonuses)
and coin rewards. Emits `TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STARTED`, `TASK_COMPLETED`, `AGENT_REWARDED`,
`PROJECT_COMPLETED`.

Types live in `packages/shared` (`Task`, `TaskStatus`, `TaskPriority`).
