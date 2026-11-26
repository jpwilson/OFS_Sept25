// Dev gallery of the shared primitives (owner: F0): every primitive on every wash.
import { useRef } from 'react'
import { win } from '../lib/math.js'
import { fact, PRICES } from '../content/facts.js'
import { SMALL_PRINT } from '../content/common.js'
import { AudienceSwitch, Button, Cutout, Device, GhostWord, Head, Icon, ICON_NAMES, Label, Print, Readout, Reveal, Section, Shot, Stage, Sticker, WASHES } from '../ui/index.js'

const DEMO = ['p-maya-talk', 'missing-person']

export function Kitchen() {
  const bar = useRef(null)
  const num = useRef(null)
  return (
    <>
      {WASHES.map((w, i) => (
        <Section key={w} id={`ui-${w}`} wash={w} pad="sm" floor>
          <div style={{ position: 'relative', display: 'grid', gap: 22 }}>
            <GhostWord center>{w}</GhostWord>
            <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
              <Label dot>Wash {w} · primitive gallery</Label>
              <Head as="h2" before="Add the photos. Then just" mark="talk" after="." />
              <Head as="h3" size="sm" before="Small head, with a" mark="sticker" after=". Then more words." />
              <Label>
                Nav-size <Sticker size="sm">sticker</Sticker>
              </Label>
              <p className="l-lede">
                Body copy on {w}: plain, warm, specific. A <a href="#ui-tide">link in text</a> and a <Sticker>sticker</Sticker> inline.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                <Button size="lg" href="/login?signup=true">Start free</Button>
                <Button size="lg" variant="ghost" arrow>See how it works</Button>
                <Button variant="ghost" icon="play">Play</Button>
                <Button>Solid md</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
                <Readout label="Photos per story" value={fact('photosPro')} note="On Pro" />
                <Readout label="Trial" value={fact('trialDays')} unit="days" size="sm" />
                <Readout label="Pro" value={PRICES.pro.perMonthBilledYearly} unit="/ month" note="Billed yearly" />
              </div>
              <AudienceSwitch name={`aud-${w}`} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                {ICON_NAMES.map((n) => (
                  <span key={n} title={n} style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, background: '#fff', border: '2px solid #101B3B', borderRadius: 10 }}>
                    <Icon name={n} />
                  </span>
                ))}
              </div>
              {i === 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-end' }}>
                  {DEMO.map((id) => (
                    <Cutout key={id} id={id} shadow style={{ width: 150 }} />
                  ))}
                  <Print id="photo-coast-beach" caption="August · the coast path" tilt={-3} style={{ width: 240 }} />
                  <Print id="missing-photo" caption="Missing id" tilt={2} style={{ width: 200 }} />
                  <Shot id="ui-feed-missing" style={{ width: 280 }} />
                  <Device id="ui-story-missing" width={200} />
                </div>
              ) : null}
              <p className="l-small" style={{ maxWidth: '70ch' }}>{SMALL_PRINT}</p>
            </div>
          </div>
        </Section>
      ))}
      <Section tone="white" pad="sm">
        <div style={{ display: 'grid', gap: 12 }}>
          <Label>Type check: wdth 100 / 86 / 75 (the same word, weight 800)</Label>
          {[100, 86, 75].map((wd) => (
            <p key={wd} style={{ fontWeight: 800, fontSize: 72, lineHeight: 1, fontVariationSettings: `'wdth' ${wd}`, letterSpacing: '-0.03em' }}>
              whole story {wd}
            </p>
          ))}
          <p className="l-story" style={{ maxWidth: '60ch' }}>
            Literata, the story voice: we cooked on a camping stove in the garage for six weeks, and Leo decided it was the best thing that had ever happened.
          </p>
          <p className="l-mono">DM Mono · 0123456789 · tabular</p>
        </div>
      </Section>
      <Stage
        id="ui-stage"
        svh={260}
        wash="azure"
        floor
        onProgress={(p) => {
          if (bar.current) bar.current.style.transform = `scaleX(${win(p, 0.1, 0.9)})`
          if (num.current) num.current.textContent = (p * 100).toFixed(1)
        }}
      >
        <div className="l-wrap" style={{ position: 'relative', zIndex: 1, height: '100%', display: 'grid', alignContent: 'center', gap: 16 }}>
          <Label>Stage · 260svh</Label>
          <Readout label="Progress" value="0.0" unit="%" valueRef={num} />
          <div ref={bar} style={{ height: 8, background: 'var(--l-ink)', transformOrigin: 'left', transform: 'scaleX(0)', borderRadius: 999 }} />
        </div>
      </Stage>
      <Section tone="paper">
        {[0, 1, 2].map((i) => (
          <Reveal key={i} i={i} as="p" className="l-lede">
            Reveal {i}: a quiet entrance the first time it is seen.
          </Reveal>
        ))}
      </Section>
    </>
  )
}
