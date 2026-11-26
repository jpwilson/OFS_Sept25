// The story's contents (owner: STORY): chapters with the one being read marked, then the
// places a reader can jump to (all photos, the journey, comments) and classic's "hide the
// photos in the text" switch (EventNavigation.jsx). The desktop rail and the phone
// Chapters sheet show the same list.
import { dayColor } from '../map/RouteSketch.jsx'
import { Icon } from '../ui/Icon.jsx'
import { cx } from '../ui/cx.js'
import { splitChapter } from './words.js'
import s from './Contents.module.css'

export default function Contents({ chapters, activeId, onGo, dayOfChapter, extras = [], hideMedia, onHideMedia, progress, variant = 'sheet' }) {
  return (
    <nav className={cx(s.wrap, s[variant])} aria-label="Contents" data-ui="contents">
      {variant === 'rail' ? (
        <div className={s.railHead}>
          <span className={cx(s.label, 'a-mono')}>Contents</span>
          {progress != null ? (
            <span className={s.bar} aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, progress))})` }} />
            </span>
          ) : null}
        </div>
      ) : null}
      {chapters.length ? (
        <ol className={s.list}>
          {chapters.map((c, i) => {
            const { eyebrow, title } = splitChapter(c.title)
            const day = dayOfChapter?.get(c.id)
            const on = c.id === activeId
            return (
              <li key={c.id}>
                <button type="button" className={cx(s.ch, on && s.on)} aria-current={on ? 'location' : undefined} onClick={() => onGo(c.id)}>
                  <span className={cx(s.n, 'a-mono')} style={day != null ? { background: dayColor(day) } : undefined}>
                    {day != null ? day + 1 : i + 1}
                  </span>
                  <span className={s.chText}>
                    {eyebrow ? <span className={cx(s.eyebrow, 'a-mono')}>{eyebrow}</span> : null}
                    <span className={s.title}>{title}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className={s.none}>This story has no chapters.</p>
      )}
      {extras.length ? (
        <ul className={s.extras}>
          {extras.map((x) => (
            <li key={x.label}>
              <button type="button" className={s.extra} onClick={x.onClick}>
                <Icon name={x.icon} size={20} />
                <span className={s.extraText}>{x.label}</span>
                {x.count != null ? <span className={cx(s.count, 'a-mono')}>{x.count}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {onHideMedia ? (
        <button type="button" className={s.toggle} role="switch" aria-checked={!!hideMedia} onClick={() => onHideMedia(!hideMedia)}>
          <span className={s.switch} aria-hidden="true">
            <span />
          </span>
          Hide photos in the text
        </button>
      ) : null}
    </nav>
  )
}
