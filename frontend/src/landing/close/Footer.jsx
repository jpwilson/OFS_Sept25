import { useEffect, useRef } from 'react'
import { FOOTER } from '../content/close.js'
import { biz } from '../content/business.js'
import { Label, Sticker } from '../ui/index.js'
import { Pin } from './Wordmark.jsx'
import s from './Footer.module.css'

/**
 * Fit the wordmark to its container's inner width by measuring at a probe size. On phones
 * the words stack, and the widest line sets one size for all three. CSS gives a close
 * vw-based size first, so the static page never overflows before this runs.
 */
function useFit(ref) {
  useEffect(() => {
    const el = ref.current
    const box = el && el.parentElement
    if (!el || !box) return
    const PROBE = 100
    const fit = () => {
      el.style.fontSize = `${PROBE}px`
      const cs = getComputedStyle(box)
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const natural = el.offsetWidth
      if (natural > 0) el.style.fontSize = `${Math.floor(((PROBE * avail) / natural) * 100) / 100}px`
    }
    fit()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit)
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [ref])
}

/** 16 · Footer: links to the pages that exist, the one line of small print, the copyright, the fitted wordmark. */
export function Footer() {
  const word = useRef(null)
  useFit(word)
  return (
    <footer className={s.footer}>
      <div className={`l-wrap ${s.top}`}>
        <div className={s.lead}>
          <Pin className={s.pin} />
          <p className={s.small}>{FOOTER.small}</p>
          <p className={s.name}>{biz('copyright')}</p>
        </div>
        <nav className={s.nav} aria-label="Footer">
          {FOOTER.groups.map((g) => (
            <div key={g.title} className={s.group}>
              <Label as="p" className={s.title}>
                {g.title}
              </Label>
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className={`l-wrap ${s.markBox}`} aria-hidden="true">
        <p ref={word} className={s.word}>
          {FOOTER.words.map((w) => (
            <span key={w} className={s.wordLine}>
              {w === FOOTER.mark ? <Sticker className={s.sticker}>{w}</Sticker> : w}
            </span>
          ))}
        </p>
      </div>
    </footer>
  )
}
