import { companyStats, projectStats, type CompanyState } from '@office/shared'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { DEPT_COLOR } from '../../agents/status'
import { GEO } from '../../assets/primitives'
import { FONT } from '../../assets/textures'
import { useOfficeStore } from '../../store/officeStore'

const W = 1024
const H = 576
const C = {
  bg: '#121a24',
  tile: '#1b2633',
  ink: '#f4efe8',
  dim: '#8fa3b8',
  blue: '#3b9fd8',
  green: '#5fbf8f',
  gold: '#e0b04c',
  orange: '#e08a3c',
  red: '#e05a4f',
}

/** Everything the board shows. It is redrawn only when this changes. */
function boardData(s: CompanyState) {
  const st = companyStats(s)
  const projects = Object.values(s.projects).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const project = projects.find((p) => p.status === 'in_progress') ?? projects[0]
  const name = (id: string) => s.agents.find((a) => a.id === id)?.name ?? id
  return {
    st,
    project: project && { title: project.title, completed: project.status === 'completed', ...projectStats(s, project.id) },
    board: [...s.agents]
      .sort((a, b) => b.performance - a.performance)
      .map((a) => ({ name: a.name, perf: a.performance, color: DEPT_COLOR[a.department] })),
    recent: Object.values(s.tasks)
      .filter((t) => t.score)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, 3)
      .map((t) => ({ who: name(t.assignedTo), score: t.score!.total, paid: t.paid ?? 0 })),
  }
}

type Board = ReturnType<typeof boardData>

const fit = (ctx: CanvasRenderingContext2D, text: string, width: number) => {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t}…`
}

function draw(ctx: CanvasRenderingContext2D, { st, project, board, recent }: Board) {
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = C.ink
  ctx.font = `600 34px ${FONT}`
  ctx.fillText('Company Dashboard', 40, 60)
  ctx.fillStyle = C.green
  ctx.beginPath()
  ctx.arc(W - 112, 49, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = `600 20px ${FONT}`
  ctx.fillText('LIVE', W - 96, 56)
  ctx.fillStyle = C.dim
  ctx.font = `400 20px ${FONT}`
  ctx.fillText(`${st.activeAgents} of ${st.agents} agents busy · ${st.activeProjects} active project${st.activeProjects === 1 ? '' : 's'}`, 40, 92)

  const tiles: [string, string, string, string?][] = [
    ['Active tasks', String(st.activeTasks), C.blue, st.blockedTasks ? `${st.blockedTasks} blocked` : undefined],
    ['Completed', String(st.completedTasks), C.green],
    ['Coins paid', st.coinsDistributed.toLocaleString(), C.gold],
    ['Avg performance', String(st.averagePerformance), C.orange],
  ]
  const tw = (W - 80 - 3 * 16) / 4
  tiles.forEach(([label, value, color, note], i) => {
    const x = 40 + i * (tw + 16)
    ctx.fillStyle = C.tile
    ctx.fillRect(x, 116, tw, 104)
    ctx.fillStyle = color
    ctx.fillRect(x, 116, 6, 104)
    ctx.fillStyle = C.dim
    ctx.font = `400 19px ${FONT}`
    ctx.fillText(label, x + 22, 148)
    ctx.fillStyle = C.ink
    ctx.font = `600 46px ${FONT}`
    ctx.fillText(value, x + 22, 202)
    if (note) {
      ctx.fillStyle = C.red
      ctx.font = `600 18px ${FONT}`
      ctx.fillText(note, x + tw - 16 - ctx.measureText(note).width, 202)
    }
  })

  // Performance bars, best first.
  ctx.fillStyle = C.tile
  ctx.fillRect(40, 238, 520, 302)
  ctx.fillStyle = C.dim
  ctx.font = `600 17px ${FONT}`
  ctx.fillText('PERFORMANCE', 60, 266)
  board.forEach((a, i) => {
    const y = 290 + i * 27
    ctx.fillStyle = a.color
    ctx.fillRect(60, y - 13, 6, 16)
    ctx.fillStyle = C.ink
    ctx.font = `400 18px ${FONT}`
    ctx.fillText(a.name, 76, y + 1)
    ctx.fillStyle = '#26323f'
    ctx.fillRect(160, y - 10, 330, 10)
    ctx.fillStyle = C.orange
    ctx.fillRect(160, y - 10, 3.3 * a.perf, 10)
    ctx.fillStyle = C.ink
    ctx.font = `600 18px ${FONT}`
    ctx.fillText(String(a.perf), 502, y + 1)
  })

  // Current project and the latest payouts.
  const px = 576
  const pw = W - 40 - px
  ctx.fillStyle = C.tile
  ctx.fillRect(px, 238, pw, 302)
  ctx.fillStyle = C.dim
  ctx.font = `600 17px ${FONT}`
  ctx.fillText(project?.completed ? 'LAST PROJECT' : 'PROJECT', px + 20, 266)
  if (project) {
    ctx.fillStyle = C.ink
    ctx.font = `600 22px ${FONT}`
    ctx.fillText(fit(ctx, project.title, pw - 40), px + 20, 298)
    ctx.fillStyle = '#26323f'
    ctx.fillRect(px + 20, 314, pw - 40, 14)
    ctx.fillStyle = project.completed ? C.blue : C.green
    ctx.fillRect(px + 20, 314, ((pw - 40) * project.done) / Math.max(1, project.tasks), 14)
    ctx.fillStyle = C.dim
    ctx.font = `400 18px ${FONT}`
    const meta = [`${project.done}/${project.tasks} tasks`, `${project.coinsPaid.toLocaleString()} coins paid`, project.averageScore && `avg ${project.averageScore}`]
    ctx.fillText(meta.filter(Boolean).join(' · '), px + 20, 354)
  } else {
    ctx.fillStyle = C.dim
    ctx.font = `400 20px ${FONT}`
    ctx.fillText('No projects yet', px + 20, 300)
  }
  ctx.fillStyle = C.dim
  ctx.font = `600 17px ${FONT}`
  ctx.fillText('LATEST', px + 20, 398)
  recent.forEach((r, i) => {
    const y = 432 + i * 34
    ctx.fillStyle = r.score >= 90 ? '#2f9e6e' : r.score >= 80 ? '#3b8fd0' : r.score >= 70 ? '#c99227' : '#d0574d'
    ctx.fillRect(px + 20, y - 21, 46, 28)
    ctx.fillStyle = '#fff'
    ctx.font = `700 18px ${FONT}`
    ctx.fillText(String(r.score), px + 43 - ctx.measureText(String(r.score)).width / 2, y)
    ctx.fillStyle = C.ink
    ctx.font = `400 19px ${FONT}`
    ctx.fillText(r.who, px + 80, y)
    if (r.paid) {
      const txt = `+${r.paid} coins`
      ctx.fillStyle = C.gold
      ctx.font = `600 18px ${FONT}`
      ctx.fillText(txt, px + pw - 20 - ctx.measureText(txt).width, y)
    }
  })
}

/** The meeting room's wall display: a live canvas, redrawn whenever its numbers change. */
export function CompanyBoardScreen(props: { scale: [number, number, number]; position: [number, number, number] }) {
  const agents = useOfficeStore((s) => s.agents)
  const tasks = useOfficeStore((s) => s.tasks)
  const projects = useOfficeStore((s) => s.projects)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
  }, [])
  const data = useMemo(() => boardData({ agents, tasks, projects, messages: [] }), [agents, tasks, projects])
  const key = JSON.stringify(data)

  useEffect(() => {
    draw((texture.image as HTMLCanvasElement).getContext('2d')!, JSON.parse(key) as Board)
    texture.needsUpdate = true
  }, [key, texture])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh geometry={GEO.plane} scale={props.scale} position={props.position}>
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
