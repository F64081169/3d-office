import { useOfficeStore } from '../store/officeStore'

export function Toasts() {
  const toasts = useOfficeStore((s) => s.toasts)
  const dismiss = useOfficeStore((s) => s.dismissToast)
  const openChat = useOfficeStore((s) => s.openChat)
  const connection = useOfficeStore((s) => s.connection)
  return (
    <div className="toasts" aria-live="polite">
      {connection === 'offline' && (
        <div className="toast toast--offline">
          <b>Server offline</b>
          <span>
            Showing the seed company. Start the API and web together with <code>npm run dev</code>.
          </span>
        </div>
      )}
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <b>{t.title}</b>
          {t.body && <span>{t.body}</span>}
          {t.projectId && (
            <button
              className="link"
              onClick={() => {
                openChat()
                dismiss(t.id)
              }}
            >
              Read the report
            </button>
          )}
          <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
