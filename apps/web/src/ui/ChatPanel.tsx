import { useEffect, useMemo, useRef, useState } from 'react'
import { DEPT_COLOR } from '../agents/status'
import { DIRECTOR, useOfficeStore } from '../store/officeStore'
import { ProjectCard } from './ProjectCard'
import { RichText } from './RichText'
import { StatusBadge } from './StatusBadge'

const DEMO_PROMPT = 'Analyze random write performance bottleneck and propose improvements.'
const SUGGESTIONS = [DEMO_PROMPT, "What's the status?"]

/**
 * The Owner's line into the company. Talking to the Director starts projects; other
 * agents (opened from their panel) answer questions about their own work.
 */
export function ChatPanel() {
  const open = useOfficeStore((s) => s.chatOpen)
  const thread = useOfficeStore((s) => s.chatThread)
  const allMessages = useOfficeStore((s) => s.messages)
  const agent = useOfficeStore((s) => s.agents.find((a) => a.id === s.chatThread))
  const awaiting = useOfficeStore((s) => !!s.awaiting[s.chatThread])
  const unread = useOfficeStore((s) => Object.values(s.unread).reduce((a, b) => a + b, 0))
  const online = useOfficeStore((s) => s.connection === 'online')
  const setChatOpen = useOfficeStore((s) => s.setChatOpen)
  const openChat = useOfficeStore((s) => s.openChat)
  const sendMessage = useOfficeStore((s) => s.sendMessage)
  const focusAgent = useOfficeStore((s) => s.focusAgent)

  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const messages = useMemo(() => allMessages.filter((m) => m.thread === thread), [allMessages, thread])
  const typing = awaiting || (thread === DIRECTOR && agent?.status === 'thinking')

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, typing, open, thread])

  if (!agent) return null
  const send = (text: string) => {
    const t = text.trim()
    if (!t || !online) return
    void sendMessage(agent.id, t)
    setDraft('')
  }

  return (
    <section className={`panel chat ${open ? 'is-open' : ''}`} style={{ '--dept': DEPT_COLOR[agent.department] } as React.CSSProperties}>
      <header className="chat__head">
        <button className="chat__who" onClick={() => setChatOpen(!open)} aria-expanded={open}>
          <span className="chat__avatar">{agent.name[0]}</span>
          <span className="chat__name">
            {agent.name}
            <small>{agent.role}</small>
          </span>
          <StatusBadge status={agent.status} />
          {!open && unread > 0 && <span className="chat__unread">{unread}</span>}
          <span className="chat__caret">{open ? '▾' : '▴'}</span>
        </button>
      </header>

      {open && (
        <>
          {thread !== DIRECTOR && (
            <div className="chat__thread-bar">
              <button className="link" onClick={() => openChat(DIRECTOR)}>
                ← Back to Director
              </button>
              <button className="link" onClick={() => focusAgent(agent.id)}>
                Show {agent.name}
              </button>
            </div>
          )}
          <div className="chat__list" ref={listRef}>
            {messages.length === 0 && (
              <div className="chat__empty">
                {thread === DIRECTOR
                  ? `Tell ${agent.name} what you need. She creates a project, splits the work across the managers and reports back.`
                  : `Ask ${agent.name} about their work. New work goes through the Director, or use Assign Task.`}
              </div>
            )}
            {messages.map((m) => {
              const mine = m.from === 'owner'
              return (
                <div key={m.id} className={`msg ${mine ? 'msg--mine' : ''}`}>
                  <div className="msg__bubble">
                    {mine ? m.text : <RichText text={m.text} />}
                  </div>
                  {!mine && m.projectId && /^Project created/.test(m.text) && <ProjectCard projectId={m.projectId} />}
                </div>
              )
            })}
            {typing && (
              <div className="msg">
                <div className="msg__bubble msg__typing" aria-label={`${agent.name} is thinking`}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {thread === DIRECTOR && messages.length === 0 && (
            <div className="chat__suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip-tag chip-tag--link" onClick={() => send(s)} disabled={!online}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat__form"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={online ? (thread === DIRECTOR ? 'Ask the Director…' : `Message ${agent.name}…`) : 'Server offline'}
              disabled={!online}
              maxLength={2000}
              aria-label="Message"
            />
            <button type="submit" disabled={!online || !draft.trim()} aria-label="Send">
              ↑
            </button>
          </form>
        </>
      )}
    </section>
  )
}
