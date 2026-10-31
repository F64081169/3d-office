import type { CompanyState, Department, Task, TaskStatus } from '@office/shared'
import { useMemo } from 'react'
import { fitText, useLiveTexture } from '../../assets/liveTexture'
import { MAT } from '../../assets/materials'
import { Box, GEO } from '../../assets/primitives'
import { FONT } from '../../assets/textures'
import { useOfficeStore } from '../../store/officeStore'
import { ZONES } from '../layout'

const W = 1024
const H = 560
const COLUMNS: { title: string; statuses: TaskStatus[] }[] = [
  { title: 'TO DO', statuses: ['backlog', 'assigned'] },
  { title: 'IN PROGRESS', statuses: ['working', 'blocked'] },
  { title: 'REVIEW', statuses: ['review'] },
  { title: 'DONE', statuses: ['completed'] },
]
const NOTE: Record<Department, string> = { Engineering: '#cfe6f7', Research: '#fbe1c8', Executive: '#f3e7c4' }
const PER_COLUMN = 5

/** Sticky notes per column: workstreams, subtasks and the Owner's direct tasks (not project roots). */
function boardData(s: CompanyState) {
  const project = Object.values(s.projects).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const notes = Object.values(s.tasks)
    .filter((t) => !(t.projectId && !t.parentTaskId))
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt))
  const note = (t: Task) => {
    const a = s.agents.find((x) => x.id === t.assignedTo)
    return { title: t.title.replace(/\.$/, ''), who: a?.name ?? t.assignedTo, color: NOTE[a?.department ?? 'Executive'], blocked: t.status === 'blocked', score: t.score?.total }
  }
  return {
    project: project?.title,
    columns: COLUMNS.map((c) => {
      const all = notes.filter((t) => c.statuses.includes(t.status))
      return { title: c.title, count: all.length, notes: all.slice(0, PER_COLUMN).map(note) }
    }),
  }
}

type Board = ReturnType<typeof boardData>

/** Two lines of text that fit `width`, the second ending in an ellipsis if needed. */
function twoLines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(' ')
  let first = ''
  while (words.length && ctx.measureText(`${first} ${words[0]}`.trim()).width <= width) first = `${first} ${words.shift()}`.trim()
  return [first || fitText(ctx, text, width), words.length ? fitText(ctx, words.join(' '), width) : '']
}

function draw(ctx: CanvasRenderingContext2D, { project, columns }: Board) {
  ctx.fillStyle = '#fbfaf7'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#1d232b'
  ctx.font = `700 30px ${FONT}`
  ctx.fillText('TASK BOARD', 32, 50)
  if (project) {
    ctx.fillStyle = '#6b7480'
    ctx.font = `400 22px ${FONT}`
    const p = fitText(ctx, project, 560)
    ctx.fillText(p, W - 32 - ctx.measureText(p).width, 48)
  }
  const cw = (W - 64 - 3 * 16) / 4
  columns.forEach((col, i) => {
    const x = 32 + i * (cw + 16)
    ctx.fillStyle = '#eeebe5'
    ctx.fillRect(x, 70, cw, H - 92)
    ctx.fillStyle = '#4a525c'
    ctx.font = `700 17px ${FONT}`
    ctx.fillText(col.title, x + 12, 98)
    ctx.fillStyle = '#8a929c'
    ctx.fillText(String(col.count), x + cw - 12 - ctx.measureText(String(col.count)).width, 98)
    col.notes.forEach((n, j) => {
      const y = 112 + j * 82
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.fillRect(x + 10, y + 3, cw - 20, 72)
      ctx.fillStyle = n.color
      ctx.fillRect(x + 8, y, cw - 20, 72)
      if (n.blocked) {
        ctx.strokeStyle = '#e05a4f'
        ctx.lineWidth = 4
        ctx.strokeRect(x + 10, y + 2, cw - 24, 68)
      }
      ctx.fillStyle = '#1d232b'
      ctx.font = `500 16px ${FONT}`
      twoLines(ctx, n.title, cw - 40).forEach((line, k) => ctx.fillText(line, x + 18, y + 24 + k * 19))
      ctx.fillStyle = '#4a525c'
      ctx.font = `700 15px ${FONT}`
      ctx.fillText(n.blocked ? `${n.who} · blocked` : n.who, x + 18, y + 64)
      if (n.score) {
        const s = String(n.score)
        ctx.fillStyle = n.score >= 90 ? '#2f9e6e' : n.score >= 80 ? '#3b8fd0' : '#c99227'
        ctx.font = `700 15px ${FONT}`
        ctx.fillText(s, x + cw - 24 - ctx.measureText(s).width, y + 64)
      }
    })
    if (col.count > PER_COLUMN) {
      ctx.fillStyle = '#8a929c'
      ctx.font = `600 15px ${FONT}`
      ctx.fillText(`+${col.count - PER_COLUMN} more`, x + 12, H - 30)
    }
  })
}

/** A kanban board on the meeting room's glass, facing the workspace; it mirrors the real tasks. */
export function TaskBoard() {
  const agents = useOfficeStore((s) => s.agents)
  const tasks = useOfficeStore((s) => s.tasks)
  const projects = useOfficeStore((s) => s.projects)
  const data = useMemo(() => boardData({ agents, tasks, projects, messages: [] }), [agents, tasks, projects])
  const texture = useLiveTexture(W, H, data, draw)
  return (
    <group position={[-5.6, 1.45, ZONES.meeting.maxZ + 0.07]}>
      <Box size={[2.5, 1.4, 0.03]} material={MAT.blackMetal} />
      <mesh geometry={GEO.plane} scale={[2.4, 1.3125, 1]} position={[0, 0, 0.017]}>
        <meshStandardMaterial map={texture} roughness={0.6} />
      </mesh>
    </group>
  )
}
