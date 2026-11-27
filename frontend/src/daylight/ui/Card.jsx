import { cx } from './cx.js'
import s from './Card.module.css'

/**
 * <Card as="article" interactive pad="md|sm|none" wash tone="white|paper|wash">
 * Keyline only at rest; an interactive card lifts with the hard shadow on hover and
 * keyboard focus inside it. Make the whole card a link by putting a link with
 * className={cardLink} on its title: its ::after covers the card.
 */
export function Card({ as: Tag = 'div', interactive, pad = 'md', wash, tone = 'white', className, children, ...rest }) {
  return (
    <Tag className={cx(s.card, s[`pad-${pad}`], s[tone], interactive && s.interactive, className)} data-wash={wash} data-ui="card" {...rest}>
      {children}
    </Tag>
  )
}
export const cardLink = s.link
