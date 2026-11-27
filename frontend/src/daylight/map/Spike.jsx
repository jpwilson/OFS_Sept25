// The MapLibre spike (owner: F0). ?only=spike. Proves a lazily loaded globe and 3D
// terrain with OpenFreeMap tiles and Mapterhorn terrain, in dev and in a production
// build, and reports timings. MAP builds the real views from engine.js, sources.js and
// style.js; this page is only evidence and an example.
import { useEffect, useRef, useState } from 'react'
import { createMap, loadMapLibre } from './engine.js'
import { buildStyle } from './style.js'
import { useFeed, imageSrc } from '../lib/data.js'
import { isLatLng } from '../lib/geo.js'
import { mapLevel } from '../lib/capability.js'
import { Label } from '../../landing/ui/Label.jsx'
import s from './Spike.module.css'

function useSpikeMap(ref, make) {
  const [state, setState] = useState({ phase: 'loading', t: {}, error: null })
  useEffect(() => {
    let map, dead = false
    const t0 = performance.now()
    const t = {}
    createMap(ref.current, make.options)
      .then((m) => {
        map = m
        t.styleMs = Math.round(performance.now() - t0)
        if (dead) return m.remove()
        make.after?.(m)
        m.once('idle', () => {
          t.idleMs = Math.round(performance.now() - t0)
          setState({ phase: 'idle', t: { ...t }, error: null })
        })
        setState({ phase: 'style', t: { ...t }, error: null })
      })
      .catch((e) => !dead && setState({ phase: 'failed', t, error: `${e.reason || e.name}: ${e.cause?.message || e.message}` }))
    return () => {
      dead = true
      map?.remove()
    }
  }, [])
  return state
}

function Panel({ title, note, make, onReady }) {
  const ref = useRef(null)
  const st = useSpikeMap(ref, make)
  useEffect(() => {
    if (st.phase === 'idle') onReady?.(st)
  }, [st.phase])
  return (
    <figure className={s.panel}>
      <div className={s.stage} data-stage={make.stage}>
        <div ref={ref} className={s.map} data-map-state={st.phase} />
      </div>
      <figcaption className={s.cap}>
        <strong>{title}</strong> <span className="a-mute">{note}</span>
        <span className={`${s.timing} a-mono`}>
          {st.phase === 'failed' ? `failed · ${st.error}` : `${st.phase}${st.t.styleMs ? ` · style ${st.t.styleMs}ms` : ''}${st.t.idleMs ? ` · idle ${st.t.idleMs}ms` : ''}`}
        </span>
      </figcaption>
    </figure>
  )
}

function addPins(map, ml, events) {
  for (const e of events.filter((x) => isLatLng(x.latitude, x.longitude))) {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = s.pin
    el.setAttribute('aria-label', `Story: ${e.title}`)
    if (e.cover_image_url) el.style.backgroundImage = `url("${imageSrc(e.cover_image_url, 'micro')}")`
    new ml.Marker({ element: el }).setLngLat([+e.longitude, +e.latitude]).addTo(map)
  }
}

export default function Spike() {
  const { events } = useFeed()
  const [libT] = useState(() => performance.now())
  const level = mapLevel()
  const eventsRef = useRef(events)
  eventsRef.current = events
  return (
    <div className="a-wrap" style={{ paddingBlock: 24 }}>
      <Label>Spike · maplibre-gl 6.19.0 · level {level}</Label>
      <h1 className="a-page-title" style={{ margin: '8px 0 16px' }}>Globe and terrain</h1>
      <div className={s.grid}>
        <Panel
          title="The family's world"
          note="globe, OpenFreeMap vector tiles, hillshade off"
          make={{
            stage: 'globe',
            options: { style: buildStyle({ globe: true, hillshade: false }), center: [-60, 35], zoom: 1.15, renderWorldCopies: false },
            after: async (m) => {
              const ml = await loadMapLibre()
              m.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right')
              m.addControl(new ml.NavigationControl({ showCompass: true }), 'top-right')
              addPins(m, ml, eventsRef.current)
            },
          }}
        />
        <Panel
          title="Jenny Lake and Cascade Canyon"
          note="3D terrain and hillshade, Mapterhorn"
          make={{
            stage: 'terrain',
            options: { style: buildStyle({ terrain: true, hillshade: true }), center: [-110.765, 43.757], zoom: 12.4, pitch: 62, bearing: -64, maxPitch: 75 },
            after: async (m) => {
              const ml = await loadMapLibre()
              m.addControl(new ml.AttributionControl({ compact: false }), 'bottom-right')
              m.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right')
            },
          }}
        />
      </div>
      <p className="a-mute a-small" style={{ marginTop: 12 }}>
        Opened {Math.round(libT)}ms after page start. The library, its worker and its CSS load only when a map mounts.
      </p>
    </div>
  )
}
