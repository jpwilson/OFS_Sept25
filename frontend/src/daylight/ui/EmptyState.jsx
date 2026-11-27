import { cx } from './cx.js'
import { Head } from './Head.jsx'
import { Icon } from './Icon.jsx'
import s from './EmptyState.module.css'

/**
 * <EmptyState wash="tide" icon="stories" before="No stories" mark="yet" after="." body action />
 * Also the honest error state: pass tone="error" and an action that retries.
 */
export function EmptyState({ wash = 'paper', icon, before, mark, after, title, body, action, tone, className, as = 'h2' }) {
  return (
    <section className={cx(s.empty, tone === 'error' && s.error, className)} data-wash={wash} data-ui="empty-state" role={tone === 'error' ? 'alert' : undefined}>
      {icon ? (
        <span className={s.icon}>
          <Icon name={icon} size={28} />
        </span>
      ) : null}
      <Head as={as} size="section" before={before ?? title} mark={mark} after={after} className={s.title} />
      {body ? <p className={s.body}>{body}</p> : null}
      {action ? <div className={s.action}>{action}</div> : null}
    </section>
  )
}
