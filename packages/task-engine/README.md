# packages/task-engine

Commands → events for the task lifecycle. It validates transitions and never mutates state itself
(the shared `reduceEvent` does).

```
backlog → assigned → working ⇄ blocked
                     working → review → completed
                     working → completed
```

- `createProject` (project + the Director's root task), `createTask` (created + assigned)
- `start`, `block`, `submitForReview`, `complete`, `completeProject`
- `isRollupReady(parentId)` (all children done), `openTasksOf(agentId)`
- Reward is set from priority at creation: low/medium 100 · high 200 · critical 500 (`REWARD_BY_PRIORITY`, in `@office/shared`).
