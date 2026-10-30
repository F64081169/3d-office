import assert from 'node:assert/strict'
import { test } from 'node:test'
import Anthropic from '@anthropic-ai/sdk'
import { createCompanyState, directReports, type Task } from '@office/shared'
import { ClaudeProvider, MockProvider, type AgentRunInput } from '../src/index'

const agents = createCompanyState().agents
const agent = (id: string) => agents.find((a) => a.id === id)!
const task: Task = {
  id: 't1',
  title: 'Profile the write path end to end.',
  description: 'Capture flame graphs.',
  createdBy: 'eng-manager',
  assignedTo: 'eng-a',
  status: 'working',
  priority: 'medium',
  reward: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
}

type Call = Record<string, unknown>

/** Stands in for the SDK client: records requests, replays canned responses or errors. */
function fakeClient(responses: (unknown | Error)[]) {
  const calls: Call[] = []
  const next = async (params: Call) => {
    calls.push(params)
    const r = responses.shift()
    if (r instanceof Error) throw r
    return r
  }
  const client = { beta: { messages: { parse: next, create: next } } } as unknown as Anthropic
  return { client, calls }
}

const parsed = (parsed_output: unknown) => ({ stop_reason: 'end_turn', parsed_output, content: [] })
const provider = (client: Anthropic, logs: string[] = []) =>
  new ClaudeProvider({ client, fallback: new MockProvider({ speed: 1000 }), log: (m) => logs.push(m) })

test('plan: structured workstreams for real managers, with fallbacks and effort set', async () => {
  const { client, calls } = fakeClient([
    parsed({
      title: 'Random Write Investigation',
      workstreams: [
        { title: 'Profile writes.', description: 'Find the bottleneck.', assignee: 'eng-manager', priority: 'high' },
        { title: 'Ghost work.', description: 'Nobody owns this.', assignee: 'nobody', priority: 'high' },
        { title: 'Survey options.', description: 'Compare designs.', assignee: 'research-manager', priority: 'urgent!' },
      ],
    }),
  ])
  const res = await provider(client).runAgent({ agent: agent('director'), mode: 'plan', prompt: 'Fix random writes', team: directReports(agents, 'director') })
  assert.equal(res.title, 'Random Write Investigation')
  assert.deepEqual(res.work?.map((w) => [w.assignee, w.priority]), [['eng-manager', 'high'], ['research-manager', 'medium']], 'unknown assignees dropped, odd priorities normalised')
  const req = calls[0]
  assert.equal(req.model, 'claude-opus-5-5')
  assert.equal(req.fallbacks, 'default')
  assert.deepEqual(req.betas, ['server-side-fallback-2026-07-01'])
  const cfg = req.output_config as { effort: string; format: { type: string; schema: Record<string, unknown> } }
  assert.equal(cfg.effort, 'medium')
  assert.equal(cfg.format.type, 'json_schema')
  assert.equal(cfg.format.schema.additionalProperties, false)
  assert.match(JSON.stringify(cfg.format.schema), /Exactly one of: eng-manager, research-manager/)
})

test('execute: blocked only on the first attempt; confidence becomes quality (clamped)', async () => {
  const { client } = fakeClient([
    parsed({ result: '', blocked: 'Needs root on the benchmark host.', confidence: 0.4 }),
    parsed({ result: 'Findings: fsync dominates.', blocked: 'still blocked?', confidence: 1.7 }),
  ])
  const p = provider(client)
  const input: AgentRunInput = { agent: agent('eng-c'), mode: 'execute', task }
  assert.equal((await p.runAgent(input)).blocked, 'Needs root on the benchmark host.')
  const retry = await p.runAgent({ ...input, attempt: 1 })
  assert.equal(retry.blocked, undefined)
  assert.equal(retry.text, 'Findings: fsync dominates.')
  assert.equal(retry.quality, 1)
})

test('a declined or failed call falls back to mock output and says so', async () => {
  const logs: string[] = []
  const { client } = fakeClient([
    { stop_reason: 'refusal', parsed_output: null, content: [] },
    new Anthropic.InternalServerError(500, undefined, 'boom', new Headers()),
  ])
  const p = provider(client, logs)
  const a = await p.runAgent({ agent: agent('eng-a'), mode: 'execute', task })
  assert.match(a.text, /placeholder content from the mock provider/)
  const b = await p.runAgent({ agent: agent('eng-a'), mode: 'review', task, childResults: [] })
  assert.match(b.text, /placeholder content/)
  assert.equal(logs.length, 2)
  assert.match(logs[0], /declined/)
})

test('bad credentials switch the session to mock without more API calls', async () => {
  const logs: string[] = []
  const { client, calls } = fakeClient([new Anthropic.AuthenticationError(401, undefined, 'invalid x-api-key', new Headers())])
  const p = provider(client, logs)
  await p.runAgent({ agent: agent('eng-a'), mode: 'execute', task })
  await p.runAgent({ agent: agent('eng-b'), mode: 'execute', task })
  assert.equal(calls.length, 1)
  assert.match(logs[0], /credentials/)
})

test('chat returns the text blocks; prepare never calls the API', async () => {
  const { client, calls } = fakeClient([
    { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Working on the flame graphs now.' }] },
  ])
  const p = provider(client)
  const chat = await p.runAgent({ agent: agent('eng-a'), mode: 'chat', prompt: 'How is it going?', task })
  assert.equal(chat.text, 'Working on the flame graphs now.')
  assert.equal((calls[0].output_config as { effort: string }).effort, 'low')
  await p.runAgent({ agent: agent('eng-a'), mode: 'prepare', task })
  assert.equal(calls.length, 1)
})

test('three failures in a row (e.g. no credentials) also switch to mock', async () => {
  const logs: string[] = []
  const boom = () => new Error('Could not resolve authentication method.')
  const { client, calls } = fakeClient([boom(), boom(), boom()])
  const p = provider(client, logs)
  for (let i = 0; i < 4; i++) await p.runAgent({ agent: agent('eng-a'), mode: 'execute', task })
  assert.equal(calls.length, 3)
  assert.match(logs.at(-1)!, /3 Claude calls failed in a row/)
})
