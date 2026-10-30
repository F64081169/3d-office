import type { AgentStatus, CompanyState, StampedEvent, TaskPriority } from '@office/shared'

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText)
  return data as T
}

export type Snapshot = { seq: number; provider: string; state: CompanyState }
export type NewTaskInput = { title: string; description?: string; priority: TaskPriority }

/** Commands go to the server; their effects come back as events on the stream. */
export const api = {
  snapshot: () => request<Snapshot>('/api/state'),
  message: (agentId: string, text: string) => request(`/api/agents/${agentId}/messages`, { text }),
  assign: (agentId: string, task: NewTaskInput) => request(`/api/agents/${agentId}/tasks`, task),
  reward: (agentId: string, coins = 100) => request(`/api/agents/${agentId}/reward`, { coins }),
  previewStatus: (agentId: string, status: AgentStatus) => request(`/api/dev/agents/${agentId}/status`, { status }),
  reset: () => request('/api/admin/reset', {}),
}

/**
 * Live event stream (Server-Sent Events). The browser reconnects on its own and the
 * server replays everything after Last-Event-ID; if that is impossible it asks for a resync.
 */
export function streamEvents(
  after: number,
  handlers: { event: (e: StampedEvent) => void; resync: () => void; online: (up: boolean) => void },
) {
  const source = new EventSource(`/api/events?after=${after}`)
  source.onmessage = (m) => handlers.event(JSON.parse(m.data) as StampedEvent)
  source.addEventListener('resync', handlers.resync)
  source.onopen = () => handlers.online(true)
  source.onerror = () => handlers.online(false)
  return () => source.close()
}
