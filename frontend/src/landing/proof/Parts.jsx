// The pieces of a story page, as shown by Anatomy (owner: proof).
import { Cutout, Print, Icon, ArtImg } from '../ui/index.js'
import { CropShot } from './CropShot.jsx'
import { SAMPLE_TAGS } from '../content/proof.sample.js'
import { cx } from '../ui/cx.js'
import s from './Parts.module.css'

/** The picture for one part: a real capture, two captures, a sample print, or the tag trio. */
export function PartMedia({ part, compact, className }) {
  if (part.tags) {
    return (
      <div className={cx(s.tags, compact && s.compact, className)}>
        {SAMPLE_TAGS.map((t, i) => (
          <div key={t.id} className={s.tag} style={{ '--i': i }}>
            <Cutout id={t.art} alt="" className={s.tagArt} sizes="120px" />
            <span className={s.chip}>
              <Icon name="people" size={14} />
              {t.name}
            </span>
            {compact ? null : <span className={s.tagNote}>{t.note}</span>}
          </div>
        ))}
      </div>
    )
  }
  if (part.print) {
    return (
      <div className={cx(s.printWrap, className)}>
        <Print id={part.print} alt={part.printCaption} caption={compact ? null : part.printCaption} tilt={-2} sizes="(max-width: 760px) 80vw, 420px" />
        <span className={s.play} aria-hidden="true">
          <Icon name="play" size={compact ? 18 : 26} />
        </span>
      </div>
    )
  }
  if (compact) {
    // Spread-out thumbnails: the first capture, filling its tile.
    return (
      <span className={cx(s.thumb, className)} data-thumb="">
        <ArtImg id={part.shot} alt="" sizes="260px" />
      </span>
    )
  }
  if (part.shot2) {
    return (
      <div className={cx(s.pair, className)}>
        <CropShot id={part.shot} alt="The audience selector with five options" caption={false} className={s.pairA} />
        <CropShot id={part.shot2} alt="The share-link window: link expiry from one to five days, and the Create Share Link button" caption={false} className={s.pairB} />
      </div>
    )
  }
  return <CropShot id={part.shot} alt={part.label} caption={false} className={cx(s.shot, className)} />
}

/** A part's numbers, each as one line with its noun at the same size. */
export function PartFacts({ part }) {
  if (!part.facts) return null
  return (
    <ul className={s.facts}>
      {part.facts.map((f) => (
        // "60 seconds for the longest clip"
        <li key={f.label} className={s.fact}>
          <span className={s.factLine}>
            <strong className={s.factValue}>
              {f.value}
              {f.unit ? ` ${f.unit}` : ''}
            </strong>{' '}
            {f.label}
          </span>
          {f.note ? <span className={s.factNote}>{f.note}</span> : null}
        </li>
      ))}
    </ul>
  )
}

/** The true lines and the facts for one part. hideTitle: the caller shows the name itself. */
export function PartText({ part, n, headingAs: H = 'h3', id, hideTitle }) {
  return (
    <div className={s.text}>
      <H className={hideTitle ? 'l-sr' : s.title} id={id}>
        <span className={s.num}>{n}</span>
        {part.label}
      </H>
      {part.lines.map((l) => (
        <p key={l} className={s.line}>
          {l}
        </p>
      ))}
      <PartFacts part={part} />
    </div>
  )
}
