import { cx } from './cx.js'
import s from './Section.module.css'

/**
 * A page band. wash sets data-wash (so --l-wash / --l-wash-deep resolve inside).
 * tone: 'wash' (default with a wash) | 'paper' (default without) | 'white'.
 * pad: 'md' | 'sm' | 'none'.   inner: 'wrap' (gutters + max width, default) | 'none'.
 * floor: draw the stage floor (deep colour below the horizon at about 80% height).
 */
export function Section({ id, wash, tone, pad = 'md', inner = 'wrap', floor, as: Tag = 'section', className, innerClassName, style, children, sectionRef, ...rest }) {
  const t = tone || (wash ? 'wash' : 'paper')
  return (
    <Tag {...rest} ref={sectionRef} id={id} data-wash={wash} data-pad={pad} data-floor={floor || undefined} className={cx(s.section, s[t], className)} style={style}>
      {inner === 'none' ? children : <div className={cx('l-wrap', s.inner, innerClassName)}>{children}</div>}
    </Tag>
  )
}
