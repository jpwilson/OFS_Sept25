import { useEffect, useState } from 'react'
import { hasArt } from '../art/manifest.js'
import { LOVE } from '../content/close.js'
import { TESTIMONIALS } from '../content/testimonials.js'
import { ArtImg, Cutout, Head, Label, Reveal, Section } from '../ui/index.js'
import s from './Love.module.css'

/** One real member's words (content/testimonials.js). Never invented. */
function Quote({ t, i }) {
  return (
    <Reveal as="li" i={i % 3} className={s.quote}>
      <figure className={s.quoteFig}>
        <blockquote className={s.quoteText}>
          <p>{t.quote}</p>
        </blockquote>
        <figcaption className={s.who}>
          {t.photo && hasArt(t.photo) ? (
            <span className={s.avatar}>
              <ArtImg id={t.photo} alt="" sizes="64px" />
            </span>
          ) : (
            <span className={s.avatar} aria-hidden="true">
              {t.name.slice(0, 1)}
            </span>
          )}
          <span>
            <span className={s.name}>{t.name}</span>
            <span className={s.role}>{t.role}</span>
          </span>
        </figcaption>
      </figure>
    </Reveal>
  )
}

/**
 * 11 · Why families love it. Quote cards from real members lead when testimonials.js has
 * any; the six reasons always follow, in the company's own voice.
 */
export function Love() {
  // Dev only: ?testimonials=fixture loads two placeholder quotes to prove the layout.
  // import.meta.env.DEV is false in a build, so the fixture never ships.
  const [fixture, setFixture] = useState(null)
  useEffect(() => {
    if (import.meta.env.DEV && window.location.search.includes('testimonials=fixture')) {
      import('./dev/testimonials.fixture.js').then((m) => setFixture(m.FIXTURE))
    }
  }, [])
  const quotes = fixture || TESTIMONIALS

  return (
    <Section id="lp-love" tone="white" className={s.band}>
      <div className={s.poster}>
        <div className={s.copy}>
          <Label strong dot className={s.eyebrow}>
            {LOVE.label}
          </Label>
          <Head {...LOVE.head} className={s.head} />
        </div>
        <div className={s.people} role="img" aria-label={LOVE.peopleAlt}>
          {LOVE.people.map((id) => (
            <Cutout key={id} id={id} shadow className={s.person} sizes="(max-width: 640px) 30vw, 180px" />
          ))}
        </div>
      </div>

      {quotes.length ? (
        <ul className={s.quotes} aria-label={LOVE.quoteLabel}>
          {quotes.map((t, i) => (
            <Quote key={`${t.name}-${i}`} t={t} i={i} />
          ))}
        </ul>
      ) : null}

      <ul className={s.cards}>
        {LOVE.cards.map((c, i) => (
          <Reveal as="li" key={c.line} i={i % 3} className={s.card}>
            <div className={s.photo}>
              <ArtImg id={hasArt(c.photo) ? c.photo : c.stand} alt="" className={s.img} sizes="(max-width: 640px) 90vw, (max-width: 1199px) 45vw, 400px" />
            </div>
            <h3 className={s.line}>{c.line}</h3>
            <p className={s.text}>{c.text}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}
