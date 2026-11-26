// The only importer of maplibre-gl (owner: F0; MAP extends). PLAN-DAYLIGHT 3.6, 3.8.
// scripts/daylight/check-bundle.mjs fails the build if maplibre-gl reaches the main
// bundle or any route chunk, so keep every maplibre import behind loadMapLibre().
//
//   loadMapLibre() -> Promise<maplibregl>          library + worker URL + CSS, loaded once
//   preloadMapLibre()                              fetch the chunk on idle, never execute early
//   createMap(container, options, {tileTimeoutMs}) -> Promise<Map>
//        resolves when the style is in and the first tile has arrived; throws MapUnavailable
//        {reason: 'chunk'|'webgl2'|'init'|'style'|'tiles'}
//   currentLevel() -> 'full'|'lite'|'static'       the device level, lowered for the session
//   dropLevel(to)                                  remember a lower level for this session
//   watchFrames(map, onSlow)                       calls onSlow() when the first two seconds
//                                                  of frames average over 40ms (PLAN 3.6)
//
// The worker (maplibre-gl-worker.mjs) is self-contained ESM, so it is emitted as a plain
// asset with ?url and handed to setWorkerUrl: no Vite worker bundling is involved, and it
// works the same in `vite dev` and a production build.
import { mapLevel, saveData } from '../lib/capability.js'
import { COLOR } from '../styles/tokens.js'

let lib = null

export class MapUnavailable extends Error {
  constructor(reason, cause) {
    super(`Map unavailable: ${reason}`)
    this.name = 'MapUnavailable'
    this.reason = reason
    this.cause = cause
  }
}

export function loadMapLibre() {
  if (!lib) {
    lib = Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ]).then(([mod, worker]) => {
      const ml = mod.default && mod.default.Map ? mod.default : mod
      ml.setWorkerUrl(worker.default)
      return ml
    })
    lib.catch(() => {
      lib = null
    })
  }
  return lib
}

/** Warm the chunk when the browser is idle and the connection is not metered. */
export function preloadMapLibre() {
  if (lib || typeof window === 'undefined' || saveData() || mapLevel() === 'static') return
  const conn = navigator.connection
  if (conn && /(^|-)2g|3g/.test(conn.effectiveType || '')) return
  const go = () => loadMapLibre().catch(() => {})
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 4000 })
  else setTimeout(go, 1500)
}

// ---------------------------------------------------------------- device level
const LEVEL_KEY = 'ofs.maplevel'
const ORDER = ['static', 'lite', 'full']

/** The starting level for a map: the device's, lowered if a map already stepped down this session. */
export function currentLevel() {
  const base = mapLevel()
  if (typeof window === 'undefined') return base
  if (new URLSearchParams(window.location.search).has('maplevel')) return base
  try {
    const kept = sessionStorage.getItem(LEVEL_KEY)
    if (kept && ORDER.indexOf(kept) < ORDER.indexOf(base)) return kept
  } catch {
    /* private mode */
  }
  return base
}
export function dropLevel(to) {
  try {
    sessionStorage.setItem(LEVEL_KEY, to)
  } catch {
    /* private mode */
  }
}

/** Slow frames in the first two seconds step the map down to lite. */
export function watchFrames(map, onSlow, { ms = 2000, limit = 40 } = {}) {
  let frames = 0, t0 = 0, last = 0, sum = 0, done = false
  const onRender = () => {
    const now = performance.now()
    if (!t0) t0 = now
    // only frames drawn back to back count: an idle map draws nothing
    else if (now - last < 250) {
      sum += now - last
      frames++
    }
    last = now
    if (!done && now - t0 > ms) {
      done = true
      map.off('render', onRender)
      if (frames > 12 && sum / frames > limit) onSlow()
    }
  }
  map.on('render', onRender)
  return () => map.off('render', onRender)
}

// ---------------------------------------------------------------- icons (no sprite sheet)
function peakIcon() {
  const r = 2, w = 13 * r, h = 12 * r
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.beginPath()
  g.moveTo(w / 2, 1.5 * r)
  g.lineTo(w - 1.5 * r, h - 1.5 * r)
  g.lineTo(1.5 * r, h - 1.5 * r)
  g.closePath()
  g.lineJoin = 'round'
  g.lineWidth = 2.4 * r
  g.strokeStyle = '#fff'
  g.stroke()
  g.fillStyle = COLOR.ink
  g.fill()
  const d = g.getImageData(0, 0, w, h)
  return { image: { width: w, height: h, data: d.data }, options: { pixelRatio: r } }
}
const ICONS = { 'ofsa-peak': peakIcon }

/** Creates a map; resolves when the style is in and the first tile has arrived. */
export async function createMap(container, options = {}, { tileTimeoutMs = 5000 } = {}) {
  let ml
  try {
    ml = await loadMapLibre()
  } catch (e) {
    throw new MapUnavailable('chunk', e)
  }
  let map
  try {
    map = new ml.Map({ container, attributionControl: false, ...options })
  } catch (e) {
    throw new MapUnavailable(e?.name === 'GPUInitializationError' ? 'webgl2' : 'init', e)
  }
  // the style has no sprite sheet: its one icon is drawn here when the style asks for it
  const addIcon = (id) => {
    const make = ICONS[id]
    if (!make || map.hasImage(id)) return
    const { image, options: o } = make()
    map.addImage(id, image, o)
  }
  if (typeof map.setMissingStyleImageResolver === 'function') map.setMissingStyleImageResolver(addIcon)
  else map.on('styleimagemissing', (e) => addIcon(e.id))
  try {
    await new Promise((resolve, reject) => {
      // Ready means: the style is in and the first tile has arrived. Not MapLibre's own
      // 'load', which waits for every tile in view, so one slow tile would hold the whole
      // map (its pins, controls and route) back.
      // "No tiles arrive in 5s" (PLAN 3.6): the clock starts once the library is running.
      let styled = false, gotTile = false, settled = false
      const done = (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        map.off('data', onData)
        if (err) reject(err)
        else resolve()
      }
      const check = () => styled && gotTile && done()
      const timer = setTimeout(() => !gotTile && done(new MapUnavailable('tiles')), tileTimeoutMs)
      const onData = (ev) => {
        if (ev.dataType !== 'source' || !(ev.tile || ev.coord) || ev.source?.type === 'geojson') return
        gotTile = true
        check()
      }
      map.on('data', onData)
      map.once('style.load', () => {
        styled = true
        check()
      })
      map.once('load', () => {
        styled = gotTile = true
        check()
      })
      map.on('error', (ev) => !styled && done(new MapUnavailable('style', ev?.error)))
    })
  } catch (e) {
    try {
      map.remove()
    } catch {
      /* already gone */
    }
    throw e
  }
  return map
}
