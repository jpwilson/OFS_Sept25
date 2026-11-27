// The feed view: stories grouped by month (or by category) with a lead card per group
// (owner: FEED). PLAN-DAYLIGHT 2.2.
import { useDesktop } from '../lib/capability.js'
import { plural } from '../lib/format.js'
import { cx } from '../ui/cx.js'
import StoryCard from './StoryCard.jsx'
import { groupStories, rowsOf } from './query.js'
import s from './Stream.module.css'

function SectionHead({ section, onOnly }) {
  return (
    <div className={s.head} data-ui="section-head">
      <h2 className={s.label}>
        {section.wash !== undefined && section.key.startsWith('c:') ? <span className={s.dot} data-wash={section.wash || undefined} aria-hidden="true" /> : null}
        <span>{section.label}</span>
        <span className={s.count}>· {plural(section.items.length, 'story', 'stories')}</span>
      </h2>
      {onOnly ? (
        <button type="button" className={s.only} onClick={onOnly}>
          Only {section.label.toLowerCase()}
        </button>
      ) : null}
    </div>
  )
}

function variantFor(i, n, desktop, row) {
  if (!desktop) return i === 0 ? 'lead' : 'card'
  if (row === 'pair') return 'half'
  if (n === 1) return 'wide'
  if (i === 0) return 'lead'
  if (n >= 3 && i <= 2) return 'side'
  return 'card'
}

function Section({ section, row, desktop, faceFor, onOpen, firstOnPage, onOnly }) {
  const n = section.items.length
  return (
    <section className={cx(s.section, desktop && s[`n${Math.min(n, 3)}`], row === 'pair' && s.inPair)} aria-label={section.label} data-ui="stream-section">
      <SectionHead section={section} onOnly={onOnly} />
      <ul className={s.grid}>
        {section.items.map((e, i) => (
          <li key={e.id} className={s.item}>
            <StoryCard
              event={e}
              variant={variantFor(i, n, desktop, row)}
              face={faceFor(e.author_username, e.author_full_name)}
              onOpen={onOpen}
              eager={firstOnPage && i === 0}
              tags={e.__tags}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Stream({ items, q, faceFor, onOpen, onOnlyCategory }) {
  const desktop = useDesktop()
  const sections = groupStories(items, q)
  const rows = desktop ? rowsOf(sections) : sections.map((x) => ({ kind: 'full', sections: [x] }))
  const only = (sec) => (q.group === 'category' && onOnlyCategory && !q.cats.includes(sec.items[0].category) ? () => onOnlyCategory(sec.items[0].category) : null)
  return (
    <div className={s.stream} data-ui="stream">
      {rows.map((r, ri) => (
        <div key={r.sections[0].key} className={cx(s.row, r.kind === 'pair' && s.pair)}>
          {r.sections.map((sec) => (
            <Section key={sec.key} section={sec} row={r.kind} desktop={desktop} faceFor={faceFor} onOpen={onOpen} firstOnPage={ri === 0} onOnly={only(sec)} />
          ))}
        </div>
      ))}
    </div>
  )
}
