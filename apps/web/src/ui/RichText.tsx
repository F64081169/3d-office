import { Fragment } from 'react'

/** Renders the light markdown agents write: **bold**, `code`, bullet/numbered lines, blank-line gaps. */
export function RichText({ text }: { text: string }) {
  return (
    <div className="rich">
      {text.split('\n').map((line, i) =>
        line.trim() === '' ? (
          <div key={i} className="rich__gap" />
        ) : (
          <p key={i} className={/^\s*(•|-|\d+\.)\s/.test(line) ? 'rich__li' : undefined}>
            {inline(line)}
          </p>
        ),
      )}
    </div>
  )
}

function inline(line: string) {
  return line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : part.startsWith('`') && part.endsWith('`') ? (
      <code key={i}>{part.slice(1, -1)}</code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}
