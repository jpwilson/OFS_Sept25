// Journey map inside a story (stub by F0; MAP replaces the insides, keeps the props).
// <JourneyMap journey activeStopId onStopSelect mode="panel|sheet|strip" playing onPlayingChange />
// The stub draws the SVG route sketch with the day chips and a stops list (sheet mode),
// which is also the static fallback level.
import { RouteSketch, dayColor } from './RouteSketch.jsx'
import { timeLabel } from '../lib/format.js'
import s from './JourneyMap.module.css'

export default function JourneyMap({ journey, activeStopId, onStopSelect, mode = 'panel', playing = false, onPlayingChange }) {
  if (!journey) return null
  const tall = mode === 'panel' ? 560 : mode === 'sheet' ? 520 : 300
  return (
    <div className={`${s.jm} ${s[mode]}`} data-ui="journey-map" data-map-state="idle" data-mode={mode}>
      <ul className={s.days} aria-label="Days">
        {journey.days.map((d) => (
          <li key={d.index} className={s.day}>
            <span className={s.dot} style={{ background: dayColor(d.index) }} aria-hidden="true" />
            {d.label}
          </li>
        ))}
      </ul>
      <div className={s.frame}>
        <RouteSketch journey={journey} activeStopId={activeStopId} onStopSelect={onStopSelect} width={640} height={tall} labels={mode === 'strip' ? 'none' : 'named'} />
      </div>
      {mode !== 'strip' ? (
        <ol className={s.stops}>
          {journey.stops
            .filter((st) => st.kind === 'named')
            .map((st) => (
              <li key={st.id}>
                <button type="button" className={s.stop} aria-current={st.id === activeStopId || undefined} onClick={() => onStopSelect?.(st.id)}>
                  <span className={`${s.n} a-mono`}>{st.n}</span>
                  <span className={s.stopName}>{st.name || 'Unnamed stop'}</span>
                  {st.ts ? <span className="a-mono a-mute a-small">{timeLabel(st.ts)}</span> : null}
                </button>
              </li>
            ))}
        </ol>
      ) : null}
      {onPlayingChange ? (
        <p className="a-mute a-small">Playback arrives with the real map{playing ? ' (playing)' : ''}.</p>
      ) : null}
    </div>
  )
}
