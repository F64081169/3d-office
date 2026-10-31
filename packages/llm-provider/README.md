# packages/llm-provider

```ts
interface LLMProvider {
  readonly name: string
  runAgent(input: AgentRunInput): Promise<AgentRunResult>
}
// modes: plan · split · prepare · execute · review · summarize · chat
```

- **MockProvider** (default): role- and mode-specific templates with simulated latency, so the whole flow
  runs without an API key.
  - The demo prompt ("random write…") gets hand-written, consistent content.
  - Anything else uses topic-based templates.
  - `speed` scales latency; `blockRate` makes some non-demo tasks block once.
- **Claude / OpenAI**: implement `LLMProvider` and register it in `createProvider` (`LLM_PROVIDER=claude`).
  Until then those names fall back to Mock with a warning.
