import { ClaudeProvider } from './claude'
import { MockProvider, type MockOptions } from './mock'
import type { LLMProvider } from './types'

export * from './types'
export { MockProvider } from './mock'
export { ClaudeProvider, DEFAULT_CLAUDE_MODEL } from './claude'
export { isDemoPrompt, topicOf } from './mockContent'

export type ProviderName = 'mock' | 'claude' | 'openai'

export type ProviderOptions = MockOptions & {
  /** Claude model id (defaults to Claude Opus 5.5). */
  model?: string
}

/**
 * Picks the provider from configuration. `claude` runs real agents on the Claude API
 * and falls back to the mock provider per step when a call fails; `openai` is not
 * implemented yet and falls back to the mock provider with a warning.
 */
export function createProvider(name: string = 'mock', options: ProviderOptions = {}, warn = console.warn): LLMProvider {
  const mock = new MockProvider(options)
  if (name === 'claude') return new ClaudeProvider({ model: options.model, fallback: mock, log: warn })
  if (name !== 'mock') warn(`[llm] provider "${name}" is not implemented yet, using the mock provider`)
  return mock
}
