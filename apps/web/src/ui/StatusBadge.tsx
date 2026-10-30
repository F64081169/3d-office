import type { AgentStatus } from '@office/shared'
import { STATUS_META } from '../agents/status'

/** The one status visual used by the roster, the panel and (via the same CSS) the 3D tags. */
export function Badge({ label, color, pulse }: { label: string; color: string; pulse?: boolean }) {
  return (
    <span className={`status-pill ${pulse ? 'is-pulsing' : ''}`} style={{ '--status': color } as React.CSSProperties}>
      <i />
      {label}
    </span>
  )
}

const ACTIVE: AgentStatus[] = ['thinking', 'working', 'blocked']

export function StatusBadge({ status }: { status: AgentStatus }) {
  const meta = STATUS_META[status]
  return <Badge label={meta.label} color={meta.color} pulse={ACTIVE.includes(status)} />
}
