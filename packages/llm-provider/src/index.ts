import { MockProvider, type MockOptions } from './mock'
import type { LLMProvider } from './types'

export * from './types'
export { MockProvider } from './mock'
export { isDemoPrompt, topicOf } from './mockContent'

export type ProviderName = 'mock' | 'claude' | 'openai'

/**
 * Picks the provider from configuration. Only the Mock provider exists in the MVP;
 * Claude and OpenAI providers plug in here later (same interface), and until then
 * asking for them falls back to Mock with a warning.
 */
export function createProvider(name: string = 'mock', options: MockOptions = {}, warn = console.warn): LLMProvider {
  if (name !== 'mock') warn(`[llm] provider "${name}" is not implemented yet, using the mock provider`)
  return new MockProvider(options)
}
