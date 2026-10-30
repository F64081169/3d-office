import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { Agent, TaskPriority } from '@office/shared'
import { z } from 'zod'
import { DIRECTOR_ACK } from './mockContent'
import type { AgentRunInput, AgentRunMode, AgentRunResult, LLMProvider, WorkPlan } from './types'

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5'

/** Thinking depth per mode: planning and the work itself get more, bookkeeping and chat less. */
const EFFORT: Record<Exclude<AgentRunMode, 'prepare'>, 'low' | 'medium'> = {
  plan: 'medium',
  split: 'low',
  execute: 'medium',
  review: 'low',
  summarize: 'medium',
  chat: 'low',
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
const FALLBACK_NOTE = '(Claude was unavailable for this step, so this is placeholder content from the mock provider.)'
/** After this many failures in a row (bad config, no network) the session stays on mock. */
const MAX_FAILURES = 3

export type ClaudeOptions = {
  /** Defaults to Claude Opus 5.5. */
  model?: string
  /** Used when a call fails or is declined, so the company keeps running. */
  fallback: LLMProvider
  /** Defaults to `new Anthropic()` (ANTHROPIC_API_KEY or an `ant auth login` profile). */
  client?: Anthropic
  log?: (message: string) => void
}

const clamp01 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined)

const roster = (team: Agent[]) =>
  team.map((a) => `- ${a.id}: ${a.name}, ${a.role} (${a.department}). Skills: ${a.skills.join(', ')}.`).join('\n')

/**
 * Work items handed one level down. Assignee and priority are plain strings checked
 * here (the SDK sends string enums as descriptions only), so one bad id drops one item,
 * not the whole plan.
 */
const workSchema = (ids: string[]) =>
  z.array(
    z.object({
      title: z.string().describe('One sentence, imperative, ending with a period.'),
      description: z.string().describe('Two sentences: what to do and what a good result looks like.'),
      assignee: z.string().describe(`Exactly one of: ${ids.join(', ')}`),
      priority: z.string().describe(`One of: ${PRIORITIES.join(', ')}`),
    }),
  )

/**
 * Real agents on the Claude API. Each "thought" is one Messages call with a JSON
 * schema (structured outputs), so plans come back as data, not prose to parse.
 *
 * - `prepare` makes no call: the runtime only uses it as thinking time.
 * - A failed or declined call falls back to the mock provider for that step and
 *   says so in the text. Rejected credentials, or three failures in a row (for
 *   example no credentials at all), switch the rest of the session to mock.
 */
export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude'
  readonly model: string
  private client: Anthropic
  private fallback: LLMProvider
  private log: (message: string) => void
  private disabled = false
  private failures = 0

  constructor({ model = DEFAULT_CLAUDE_MODEL, fallback, client, log = console.warn }: ClaudeOptions) {
    this.model = model
    this.fallback = fallback
    // Per-request timeout keeps a stuck call from freezing an agent for the SDK's 10 minute default.
    this.client = client ?? new Anthropic({ timeout: 120_000, maxRetries: 3 })
    this.log = log
  }

  async runAgent(input: AgentRunInput): Promise<AgentRunResult> {
    if (this.disabled || input.mode === 'prepare') return this.fallback.runAgent(input)
    try {
      const res = await this.call(input)
      this.failures = 0
      return res
    } catch (err) {
      return this.recover(input, err)
    }
  }

  private async call(input: AgentRunInput): Promise<AgentRunResult> {
    const { agent, mode, task, team = [], childResults = [], attempt = 0 } = input
    const project = input.projectPrompt ? `The Owner's request for this project: "${input.projectPrompt}"\n\n` : ''

    switch (mode) {
      case 'plan': {
        const ids = team.map((m) => m.id)
        if (!ids.length) throw new Error('no managers to plan for')
        const out = await this.parse(
          input,
          `The Owner asked you: "${input.prompt}"\n\nYour managers:\n${roster(team)}\n\n` +
            'Turn this into a project: a short title (at most six words, Title Case) and one to three workstreams, ' +
            "each owned by the manager whose team fits it. One workstream per manager is typical; give a manager two only when the work clearly splits (for example research and QA). Use 'high' priority for workstreams.",
          z.object({ title: z.string(), workstreams: workSchema(ids) }),
        )
        return { text: DIRECTOR_ACK, title: out.title, work: this.work(out.workstreams, ids) }
      }
      case 'split': {
        const ids = team.map((m) => m.id)
        if (!ids.length || !task) throw new Error('nothing to split')
        const out = await this.parse(
          input,
          `${project}The Director gave you this workstream:\n**${task.title}**\n${task.description}\n\nYour team:\n${roster(team)}\n\n` +
            "Split it into subtasks for your team: at most one subtask per person, and only people whose skills fit. Use 'medium' priority unless something is clearly harder.",
          z.object({ subtasks: workSchema(ids) }),
        )
        const work = this.work(out.subtasks, ids)
        return { text: `Splitting "${task.title}" into ${work.length} subtask${work.length === 1 ? '' : 's'}.`, work }
      }
      case 'execute': {
        if (!task) throw new Error('no task')
        const retry = attempt > 0 ? '\n\nYou were blocked on this earlier; that has been resolved, so finish the task now.' : ''
        const out = await this.parse(
          input,
          `${project}Your task:\n**${task.title}**\n${task.description}${retry}\n\n` +
            'Do the task from your expertise (you cannot run code or reach real systems; state assumptions where you need numbers). ' +
            `Report in at most 120 words: a first line "Findings for "${task.title.replace(/\.$/, '')}":" followed by three or four lines starting with "• ".\n` +
            'Set `blocked` to a one-sentence reason only if the task is impossible without something only a person can give you (access, a decision); otherwise null. ' +
            '`confidence` is how sure you are of the result, from 0 to 1.',
          z.object({ result: z.string(), blocked: z.string().nullable(), confidence: z.number() }),
        )
        // A retry never blocks again: the runtime has already waited for the blocker to clear.
        if (out.blocked && attempt === 0) return { text: out.blocked, blocked: out.blocked }
        return { text: out.result, quality: clamp01(out.confidence) }
      }
      case 'review':
      case 'summarize': {
        if (!task) throw new Error('no task')
        const results = childResults
          .map((r) => `### ${r.agent.name} (${r.agent.role}): ${r.task.title}\n${r.task.result ?? '(no result)'}`)
          .join('\n\n')
        const brief =
          mode === 'review'
            ? `Review your team's results for the workstream **${task.title}** and write your report for the Director, at most 150 words: ` +
              `a first line "**${agent.name}'s review: ${task.title.replace(/\.$/, '')}**", one "• " line per person with their key finding, then a "Recommendation:" line.`
            : `Integrate your managers' reports into the final answer for the Owner, at most 250 words: a first line "**${input.projectTitle ?? task.title}: final report**", ` +
              'then short sections with **bold** labels (findings, proposed improvements in order, validation) using "• " or numbered lines.'
        const out = await this.parse(
          input,
          `${project}${results}\n\n${brief}\n\`quality\` is how completely these results answer the request, from 0 to 1.`,
          z.object({ report: z.string(), quality: z.number() }),
        )
        return { text: out.report, quality: clamp01(out.quality) }
      }
      case 'chat': {
        const about = task ? `Your ${task.status === 'completed' ? 'most recent' : 'current'} task: "${task.title}" (${task.status}).` : 'You have no task right now.'
        const rule =
          agent.level === 3
            ? 'If the Owner asks for work, say you will set up a project.'
            : 'You cannot start new work from a chat; the Owner assigns tasks from your panel.'
        const res = await this.client.beta.messages.create({
          ...this.common(input),
          messages: [{ role: 'user', content: `${about} ${rule}\n\nThe Owner says: "${input.prompt ?? ''}"\n\nReply in at most 60 words.` }],
        })
        this.assertUsable(res)
        const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim()
        if (!text) throw new Error('empty reply')
        return { text }
      }
      default:
        throw new Error(`unsupported mode ${mode}`)
    }
  }

  /** One structured-output call; returns the validated object. */
  private async parse<T extends z.ZodType>(input: AgentRunInput, prompt: string, schema: T): Promise<z.infer<T>> {
    const res = await this.client.beta.messages.parse({
      ...this.common(input),
      output_config: { effort: EFFORT[input.mode as keyof typeof EFFORT], format: betaZodOutputFormat(schema) },
      messages: [{ role: 'user', content: prompt }],
    })
    this.assertUsable(res)
    if (res.parsed_output == null) throw new Error('response did not match the schema')
    return res.parsed_output as z.infer<T>
  }

  private common({ agent, mode }: AgentRunInput) {
    return {
      model: this.model,
      max_tokens: 16000,
      // Server-side fallback: a policy decline is retried on Anthropic's recommended model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default' as const,
      ...(mode === 'chat' ? { output_config: { effort: EFFORT.chat } } : {}),
      system:
        `You are ${agent.name}, ${agent.role} in the ${agent.department} department of Claude Office, a small simulated company of AI agents. ` +
        'The Owner talks only to the Director (Aria); the Director delegates to the Engineering Manager (Marcus) and the Research Manager (Sofia), who delegate to their teams. ' +
        `Your skills: ${agent.skills.join(', ')}. Write like a sharp colleague: concrete, specific, no filler. ` +
        'Formatting: plain lines with **bold**, `code`, and "• " bullets; no tables and no # headings.',
    }
  }

  private assertUsable(res: { stop_reason: string | null }) {
    if (res.stop_reason === 'refusal') throw new Error('the model declined this request')
    if (res.stop_reason === 'max_tokens') throw new Error('the response was cut off')
  }

  /** Keep items for real assignees and normalise the priority. */
  private work(items: { title: string; description: string; assignee: string; priority: string }[], ids: string[]): WorkPlan[] {
    const work = items
      .filter((w) => ids.includes(w.assignee))
      .map((w) => ({ ...w, priority: (PRIORITIES as readonly string[]).includes(w.priority) ? (w.priority as TaskPriority) : 'medium' }))
    if (!work.length) throw new Error('the plan assigned no work')
    return work
  }

  private async recover(input: AgentRunInput, err: unknown): Promise<AgentRunResult> {
    if (!this.disabled) {
      this.failures++
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        this.disabled = true
        this.log(`[llm] Claude rejected the credentials (${err.status}); using the mock provider for the rest of this session`)
      } else {
        const status = err instanceof Anthropic.APIError ? ` (${err.status ?? 'network'})` : ''
        this.log(`[llm] Claude ${input.mode} for ${input.agent.id} failed${status}: ${(err as Error).message}; using mock output`)
        if (this.failures >= MAX_FAILURES) {
          this.disabled = true
          this.log(`[llm] ${MAX_FAILURES} Claude calls failed in a row; using the mock provider for the rest of this session`)
        }
      }
    }
    const res = await this.fallback.runAgent(input)
    // Plans and blocks are data, not prose; only label the text people read.
    return res.blocked || input.mode === 'plan' || input.mode === 'split' ? res : { ...res, text: `${res.text}\n${FALLBACK_NOTE}` }
  }
}
