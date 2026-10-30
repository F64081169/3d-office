import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MockProvider } from '@office/llm-provider'
import { createCompanyState, reduceEvent, type CompanyState, type OfficeEvent } from '@office/shared'
import { TaskEngine } from '@office/task-engine'
import { AgentRuntime } from '../src/index'

const DEMO = 'Analyze random write performance bottleneck and propose improvements.'
const SPEED = 40

/** In-memory company wired like the server: reduce, record, then let the runtime react. */
function company() {
  let state: CompanyState = createCompanyState()
  const log: OfficeEvent[] = []
  const queue: OfficeEvent[] = []
  let draining = false
  let runtime!: AgentRuntime
  const emit = (e: OfficeEvent) => {
    queue.push(e)
    if (draining) return
    draining = true
    while (queue.length) {
      const next = queue.shift()!
      state = reduceEvent(state, next)
      log.push(next)
      runtime.handleEvent(next)
    }
    draining = false
  }
  const getState = () => state
  const engine = new TaskEngine({ getState, emit })
  runtime = new AgentRuntime({ engine, provider: new MockProvider({ speed: SPEED }), getState, emit, speed: SPEED })
  return { runtime, getState, log }
}

const until = async (cond: () => boolean, ms = 15000) => {
  const t0 = Date.now()
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 20))
  }
}

test('demo project: Director → Managers → Employees → report to Owner', async () => {
  const { runtime, getState, log } = company()
  runtime.ownerMessage('director', DEMO)
  await until(() => log.some((e) => e.type === 'PROJECT_COMPLETED'))
  await until(() => getState().agents.every((a) => a.status === 'idle'))

  const s = getState()
  const project = Object.values(s.projects)[0]
  assert.equal(project.title, 'Random write performance investigation')
  assert.equal(project.status, 'completed')

  const tasks = Object.values(s.tasks)
  const workstreams = tasks.filter((t) => t.parentTaskId === project.rootTaskId)
  assert.deepEqual(
    workstreams.map((t) => [t.title, t.assignedTo]),
    [
      ['Analyze current write path and identify bottlenecks.', 'eng-manager'],
      ['Research possible optimization strategies.', 'research-manager'],
      ['Design validation and benchmark plan.', 'research-manager'],
    ],
  )
  const subtasks = tasks.filter((t) => workstreams.some((w) => w.id === t.parentTaskId))
  assert.deepEqual(subtasks.map((t) => t.assignedTo).sort(), ['eng-a', 'eng-b', 'eng-c', 'qa-agent', 'research-a', 'research-b'])
  assert.ok(tasks.every((t) => t.status === 'completed' && t.result), 'every task completed with a result')

  // Delegation order: nobody works on a subtask before its manager received the workstream.
  const firstIndex = (pred: (e: OfficeEvent) => boolean) => log.findIndex(pred)
  for (const sub of subtasks) {
    const parentAssigned = firstIndex((e) => e.type === 'TASK_ASSIGNED' && e.taskId === sub.parentTaskId)
    const subStarted = firstIndex((e) => e.type === 'TASK_STARTED' && e.taskId === sub.id)
    assert.ok(parentAssigned >= 0 && parentAssigned < subStarted)
  }

  // Statuses the 3D world shows along the way.
  const statusesOf = (id: string) =>
    log.flatMap((e) => (e.type === 'AGENT_STATUS_CHANGED' && e.agentId === id ? [e.status] : []))
  assert.ok((['thinking', 'meeting', 'reporting'] as const).every((st) => statusesOf('director').includes(st)))
  assert.ok(statusesOf('eng-manager').includes('meeting'))
  assert.ok((['thinking', 'working', 'reporting'] as const).every((st) => statusesOf('eng-a').includes(st)))
  assert.ok(statusesOf('eng-c').includes('blocked'), 'Kenji hits the scripted block once')

  // The Owner hears from the Director only: ack, project created, final report.
  const directorMsgs = s.messages.filter((m) => m.from === 'director').map((m) => m.text)
  assert.equal(directorMsgs[0], 'Understood. I am creating a project and assigning work.')
  assert.match(directorMsgs[1], /^Project created/)
  assert.match(directorMsgs.at(-1)!, /final report/)
  assert.ok(s.messages.every((m) => m.thread === 'director'))
})

test('owner can assign directly to an employee and gets the result in chat', async () => {
  const { runtime, getState } = company()
  runtime.assignFromOwner('research-b', { title: 'Summarise competitor pricing', priority: 'low' })
  await until(() => getState().messages.some((m) => m.from === 'research-b'))
  const task = Object.values(getState().tasks)[0]
  assert.equal(task.status, 'completed')
  assert.equal(task.createdBy, 'owner')
  assert.match(getState().messages.at(-1)!.text, /^Done: \*\*Summarise competitor pricing\*\*/)
})

test('director answers progress questions without starting a project', async () => {
  const { runtime, getState } = company()
  runtime.ownerMessage('director', 'What is the status?')
  await until(() => getState().messages.length === 2)
  assert.equal(Object.keys(getState().projects).length, 0)
  assert.match(getState().messages[1].text, /No active projects/)
})
