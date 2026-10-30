import type { Agent, Task } from '@office/shared'
import type { WorkPlan } from './types'

/**
 * Canned content for the Mock provider. The flagship demo (random write performance)
 * gets hand-written, internally consistent results; any other request falls back to
 * topic-based templates so the whole flow still works without an API key.
 */

export const isDemoPrompt = (text = '') => /random[\s-]*writ/i.test(text)

/** "Analyze random write performance bottleneck and propose improvements." → "random write performance bottleneck" */
export function topicOf(prompt: string) {
  const t = prompt
    .trim()
    .replace(/[.!?。！？]+$/, '')
    .replace(/^(please|pls|can you|could you|let'?s)\s+/i, '')
    .replace(/^(analy[sz]e|investigate|research|look into|study|design|build|create|improve|review|figure out|find out)\s+/i, '')
    .replace(/\s+and\s+(propose|suggest|recommend)\s+.*$/i, '')
    .replace(/^(the|our)\s+/i, '')
  return t || prompt.trim()
}

export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const pick = <T,>(arr: T[], seed: string) => arr[hash(seed) % arr.length]

const isQaTask = (t: Task) => /(validat|benchmark plan|test plan|\bqa\b|verif)/i.test(`${t.title} ${t.description}`)
const isQaAgent = (a: Agent) => /\bQA\b/.test(a.role)

// ---------------------------------------------------------------------------------
// Flagship demo: "Analyze random write performance bottleneck and propose improvements."
// ---------------------------------------------------------------------------------

const DEMO = {
  title: 'Random write performance investigation',
  workstreams: {
    engineering: {
      title: 'Analyze current write path and identify bottlenecks.',
      description: 'Trace the random-write path end to end, measure where latency and throughput are lost, and rank the bottlenecks by impact.',
    },
    research: {
      title: 'Research possible optimization strategies.',
      description: 'Survey proven techniques for random-write heavy workloads and judge which fit our storage engine.',
    },
    qa: {
      title: 'Design validation and benchmark plan.',
      description: 'Define how improvements will be measured: workloads, metrics, environments and pass/fail criteria.',
    },
  },
  subtasks: {
    'eng-a': {
      title: 'Profile the write path end to end',
      description: 'Capture flame graphs and syscall traces for a 4K random-write workload and attribute latency to each layer.',
    },
    'eng-b': {
      title: 'Inspect lock contention and buffering',
      description: 'Measure lock hold times, commit queue depth and buffer-pool behaviour with concurrent writers.',
    },
    'eng-c': {
      title: 'Examine fsync, page cache and I/O scheduler effects',
      description: 'Quantify the cost of fsync per commit, dirty-page writeback and the block-layer scheduler choice.',
    },
    'research-a': {
      title: 'Survey log-structured and batching techniques',
      description: 'Summarise WAL group commit, LSM layouts and write batching, with their trade-offs.',
    },
    'research-b': {
      title: 'Collect benchmark data and industry comparisons',
      description: 'Gather published numbers for comparable engines and map them to our workload.',
    },
    'qa-agent': {
      title: 'Write the benchmark matrix and regression criteria',
      description: 'Specify fio jobs, metrics, environments, crash tests and pass/fail thresholds.',
    },
  } as Record<string, { title: string; description: string }>,
  results: {
    'eng-a': [
      'Profiled 4K random writes (QD 1–32, 8 writers):',
      '• 41% of p99 latency is fsync after every commit.',
      '• 18% is allocator / page-table work on the write-buffer path.',
      '• Write amplification is 3.4× (WAL + data page + index page).',
      '• Throughput plateaus at ~38k IOPS; the device sustains ~120k.',
    ],
    'eng-b': [
      'Lock and buffer analysis with 16 concurrent writers:',
      '• One global WAL mutex is held for 62% of each commit, so writers serialise.',
      '• Buffer-pool hit rate drops to 71% on random keys; dirty pages are evicted synchronously.',
      '• Commit queue depth peaks at 14, median wait 0.9 ms.',
    ],
    'eng-c': [
      'Kernel / storage layer findings:',
      '• fsync per commit costs 0.6–1.1 ms on NVMe; batching 8 commits brings it to ~0.15 ms each.',
      '• Default dirty_ratio triggers writeback storms every ~5 s (p99 spikes to 40 ms).',
      '• Switching the NVMe scheduler from mq-deadline to none gives +9% IOPS.',
    ],
    'research-a': [
      'Optimization strategies:',
      '• WAL group commit: amortise fsync across concurrent transactions (typically 3–8× fewer fsyncs).',
      '• LSM / log-structured layout: turns random writes into sequential appends, at the cost of compaction and read amplification.',
      '• Write batching + async flush for data that tolerates bounded staleness.',
      '• io_uring with registered buffers to cut syscall overhead.',
    ],
    'research-b': [
      'Benchmark landscape:',
      '• RocksDB and WiredTiger report 2–4× random-write gains from group commit at QD ≥ 8.',
      '• LSM engines sustain ~85% of sequential write bandwidth on random keys.',
      '• We reach ~30% of device capability today; peers reach 60–75%.',
    ],
    'qa-agent': [
      'Validation plan:',
      '• fio matrix: 4K/16K randwrite, QD 1/8/32, 1/8/16 jobs, 60 s ramp + 5 min steady state.',
      '• Metrics: IOPS, p50/p99/p99.9 latency, write amplification, CPU per I/O.',
      '• Environments: local NVMe and cloud block storage.',
      '• Pass: ≥ 2× IOPS at QD8, no p99 regression, zero data loss in crash tests (kill -9 + power-loss simulation).',
    ],
  } as Record<string, string[]>,
  reviews: {
    engineering: [
      '**Engineering review:** bottlenecks ranked by impact',
      '1. fsync on every commit (~40% of p99 latency).',
      '2. A global WAL mutex serialises writers.',
      '3. Writeback storms from default dirty_ratio settings.',
      '4. 3.4× write amplification.',
      'Recommendation: WAL group commit first, then shard the WAL lock and tune writeback.',
    ],
    research: [
      '**Research review:** group commit is the highest-leverage, lowest-risk change (2–4× in comparable engines).',
      'An LSM layout is a bigger redesign worth prototyping for write-heavy tables; io_uring is a good follow-up once commits are batched.',
    ],
    qa: [
      '**QA review:** the fio matrix and crash tests are ready to run on NVMe and cloud block storage.',
      'Gate: ≥ 2× IOPS at QD8 with no p99 regression and no data loss.',
    ],
  },
  summary: [
    '**Random write performance: final report**',
    '',
    '**Root causes**',
    '1. fsync after every commit dominates latency (~40% of p99).',
    '2. A global WAL mutex serialises concurrent writers.',
    '3. Default writeback settings cause periodic 40 ms latency spikes.',
    '4. Write amplification is 3.4×.',
    '',
    '**Proposed improvements, in order**',
    '1. WAL group commit (expected 2–4× IOPS at QD ≥ 8).',
    '2. Shard the WAL lock / per-core commit queues.',
    '3. Tune dirty_ratio and writeback; use the `none` scheduler on NVMe.',
    '4. Prototype an LSM layout for write-heavy tables, then evaluate io_uring.',
    '',
    '**Validation**',
    "Omar's fio matrix plus crash tests. Success = ≥ 2× IOPS at QD8 with no p99 regression.",
    '',
    'Team: Marcus (Alex, Priya, Kenji) and Sofia (Leo, Mina, Omar).',
  ],
  /** One deliberate hiccup so the demo shows the Blocked state. */
  block: { agent: 'eng-c', reason: 'Needs root access on the benchmark host to change the I/O scheduler.' },
}

type Stream = keyof typeof DEMO.workstreams
const streamOf = (t: Task): Stream =>
  t.title === DEMO.workstreams.qa.title ? 'qa' : t.title === DEMO.workstreams.research.title ? 'research' : 'engineering'

// ---------------------------------------------------------------------------------
// Builders used by MockProvider
// ---------------------------------------------------------------------------------

export function planProject(prompt: string, managers: Agent[]): { title: string; work: WorkPlan[] } {
  const eng = managers.find((m) => m.department === 'Engineering') ?? managers[0]
  const res = managers.find((m) => m.department === 'Research') ?? managers[managers.length - 1]
  if (isDemoPrompt(prompt)) {
    const w = DEMO.workstreams
    return {
      title: DEMO.title,
      work: [
        { ...w.engineering, assignee: eng.id, priority: 'high' },
        { ...w.research, assignee: res.id, priority: 'high' },
        { ...w.qa, assignee: res.id, priority: 'high' },
      ],
    }
  }
  const topic = topicOf(prompt)
  return {
    title: titleCase(topic).slice(0, 70),
    work: [
      {
        title: `Analyze the current state of ${topic}.`,
        description: `Map how ${topic} works today, measure it, and identify the main constraints.`,
        assignee: eng.id,
        priority: 'high',
      },
      {
        title: `Research approaches for ${topic}.`,
        description: `Survey proven approaches and trade-offs relevant to ${topic}.`,
        assignee: res.id,
        priority: 'high',
      },
      {
        title: `Design a validation plan for ${topic}.`,
        description: `Define metrics, test scenarios and acceptance criteria for ${topic}.`,
        assignee: res.id,
        priority: 'medium',
      },
    ],
  }
}

export function splitTask(task: Task, team: Agent[], demo: boolean): WorkPlan[] {
  const qa = isQaTask(task)
  const members = team.filter((a) => isQaAgent(a) === qa)
  const assignees = members.length ? members : team
  return assignees.map((a) => {
    const canned = demo ? DEMO.subtasks[a.id] : undefined
    if (canned) return { ...canned, assignee: a.id, priority: 'medium' }
    const focus = a.skills[0] ?? a.role
    const topic = task.title.replace(/\.$/, '')
    return {
      title: `${focus}: ${topic.charAt(0).toLowerCase()}${topic.slice(1)}`,
      description: `Apply ${a.skills.slice(0, 2).join(' and ').toLowerCase()} to "${task.title}" and report findings.`,
      assignee: a.id,
      priority: 'medium',
    }
  })
}

const OBSERVATIONS = [
  'most of the cost sits in a small number of hot paths',
  'the current design was never tuned for this load profile',
  'measurements vary a lot between runs, so we need tighter baselines',
  'two dependencies dominate the latency budget',
  'the simplest fix is also the one with the biggest payoff',
]
const RECOMMENDATIONS = [
  'start with the low-risk change and measure before going further',
  'add instrumentation first so every later change can be compared',
  'prototype the top option behind a feature flag',
  'batch the expensive operations instead of doing them per request',
]

export function executeResult(agent: Agent, task: Task, demo: boolean): string {
  const canned = demo ? DEMO.results[agent.id] : undefined
  if (canned) return canned.join('\n')
  return [
    `Findings for "${task.title}":`,
    `• Looked at it through ${agent.skills.slice(0, 2).join(' and ').toLowerCase()}.`,
    `• Key observation: ${pick(OBSERVATIONS, task.id)}.`,
    `• Recommendation: ${pick(RECOMMENDATIONS, task.id + agent.id)}.`,
  ].join('\n')
}

export function blockReason(agent: Agent, task: Task, demo: boolean, blockRate: number): string | undefined {
  if (demo) return agent.id === DEMO.block.agent ? DEMO.block.reason : undefined
  if ((hash(task.id) % 1000) / 1000 >= blockRate) return undefined
  return pick(
    [
      'Waiting for access to production metrics.',
      'Needs a decision on scope before continuing.',
      'Test environment is unavailable right now.',
    ],
    task.id,
  )
}

const firstLine = (s = '') => s.split('\n')[0].replace(/:$/, '')

export function reviewText(manager: Agent, task: Task, results: { agent: Agent; task: Task }[], demo: boolean): string {
  if (demo) return DEMO.reviews[streamOf(task)].join('\n')
  return [
    `**${manager.name}'s review: ${task.title.replace(/\.$/, '')}**`,
    ...results.map((r) => `• ${r.agent.name}: ${firstLine(r.task.result?.split('\n')[2]?.replace(/^•\s*/, '') ?? r.task.title)}`),
    `Recommendation: ${pick(RECOMMENDATIONS, task.id)}.`,
  ].join('\n')
}

export function summaryText(projectTitle: string, reports: { agent: Agent; task: Task }[], demo: boolean): string {
  if (demo) return DEMO.summary.join('\n')
  return [
    `**${projectTitle}: final report**`,
    '',
    ...reports.flatMap((r) => [`**${r.task.title.replace(/\.$/, '')}** (${r.agent.name})`, ...(r.task.result ?? '').split('\n').slice(1), '']),
    `**Next step:** ${pick(RECOMMENDATIONS, projectTitle)}.`,
  ].join('\n')
}

export function chatReply(agent: Agent, prompt: string, task?: Task): string {
  if (/^(hi|hello|hey|yo|嗨|哈囉|你好)\b/i.test(prompt.trim())) {
    return agent.level === 3
      ? "Hi! Tell me what you need and I'll turn it into a project for the team."
      : `Hi! ${agent.name} here. ${task ? `I'm on "${task.title}".` : 'Nothing on my plate right now.'}`
  }
  if (!task) return `I'm free at the moment. Assign me something from my panel and I'll get on it.`
  if (task.status === 'completed') {
    const headline = task.result?.split('\n').find((l) => l.trim().startsWith('•'))?.replace(/^\s*•\s*/, '')
    return `I finished "${task.title}".${headline ? ` Headline: ${headline}` : ''} I'm free for the next thing.`
  }
  const phase: Record<string, string> = {
    assigned: "it's next in my queue",
    working: "I'm in the middle of it",
    review: "it's in review",
    blocked: `I'm blocked: ${task.blockedReason ?? 'waiting on something'}`,
    completed: "it's done",
    backlog: "it's in the backlog",
  }
  return `I'm on "${task.title}": ${phase[task.status] ?? task.status}.`
}

export const DIRECTOR_ACK = 'Understood. I am creating a project and assigning work.'
