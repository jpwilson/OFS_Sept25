// Story look for the data-driven marketing pages (owner: pages; story variant only):
// /features, /alternatives and /compare/*. scripts/landing/story-pages.mjs swaps this in for
// src/components/MarketingPage.jsx. It renders the very same marketing.js blocks, in order
// and word for word, the way the landing would: a wash head with the headline in display
// type and the page's cut-out, then each h2 section as a keylined sheet.
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSeoHead } from '../../content/useSeoHead.js'
import { tokenizeInline } from '../../content/inline.js'
import { Button, Cutout, Head } from '../ui/index.js'
import { Frame } from './Frame.jsx'
import { LOOK, CARD_WASHES } from './look.js'
import s from './MarketingPage.module.css'

/** **bold** and [label](href), as in components/ContentBlocks.jsx. */
export function Inline({ text }) {
  return tokenizeInline(text).map((t, i) => {
    if (t.type === 'bold') return <strong key={i}>{t.value}</strong>
    if (t.type === 'link') {
      return /^https?:\/\//.test(t.href) ? (
        <a key={i} href={t.href} rel="noopener" target="_blank">
          {t.value}
        </a>
      ) : (
        <Link key={i} to={t.href}>
          {t.value}
        </Link>
      )
    }
    return <Fragment key={i}>{t.value}</Fragment>
  })
}

/** The last word of a headline goes on a sticker; trailing punctuation stays outside it. */
export function splitHead(text) {
  const m = String(text).match(/^(.*\s)?([^\s]+?)([.?!:]*)$/s)
  if (!m || !m[2]) return { before: text }
  return { before: (m[1] || '').trimEnd(), mark: m[2], after: m[3] || '' }
}

/** Blocks into sections: a new one at every h2 (blocks before the first h2 form their own). */
function sections(blocks) {
  const out = []
  for (const b of blocks) {
    if (b.h2 || !out.length) out.push({ h2: b.h2, blocks: [] })
    if (!b.h2) out[out.length - 1].blocks.push(b)
  }
  return out
}

/** Runs of h3 + its paragraphs or list become cards; everything else stays a block. */
function groups(blocks) {
  const out = []
  for (const b of blocks) {
    const last = out[out.length - 1]
    if (b.h3) {
      const card = { h3: b.h3, blocks: [] }
      if (last && last.cards) last.cards.push(card)
      else out.push({ cards: [card] })
    } else if (last && last.cards && !b.h2 && !b.cta && (b.p || b.ul || b.ol)) {
      last.cards[last.cards.length - 1].blocks.push(b)
    } else {
      out.push({ block: b })
    }
  }
  return out
}

function Ctas({ items, size }) {
  return (
    <div className={s.ctas}>
      {items.map((c) => (
        <Button key={c.href + c.text} href={c.href} variant={c.primary ? 'solid' : 'ghost'} size={size} arrow={c.primary}>
          {c.text}
        </Button>
      ))}
    </div>
  )
}

function Block({ block: b }) {
  if (b.p) return <p className={s.p}><Inline text={b.p} /></p>
  if (b.h3) return <h3 className={s.h3}><Inline text={b.h3} /></h3>
  if (b.ul)
    return (
      <ul className={s.ticks}>
        {b.ul.map((item, i) => <li key={i}><Inline text={item} /></li>)}
      </ul>
    )
  if (b.ol)
    return (
      <ol className={s.steps}>
        {b.ol.map((item, i) => <li key={i}><Inline text={item} /></li>)}
      </ol>
    )
  if (b.faq)
    return (
      <div className={s.cards}>
        {b.faq.filter(Boolean).map((f, i) => (
          <div key={i} className={s.qa}>
            <h3 className={s.h3}>{f.q}</h3>
            <p className={s.p}><Inline text={f.a} /></p>
          </div>
        ))}
      </div>
    )
  if (b.compare) {
    const { aLabel, bLabel, rows } = b.compare
    return (
      <div className={s.cards}>
        {rows.map((r, i) => (
          <div key={i} className={s.qa}>
            <h3 className={s.h3}><Inline text={r.h} /></h3>
            <p className={s.p}><strong>{aLabel}</strong> <Inline text={r.a} /></p>
            <p className={s.p}><strong>{bLabel}</strong> <Inline text={r.b} /></p>
          </div>
        ))}
      </div>
    )
  }
  if (b.cta) return <Ctas items={b.cta} />
  return null
}

function Cards({ cards, start }) {
  return (
    <div className={s.cards}>
      {cards.map((c, i) => (
        <article key={i} className={s.tile} data-wash={CARD_WASHES[(start + i) % CARD_WASHES.length]}>
          <h3 className={s.tileHead}><Inline text={c.h3} /></h3>
          <div className={s.tileBody}>
            {c.blocks.map((b, j) => <Block key={j} block={b} />)}
          </div>
        </article>
      ))}
    </div>
  )
}

export default function MarketingPage({ page }) {
  const { user } = useAuth()
  // Title, description, canonical, social tags and the single JSON-LD graph (unchanged).
  useSeoHead(page)

  const look = LOOK[page.path] || {}
  const headCta = page.blocks.find((b) => b.cta)
  let cardIndex = 0

  return (
    <Frame path={page.path}>
      <header className={s.head}>
        <div className={s.headInner}>
          <div className={s.words}>
            <Link to={user ? '/feed' : '/'} className={s.back}>
              ← Back
            </Link>
            <Head as="h1" size="none" {...splitHead(page.h1)} className={s.title} />
            <p className={s.lede}><Inline text={page.lede} /></p>
            {headCta ? <Ctas items={headCta.cta} size="lg" /> : null}
            {page.updated ? <p className={s.updated}>Last updated {page.updated}</p> : null}
          </div>
          {look.art ? (
            <div className={s.art} aria-hidden="true">
              <Cutout id={look.art} shadow priority className={s.cutout} sizes="(max-width: 640px) 50vw, 480px" />
            </div>
          ) : null}
        </div>
      </header>

      <div className={s.body}>
        {sections(page.blocks).map((sec, i) => (
          <section key={i} className={s.sheet}>
            {sec.h2 ? (
              <h2 className={s.h2}>
                <Inline text={sec.h2} />
              </h2>
            ) : null}
            <div className={s.flow}>
              {groups(sec.blocks).map((g, j) => {
                if (g.cards) {
                  const start = cardIndex
                  cardIndex += g.cards.length
                  return <Cards key={j} cards={g.cards} start={start} />
                }
                return <Block key={j} block={g.block} />
              })}
            </div>
          </section>
        ))}
      </div>
    </Frame>
  )
}
