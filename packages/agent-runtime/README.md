# packages/agent-runtime

Runs the company. Each agent has a serial action queue; behaviours are short scripts
(status change → one `LLMProvider` call → `TaskEngine` command), triggered by events:

- **Director**:
  - Owner message → `plan` → project + kickoff meeting with the managers → one workstream per manager.
  - All workstreams done → `summarize` → final report to the Owner → `PROJECT_COMPLETED`.
  - The Director never executes the work itself.
- **Manager**: `TASK_ASSIGNED` → `split` into subtasks for the team; all subtasks done → `review` → report.
- **Employee**: `TASK_ASSIGNED` → `prepare` (thinking) → `execute` (working; on a block: blocked → wait → retry) → reporting → done.
- `resume()` re-drives unfinished work after a server restart.
- `COMPANY_RESET` cancels in-flight actions.

`npm test` (from the repo root) runs the full demo in memory at 40× speed and checks the delegation order,
statuses, results and chat. See [docs/agent-flow.md](../../docs/agent-flow.md).
