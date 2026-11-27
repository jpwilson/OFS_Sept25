// The door (owner: AUTH). AUTH.md decision 11: every auth screen is a small stage from the
// landing page: a flat wash wall, a deeper floor, one sticker word in the headline, a ghost
// word behind, the family standing on the same floor as the white keylined card.
// The form paints first; the art is decorative and arrives with a pop (instant with reduced
// motion). Four layouts, all CSS: phone (the card under the scene), iPad portrait (the card
// centred, people either side), iPad landscape and desktop (a poster: words and people on the
// left, the card standing on the floor on the right).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sticker } from '../../../landing/ui/Sticker.jsx'
import { maybeArt } from '../../../landing/art/manifest.js'
import { Wordmark } from '../../../landing/close/Wordmark.jsx'
import { useMedia } from '../../lib/capability.js'
import { Figure } from './Figure.jsx'
import s from './AuthStage.module.css'

/** Visual viewport shorter than this on a phone: the keyboard is open, fold the scene. */
const KEYBOARD_FOLD = 560

function useKeyboardFold() {
  const [kb, setKb] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const check = () => setKb(window.innerWidth < 700 && vv.height < KEYBOARD_FOLD)
    check()
    vv.addEventListener('resize', check)
    return () => vv.removeEventListener('resize', check)
  }, [])
  return kb
}

/** html.ofsa-auth (hides the install banner, paints the overscroll in the floor colour), a
 * noindex robots tag and the tab title, while an auth screen is mounted. */
function usePageChrome(title, wash) {
  useEffect(() => {
    const html = document.documentElement
    html.classList.add('ofsa-auth')
    let meta = document.querySelector('meta[name="robots"][data-auth]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      meta.content = 'noindex'
      meta.dataset.auth = ''
      document.head.appendChild(meta)
    }
    return () => {
      html.classList.remove('ofsa-auth')
      html.removeAttribute('data-auth-wash')
      meta.remove()
    }
  }, [])
  useEffect(() => {
    document.documentElement.setAttribute('data-auth-wash', wash)
  }, [wash])
  useEffect(() => {
    if (title) document.title = `${title} · Our Family Socials`
  }, [title])
}

export function AuthHead({ before, mark, after = '', id }) {
  const glue = after.match(/^[.,:;!?]+/)?.[0] || ''
  const tail = after.slice(glue.length)
  // Words after the sticker need a space ("a way in."); glued punctuation does not.
  const rest = tail && !/^\s/.test(tail) ? ` ${tail}` : tail
  return (
    <h1 className={s.head} id={id} data-ui="auth-head">
      {before ? `${before} ` : null}
      {mark ? (
        <span className="a-nowrap">
          <Sticker>{mark}</Sticker>
          {glue}
        </span>
      ) : null}
      {rest}
    </h1>
  )
}

/**
 * <AuthStage scene={SCENES.login} sceneKey="login" title="Log in" head={{before, mark, after}}
 *            sub="…" kicker={<…/>} barEnd={<Button/>} decor={<…/>} below={<…/>}>card contents</AuthStage>
 * decor: extra pieces on the wall (the invitation's story covers); hidden on phones.
 * sceneKey re-mounts the cast and ghost word, so a change of screen plays the swap.
 */
/** How wide a cast stands, in cast heights (figures overlap a little). The phone words leave
 * room for the phone cast; on larger screens the cast shrinks to fit its area. */
function castWidth(cast, phoneOnly) {
  return cast
    .filter((f) => !phoneOnly || f.phone)
    .reduce((w, f) => {
      const a = maybeArt(f.id)
      return a ? w + (a.w / a.h) * f.h * 0.96 : w
    }, 0)
}

export function AuthStage({ scene, sceneKey, title, head, sub, kicker, barEnd, decor, below, children, cardLabel, wide }) {
  const kb = useKeyboardFold()
  const narrow = useMedia('(max-width: 359px)')
  usePageChrome(title || head?.mark, scene.wash)
  return (
    <div
      className={s.stage}
      data-wash={scene.wash}
      data-kb={kb ? '' : undefined}
      data-scene={sceneKey}
      data-ui="auth-stage"
      style={{ '--phone-w': Math.max(0.45, castWidth(scene.cast, true)).toFixed(3), '--all-w': Math.max(0.45, castWidth(scene.cast, false)).toFixed(3) }}
    >
      <div className={s.floor} aria-hidden="true" />
      <span key={`g-${sceneKey}`} className={s.ghost} aria-hidden="true">
        {scene.ghost}
      </span>

      <header className={s.bar}>
        <Link to="/" className={s.wordmark} aria-label="Our Family Socials, home">
          {/* the landing's lockup, reused so the two cannot drift when the logo changes */}
          <Wordmark short={narrow} className={s.lockup} />
        </Link>
        {barEnd ? <div className={s.barEnd}>{barEnd}</div> : null}
      </header>

      <div className={s.words}>
        {kicker}
        {head ? <AuthHead {...head} /> : null}
        {sub ? <p className={s.sub}>{sub}</p> : null}
      </div>

      <div key={`c-${sceneKey}`} className={s.cast} aria-hidden="true">
        {decor}
        {scene.cast.map((f, i) => (
          <Figure key={f.id} f={f} i={i} priority={f.phone} />
        ))}
      </div>

      <main className={s.door} id="ofsa-main">
        <section className={s.card} data-wide={wide ? '' : undefined} aria-label={cardLabel} data-ui="auth-card">
          {children}
        </section>
        {below ? <div className={s.below}>{below}</div> : null}
        <p className={s.small}>Photos on this page are illustrative.</p>
      </main>
    </div>
  )
}
