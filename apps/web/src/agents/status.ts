import type { AgentStatus, Department } from '@office/shared'

export const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  idle: { label: 'Idle', color: '#9aa3ad' },
  thinking: { label: 'Thinking', color: '#a77bdb' },
  working: { label: 'Working', color: '#34b27a' },
  meeting: { label: 'Meeting', color: '#3b9fd8' },
  reporting: { label: 'Reporting', color: '#e0b04c' },
  blocked: { label: 'Blocked', color: '#e05a4f' },
  break: { label: 'Break', color: '#d98a5a' },
}

export const DEPT_COLOR: Record<Department, string> = {
  Executive: '#c9a24d',
  Engineering: '#3b9fd8',
  Research: '#e08a3c',
}
