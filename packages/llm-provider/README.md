# packages/llm-provider — 🔜 Phase 3

```ts
interface LLMProvider {
  runAgent(input: AgentRunInput): Promise<AgentRunResult>
}
```

- `MockProvider` (default): role-based templates with a 1.5–4s delay, so the full demo runs without any API key.
- `ClaudeProvider` (`ANTHROPIC_API_KEY`) and `OpenAIProvider` (`OPENAI_API_KEY`).

Select with `LLM_PROVIDER=mock|claude|openai`; it falls back to Mock when the key is missing.
