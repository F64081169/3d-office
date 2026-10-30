import type { TaskPriority, TaskStatus } from '@office/shared'

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: '#9aa3ad' },
  assigned: { label: 'Assigned', color: '#8a93c9' },
  working: { label: 'In progress', color: '#34b27a' },
  blocked: { label: 'Blocked', color: '#e05a4f' },
  review: { label: 'In review', color: '#e0b04c' },
  completed: { label: 'Completed', color: '#3b9fd8' },
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const timeOf = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

/** Score colour: excellent / good / fair / poor. */
export const scoreColor = (total: number) =>
  total >= 90 ? '#2f9e6e' : total >= 80 ? '#3b8fd0' : total >= 70 ? '#c99227' : '#d0574d'
