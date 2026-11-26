// 4. Create (lp-create): AI Create and its three modes (fizz). Then "Or write it yourself".
// Round three: the first screen is the head, Maya talking and the ladder from "just photos"
// to "a few questions" in display type; the three real Quick Add screens follow as cropped,
// numbered tiles (the Quick Add window is dark in the app, so each is cropped to the part
// that proves the step and framed in white); modes and results sit below.
import { useEffect, useRef } from 'react'
import { CREATE as C } from '../content/explain.js'
import { Cutout, Head, Label, Reveal, Section, SHOT_CAPTION, Sticker, cx } from '../ui/index.js'
import { ArtImg } from '../ui/ArtImg.jsx'
import { ScrollFrame } from './ScrollFrame.jsx'
import { onceInView, two } from './shared.js'
import s from './Create.module.css'

const TILTS = [-4, 3, -2, 5, -3]
// Each Quick Add screen cropped to the part that proves its step: z = image width as a
// multiple of the tile width; fx, fy = the point of the image held at the tile's center.
const CROP = {
  'ui-quickadd-input': { z: 1.55, fx: 0.36, fy: 0.4 },
  'ui-quickadd-recording': { z: 1.6, fx: 0.5, fy: 0.56 },
  'ui-quickadd-review': { z: 2.2, fx: 0.75, fy: 0.37 },
}
const cropVars = (id) => (CROP[id] ? { '--z': CROP[id].z, '--fx': CROP[id].fx, '--fy': CROP[id].fy } : undefined)

export function Create() {
  const back = useRef(null)
  useEffect(() => onceInView(back.current, () => back.current && back.current.setAttribute('data-in', ''), 0.6), [])

  return (
    <Section id="lp-create" wash="fizz" className={s.band} aria-labelledby="lp-create-h">
      {/* ---------- first screen: the claim, Maya talking, the ladder ---------- */}
      <div className={s.poster}>
        <div className={s.copy}>
          <Label dot strong>
            {C.label}
          </Label>
          <Head id="lp-create-h" className={s.head} {...C.head} />
          <p className={s.lede}>{C.lede}</p>
        </div>
        <div className={s.stage}>
          <div className={s.ladderWrap}>
            <p className={s.ladderLabel}>{C.ladderLabel}</p>
            <ol className={s.ladder}>
              {C.ladder.map((l, i) => (
                <Reveal as="li" key={l.name} i={i} className={s.rung} style={{ '--k': i }}>
                  <span className={s.meter} aria-hidden="true">
                    {C.ladder.map((_, k) => (
                      <i key={k} data-on={k <= i ? '' : undefined} />
                    ))}
                  </span>
                  <b>{l.name}</b>
                  <span>{l.text}</span>
                </Reveal>
              ))}
            </ol>
          </div>
          <Cutout id="p-maya-talk" alt={C.mayaAlt} className={s.maya} shadow sizes="(max-width: 760px) 34vw, 260px" />
        </div>
      </div>

      {/* ---------- the three real screens ---------- */}
      <div className={s.screens}>
        <Label strong>{C.stepsLegend}</Label>
        <ol className={s.tiles}>
          {C.steps.map((t, i) => (
            <Reveal as="li" key={t.shot} i={i} className={s.tile}>
              <p className={s.tileName}>
                <span className={s.tileN} aria-hidden="true">
                  {i + 1}
                </span>
                {t.tab}
              </p>
              <span className={s.crop} style={cropVars(t.shot)}>
                <ArtImg id={t.shot} alt={t.alt} className={s.cropImg} sizes="(max-width: 760px) 140vw, 720px" />
              </span>
            </Reveal>
          ))}
        </ol>
        <p className={cx('l-mono', s.devCap)}>{SHOT_CAPTION}</p>
      </div>

      {/* ---------- the details: modes and what comes back ---------- */}
      <div className={s.details}>
        <div className={s.modes}>
          <Label strong className={s.subLabel}>
            {C.modesLabel}
          </Label>
          <ul className={s.modeList}>
            {C.modes.map((m, i) => (
              <Reveal as="li" key={m.name} i={i} className={s.mode}>
                <span className={s.modeN} aria-hidden="true">
                  {two(i + 1)}
                </span>
                <b>{m.name}</b>
                {m.tag ? <span className={s.tag}>{m.tag}</span> : null}
                <span className={s.modeText}>{m.text}</span>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className={s.back}>
          <Label strong className={s.subLabel}>
            {C.backLabel}
          </Label>
          <ul ref={back} className={s.backList}>
            {C.back.map((b, i) => (
              <li key={b} style={{ '--k': i }}>
                <Sticker tilt={TILTS[i % TILTS.length]} className={s.backSticker}>
                  {b}
                </Sticker>
              </li>
            ))}
          </ul>
        </div>
      </div>


      {/* ---------- or write it yourself ---------- */}
      <div id="lp-create-write" className={s.write}>
        <div className={s.writeCopy}>
          <Label dot strong>
            {C.write.label}
          </Label>
          <h3 className={s.writeHead}>{C.write.head}</h3>
          <ul className={s.writeList}>
            {C.write.list.map((t, i) => (
              <Reveal as="li" key={t} i={i}>
                {t}
              </Reveal>
            ))}
          </ul>
        </div>
        <figure className={s.editorFig}>
          <ScrollFrame id={C.write.shot} alt={C.write.shotAlt} label={`${C.write.shotAlt}. ${C.write.hint}.`} hint={C.write.hint} start={0.205} sizes="(max-width: 760px) 92vw, 760px" className={s.editor} />
          <figcaption className="l-mono">{SHOT_CAPTION}</figcaption>
        </figure>
      </div>
    </Section>
  )
}
