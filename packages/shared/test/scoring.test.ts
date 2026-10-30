import assert from 'node:assert/strict'
import { test } from 'node:test'
import { companyStats, createCompanyState, nextPerformance, reduceEvent, scoreTask, SEED_COINS, type Task } from '../src/index'

test('score = 50 + quality + speed + difficulty + review', () => {
  const s = scoreTask({ priority: 'medium', quality: 0.9, seconds: 18, expectedSeconds: 20, firstPass: 1 })
  assert.deepEqual(s, { total: 50 + 18 + 10 + 5 + 10, quality: 18, speed: 10, difficulty: 5, review: 10 })

  // Late by half the estimate and needed a retry.
  const slow = scoreTask({ priority: 'high', quality: 0.8, seconds: 30, expectedSeconds: 20, firstPass: 0.5 })
  assert.equal(slow.speed, 5)
  assert.equal(slow.review, 5)
  assert.equal(slow.total, 50 + 16 + 5 + 8 + 5)

  // Bounds hold for silly inputs.
  const worst = scoreTask({ priority: 'low', quality: -1, seconds: 999, expectedSeconds: 1, firstPass: -3 })
  assert.equal(worst.total, 52)
  const best = scoreTask({ priority: 'critical', quality: 7, seconds: 0, expectedSeconds: 10, firstPass: 9 })
  assert.equal(best.total, 100)
})

test('performance is a clamped moving average', () => {
  assert.equal(nextPerformance(80, 100), 84)
  assert.equal(nextPerformance(80, 50), 74)
  assert.equal(nextPerformance(100, 100), 100)
})

test('a scored completion updates the task and the assignee; coins are separate events', () => {
  let s = createCompanyState()
  const task: Task = {
    id: 't1',
    title: 'Profile the write path',
    description: '',
    createdBy: 'eng-manager',
    assignedTo: 'eng-a',
    status: 'backlog',
    priority: 'medium',
    reward: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
  s = reduceEvent(s, { type: 'TASK_CREATED', task })
  s = reduceEvent(s, { type: 'TASK_ASSIGNED', taskId: 't1', agentId: 'eng-a' })
  s = reduceEvent(s, { type: 'TASK_STARTED', taskId: 't1', agentId: 'eng-a', startedAt: '2026-01-01T00:00:05.000Z' })
  assert.equal(s.tasks.t1.startedAt, '2026-01-01T00:00:05.000Z')

  const before = s.agents.find((a) => a.id === 'eng-a')!.performance
  const score = scoreTask({ priority: 'medium', quality: 1, seconds: 10, expectedSeconds: 20, firstPass: 1 })
  s = reduceEvent(s, { type: 'TASK_COMPLETED', taskId: 't1', agentId: 'eng-a', result: 'ok', completedAt: '2026-01-01T00:00:20.000Z', score })
  assert.deepEqual(s.tasks.t1.score, score)
  assert.equal(s.agents.find((a) => a.id === 'eng-a')!.performance, nextPerformance(before, score.total))
  assert.equal(companyStats(s).coinsDistributed, 0)

  s = reduceEvent(s, { type: 'AGENT_REWARDED', agentId: 'eng-a', coins: 100, reason: 'Task completed', taskId: 't1' })
  assert.equal(s.tasks.t1.paid, 100)
  const stats = companyStats(s)
  assert.equal(stats.coinsDistributed, 100)
  assert.equal(stats.totalCoins, SEED_COINS + 100)
  assert.equal(stats.completedTasks, 1)
  assert.equal(stats.activeTasks, 0)
  assert.equal(stats.averageScore, score.total)
})
