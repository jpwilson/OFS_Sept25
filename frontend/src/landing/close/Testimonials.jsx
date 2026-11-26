import { useEffect, useState } from 'react'
import { hasArt } from '../art/manifest.js'
import { TESTIMONIALS } from '../content/testimonials.js'
import { ArtImg, Reveal } from '../ui/index.js'
import s from './Testimonials.module.css'

/**
 * Real members' words (content/testimonials.js), under the Why head. Renders nothing while
 * the list is empty. Never invented.
 *
 * Dev only: ?testimonials=fixture loads close/dev/testimonials.fixture.js (obvious
 * placeholders) to prove the layout. import.meta.env.DEV is false in a build, so the
 * fixture never ships.
 */
export function Testimonials() {
  const [fixture, setFixture] = useState(null)
  useEffect(() => {
    if (import.meta.env.DEV && window.location.search.includes('testimonials=fixture')) {
      import('./dev/testimonials.fixture.js').then((m) => setFixture(m.FIXTURE))
    }
  }, [])
  const list = fixture || TESTIMONIALS
  if (!list.length) return null

  return (
    <ul className={s.list} aria-label="What members say">
      {list.map((t, i) => (
        <Reveal as="li" key={`${t.name}-${i}`} i={i % 3} className={s.item}>
          <figure className={s.card}>
            {t.photo && hasArt(t.photo) ? (
              <span className={s.photo}>
                <ArtImg id={t.photo} alt="" sizes="88px" />
              </span>
            ) : (
              <span className={s.photo} data-i={i % 3} aria-hidden="true">
                {t.name.slice(0, 1)}
              </span>
            )}
            <blockquote className={s.quote}>
              <p>{t.quote}</p>
            </blockquote>
            <figcaption className={s.who}>
              <span className={s.name}>{t.name}</span>
              <span className={s.role}>{t.role}</span>
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </ul>
  )
}
