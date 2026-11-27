// The world view's map, without React (owner: MAP). PLAN-DAYLIGHT 2.6, 3.3.
//
//   createWorld(container, {events, level, projection, padding, reduced, phone, on}) -> Promise<world>
//   world.setEvents(events)            pins regroup; the camera stays
//   world.select(id, {fly})            ring on the pin (or its group), optional flight
//   world.hover(id)                    pulse the pin a list row points at
//   world.setProjection('globe'|'flat')
//   world.setPadding({top, bottom, left, right})   what the sheet or panel covers
//   world.fitAll({animate})  world.zoomBy(±1)  world.north()  world.destroy()
//   world.anchorEl                     a DOM node that rides on the selected pin (the desktop card hangs from it)
//   on: {select(id|null), hover(id|null), spot(ids, place), state('busy'|'idle'), view({zoom, bearing, globe})}
//
// The globe is a "sticker globe": the canvas is transparent outside the planet, so a
// keyline ring and a hard offset shadow are two DOM circles kept on the planet's
// silhouette on every frame (no glow, no dark space).
import { createMap, loadMapLibre } from './engine.js'
import { buildStyle } from './style.js'
import { clusterAt, expansionZoom, toPoints, zoomStep } from './cluster.js'
import { storyPin, clusterPin, setFlag, anchorClass, fanLeg } from './markers.js'
import { shortPlace } from '../lib/format.js'
import { COLOR, WASH } from '../styles/tokens.js'

const RAD = Math.PI / 180
const TILE = 512
const RADIUS_PX = 62 // a group's back covers reach 13px either side, so groups keep clear of each other
const SAME_SPOT_RAD = 0.06 / 6371 // stories within 60 m of each other share one spot (they open as a list)
const noop = () => {}

const angle = (a, b) => {
  const h = Math.sin(((b.lat - a.lat) * RAD) / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(((b.lng - a.lng) * RAD) / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The centre of a set of points on the sphere, and the widest angle from it. */
function sphereCentre(points) {
  let X = 0, Y = 0, Z = 0
  for (const p of points) {
    const c = Math.cos(p.lat * RAD)
    X += c * Math.cos(p.lng * RAD)
    Y += c * Math.sin(p.lng * RAD)
    Z += Math.sin(p.lat * RAD)
  }
  const n = Math.hypot(X, Y, Z)
  const centre = n < 1e-6 ? { lat: points[0].lat, lng: points[0].lng } : { lat: Math.asin(Z / n) / RAD, lng: Math.atan2(Y, X) / RAD }
  let widest = 0
  for (const p of points) widest = Math.max(widest, angle(centre, p))
  return { centre, widest }
}

export async function createWorld(container, { events = [], level = 'full', projection = 'globe', padding = {}, reduced = false, phone = () => false, camera = null, alive = () => true, on = {} } = {}) {
  const emit = { select: noop, hover: noop, spot: noop, state: noop, view: noop, ...on }
  const ml = await loadMapLibre()
  if (!alive()) return null // unmounted while the library loaded
  const lite = level === 'lite'
  let globe = projection === 'globe' && !lite
  const cap = lite ? 60 : 80
  let pad = { top: 0, bottom: 0, left: 0, right: 0, ...padding }
  let points = toPoints(events)

  const map = await createMap(container, {
    style: buildStyle({ globe, hillshade: false, lite }),
    center: camera?.center || [-40, 30],
    zoom: camera?.zoom ?? 1,
    bearing: camera?.bearing || 0,
    maxZoom: 16,
    maxPitch: 0,
    pitchWithRotate: false,
    touchPitch: false,
    fadeDuration: lite || reduced ? 0 : 250,
    renderWorldCopies: true,
    canvasContextAttributes: { antialias: !lite },
  })
  map.touchZoomRotate.enable()
  map.keyboard.enable()

  // ---------------------------------------------------------------- the sticker ring
  const canvas = map.getCanvas()
  const shadow = document.createElement('div')
  const ring = document.createElement('div')
  for (const d of [shadow, ring]) {
    d.setAttribute('aria-hidden', 'true')
    Object.assign(d.style, { position: 'absolute', left: '0', top: '0', borderRadius: '50%', pointerEvents: 'none', display: 'none', willChange: 'transform' })
  }
  shadow.style.background = COLOR.ink
  ring.style.boxShadow = `inset 0 0 0 2px ${COLOR.ink}`
  canvas.before(shadow)
  canvas.after(ring)

  const focal = () => (0.5 * canvas.clientHeight) / Math.tan((map.getVerticalFieldOfView() * RAD) / 2)
  function disc() {
    if (!globe) return null
    const c = map.getCenter()
    const f = focal()
    const R = (TILE * 2 ** map.getZoom()) / (2 * Math.PI) / Math.cos(c.lat * RAD)
    const r = (f * R) / Math.sqrt(f * f + 2 * f * R)
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!(r > 0) || r > Math.max(w, h) * 2.2) return null
    const p = map.getPadding()
    return { x: w / 2 + ((p.left || 0) - (p.right || 0)) / 2, y: h / 2 + ((p.top || 0) - (p.bottom || 0)) / 2, r }
  }
  function drawRing() {
    const d = disc()
    if (!d) {
      shadow.style.display = ring.style.display = 'none'
      return
    }
    const size = `${(d.r + 1) * 2}px`
    const off = Math.max(4, Math.min(9, d.r * 0.035))
    ring.style.display = shadow.style.display = 'block'
    ring.style.width = ring.style.height = shadow.style.width = shadow.style.height = size
    ring.style.transform = `translate(${d.x - d.r - 1}px, ${d.y - d.r - 1}px)`
    shadow.style.transform = `translate(${d.x - d.r - 1 + off}px, ${d.y - d.r - 1 + off * 1.25}px)`
  }
  /** The zoom at which the planet's silhouette has radius r pixels when centred at `lat`. */
  function zoomForRadius(r, lat) {
    const f = focal()
    const R = (r * r + r * Math.sqrt(r * r + f * f)) / f
    return Math.log2((2 * Math.PI * R * Math.cos(lat * RAD)) / TILE)
  }
  const visible = () => ({ w: Math.max(120, canvas.clientWidth - pad.left - pad.right), h: Math.max(120, canvas.clientHeight - pad.top - pad.bottom) })

  // ---------------------------------------------------------------- overflow dots (PLAN 3.3: at most 80 DOM markers)
  map.addSource('dots', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({ id: 'dots', type: 'circle', source: 'dots', paint: { 'circle-radius': ['case', ['>', ['get', 'n'], 1], 8, 6], 'circle-color': WASH.azure.base, 'circle-stroke-color': COLOR.ink, 'circle-stroke-width': 2 } })
  map.on('click', 'dots', (e) => {
    const f = e.features?.[0]
    if (!f) return
    const cl = clusters.find((c) => c.key === f.properties.key)
    if (cl) tapCluster(cl)
  })

  // ---------------------------------------------------------------- pins
  const markers = new Map() // key -> {marker, el, cluster}
  let clusters = []
  let cacheStep = null
  let selectedId = null
  let hoverId = null
  let destroyed = false
  let lastTouch = -1e9

  const anchorEl = document.createElement('div')
  anchorEl.className = anchorClass
  const anchor = new ml.Marker({ element: anchorEl, anchor: 'center', opacityWhenCovered: '0' })
  let anchorOn = false

  const clusterOf = (id) => clusters.find((c) => c.members.some((m) => m.id === id))
  const domKey = (cl) => (cl.members.length > 1 && selectedId != null && cl.members.some((m) => m.id === selectedId) ? `${cl.key}@${selectedId}` : cl.key)

  // ---------------------------------------------------------------- opening a group
  // One tap shows every story in a group apart. When they share one spot they open as a list
  // (emit.spot). Otherwise the camera goes in until the group fills the view; any stories still
  // too close to stand apart there (a town and the city next door, on a phone's globe) fan out
  // around their place on short leader lines, until the reader moves the map.
  let fan = null // {ids: Set, settled: boolean}
  /** The zoom at which every distinct place in the group has its own pin; null for one place. */
  function splitZoom(members) {
    const reps = []
    for (const m of members) if (!reps.some((r) => angle(r, m) < SAME_SPOT_RAD)) reps.push(m)
    if (reps.length < 2) return null
    for (let zz = zoomStep(map.getZoom()) + 0.5; zz <= 16; zz += 0.5) if (clusterAt(reps, zz, RADIUS_PX).length === reps.length) return zz
    return 16
  }
  function tapCluster(cl) {
    if (cl.members.length === 1) return emit.select(cl.members[0].id)
    const all = splitZoom(cl.members)
    if (all == null) {
      emit.spot(cl.members.map((m) => m.id), shortPlace(cl.members[0].event.location_name))
      return
    }
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
    for (const p of cl.members) {
      w = Math.min(w, p.lng); e = Math.max(e, p.lng); s = Math.min(s, p.lat); n = Math.max(n, p.lat)
    }
    // the margin inside what the pill and the sheet cover (`pad`): a pin is 48px across, so half
    // of that and a little more keeps the outer ones whole. cameraForBounds sizes the group to
    // the whole canvas unless told what `pad` covers, which left the outer pins under the
    // filter pill and the sheet, so both go in.
    const margin = phone() ? { top: 48, bottom: 40, left: 38, right: 38 } : { top: 90, bottom: 90, left: 70, right: 70 }
    const box = { top: pad.top + margin.top, bottom: pad.bottom + margin.bottom, left: pad.left + margin.left, right: pad.right + margin.right }
    const fit = map.cameraForBounds([[w, s], [e, n]], { padding: box, maxZoom: 11 })
    const zFit = Math.min(fit?.zoom ?? all, 11)
    fan = all > zFit ? { ids: new Set(cl.members.map((m) => m.id)), settled: false } : null
    // Never closer than the zoom that fits the whole group: every pin is apart from `all` on,
    // and going past zFit pushed the outer pins under the filter pill and the sheet.
    move({ center: [(w + e) / 2, (s + n) / 2], zoom: zFit })
    if (fan && (reduced || lite)) {
      fan.settled = true
      sync(true)
    }
  }
  /** Groups made only of the opened group's stories become single pins, nudged apart on screen. */
  function spread(list) {
    if (!fan?.settled) return list
    const out = []
    for (const cl of list) {
      if (cl.members.length < 2 || cl.members.length > 8 || !cl.members.every((m) => fan.ids.has(m.id))) {
        out.push(cl)
        continue
      }
      const at = cl.members.map((m) => map.project([m.lng, m.lat]))
      const pos = at.map((p, i) => ({ x: p.x + Math.cos((i * 2 * Math.PI) / cl.members.length - Math.PI / 2) * 6, y: p.y + Math.sin((i * 2 * Math.PI) / cl.members.length - Math.PI / 2) * 6 }))
      const min = (phone() ? 48 : 52) + 8
      for (let pass = 0; pass < 40; pass++) {
        let moved = false
        for (let i = 0; i < pos.length; i++) {
          for (let j = i + 1; j < pos.length; j++) {
            const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y
            const d = Math.hypot(dx, dy) || 0.01
            if (d >= min) continue
            const push = (min - d) / 2 + 0.5
            pos[i].x -= (dx / d) * push; pos[i].y -= (dy / d) * push
            pos[j].x += (dx / d) * push; pos[j].y += (dy / d) * push
            moved = true
          }
        }
        if (!moved) break
      }
      cl.members.forEach((m, i) => {
        const offset = [Math.round(pos[i].x - at[i].x), Math.round(pos[i].y - at[i].y)]
        out.push({ key: `f${m.id}:${offset.join(',')}`, lat: m.lat, lng: m.lng, members: [m], offset })
      })
    }
    return out
  }
  function closeFan() {
    if (!fan) return
    fan = null
    sync(true)
  }

  function addMarker(key, cl) {
    const one = cl.members.length === 1
    const lead = one ? null : cl.members.find((m) => m.id === selectedId)?.event
    const node = one ? storyPin(cl.members[0].event) : clusterPin(cl, lead)
    if (cl.offset) fanLeg(node, cl.offset)
    node.addEventListener('click', (e) => {
      e.stopPropagation()
      tapCluster(cl)
    })
    const ids = cl.members.map((m) => m.id)
    // mouse events, not pointer events: they arrive after the list row's own mouseleave, so
    // moving from a row to its pin does not clear the highlight just set. A tap also
    // fires mouseenter; ignore it right after a touch so nothing is left looking hovered.
    node.addEventListener('touchstart', () => (lastTouch = performance.now()), { passive: true })
    node.addEventListener('mouseenter', () => performance.now() - lastTouch > 800 && emit.hover(ids[0]))
    node.addEventListener('mouseleave', () => performance.now() - lastTouch > 800 && emit.hover(null))
    const marker = new ml.Marker({ element: node, anchor: 'center', opacityWhenCovered: '0', subpixelPositioning: true, offset: cl.offset || [0, 0] }).setLngLat([cl.lng, cl.lat]).addTo(map)
    markers.set(key, { marker, el: node, cluster: cl })
  }

  function paint() {
    for (const { el, cluster } of markers.values()) {
      setFlag(el, 'selected', selectedId != null && cluster.members.some((m) => m.id === selectedId))
      setFlag(el, 'hover', hoverId != null && cluster.members.some((m) => m.id === hoverId))
    }
    const cl = selectedId != null ? clusterOf(selectedId) : null
    if (cl) {
      anchor.setLngLat([cl.lng, cl.lat]).setOffset(cl.offset || [0, 0])
      if (!anchorOn) anchor.addTo(map)
      anchorOn = true
    } else if (anchorOn) {
      anchor.remove()
      anchorOn = false
    }
  }

  function sync(force) {
    if (destroyed) return
    const step = zoomStep(map.getZoom())
    if (force || step !== cacheStep) {
      clusters = spread(clusterAt(points, step, RADIUS_PX))
      cacheStep = step
    } else if (clusters.length <= cap && !force) {
      return paint()
    }
    let dom = clusters, rest = []
    if (clusters.length > cap) {
      const c = map.getCenter()
      const sorted = clusters.map((cl) => ({ cl, d: angle(c, cl) })).sort((a, b) => a.d - b.d)
      dom = sorted.slice(0, cap).map((x) => x.cl)
      rest = sorted.slice(cap).map((x) => x.cl)
    }
    const want = new Map(dom.map((cl) => [domKey(cl), cl]))
    for (const [k, m] of markers) {
      if (!want.has(k)) {
        m.marker.remove()
        markers.delete(k)
      }
    }
    for (const [k, cl] of want) if (!markers.has(k)) addMarker(k, cl)
    map.getSource('dots')?.setData({ type: 'FeatureCollection', features: rest.map((cl) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [cl.lng, cl.lat] }, properties: { key: cl.key, n: cl.members.length } })) })
    paint()
  }

  // ---------------------------------------------------------------- camera
  function move(opts, { animate = true } = {}) {
    const o = { padding: pad, ...opts }
    if (reduced || lite || !animate) map.jumpTo(o)
    else map.flyTo({ curve: 1.25, speed: 1.1, maxDuration: 2400, essential: true, ...o })
  }
  function home() {
    if (!points.length) return { center: [-40, 28], zoom: globe ? zoomForRadius(Math.min(visible().w, visible().h) * 0.44, 28) : 1.2 }
    if (globe) {
      const { centre, widest } = sphereCentre(points)
      const m = Math.min(visible().w, visible().h)
      // the whole planet in view...
      let zoom = zoomForRadius(m * (m < 520 ? 0.42 : 0.44), centre.lat)
      // ...or, when the family's places are close together, as near as keeps them all in:
      // a place at angle a from the centre sits about R sin(a) from it, R the planet's radius
      if (widest < 75 * RAD) {
        const R = (m * 0.36) / Math.sin(Math.max(widest, 3 * RAD))
        zoom = Math.max(zoom, Math.log2((2 * Math.PI * R * Math.cos(centre.lat * RAD)) / TILE))
      }
      return { center: [centre.lng, centre.lat], zoom: Math.min(zoom, 9) }
    }
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
    for (const p of points) {
      w = Math.min(w, p.lng); e = Math.max(e, p.lng); s = Math.min(s, p.lat); n = Math.max(n, p.lat)
    }
    const cam = map.cameraForBounds([[w, s], [e, n]], { padding: { top: 64, bottom: 64, left: 48, right: 48 }, maxZoom: 9 })
    return cam ? { center: cam.center, zoom: cam.zoom } : { center: [(w + e) / 2, (s + n) / 2], zoom: 2 }
  }
  let homeZoom = 1
  function fitAll({ animate = true } = {}) {
    const h = home()
    homeZoom = h.zoom
    move({ ...h, bearing: 0 }, { animate })
  }

  map.on('move', drawRing)
  map.on('resize', drawRing)
  map.on('zoom', () => zoomStep(map.getZoom()) !== cacheStep && sync())
  map.on('moveend', () => {
    if (fan) fan.settled = true
    sync(!!fan) // an opened group is laid out again where the camera has landed
    emit.view({ zoom: map.getZoom(), bearing: map.getBearing(), globe, center: map.getCenter().toArray() })
  })
  map.on('movestart', (e) => {
    emit.state('busy')
    // the reader taking the map (drag, pinch, wheel, keys) closes an opened group
    if (e.originalEvent) closeFan()
  })
  map.on('idle', () => emit.state('idle'))
  map.on('click', (e) => {
    if (e.defaultPrevented) return
    // a click inside the card that hangs from a pin bubbles up through the canvas container
    if (e.originalEvent?.target?.closest?.('[data-ui="story-peek"], [data-ui="map-pin"], [data-ui="map-cluster"]')) return
    if (map.queryRenderedFeatures(e.point, { layers: ['dots'] }).length) return
    closeFan()
    emit.select(null)
  })

  // ---------------------------------------------------------------- opening
  map.setPadding(pad)
  homeZoom = home().zoom
  if (!camera) {
    const h = home()
    if (globe && !reduced && !lite && points.length) {
      map.jumpTo({ center: [h.center[0] - 38, h.center[1]], zoom: h.zoom - 0.25, padding: pad })
      map.easeTo({ center: h.center, zoom: h.zoom, padding: pad, duration: 1500, easing: (t) => 1 - (1 - t) ** 3, essential: true })
    } else map.jumpTo({ ...h, padding: pad })
  } else map.jumpTo({ padding: pad })
  drawRing()
  sync(true)

  return {
    map,
    anchorEl,
    get globe() {
      return globe
    },
    setEvents(next) {
      const was = points.map((p) => p.id).join()
      points = toPoints(next)
      // an opened group stays open while the same stories come back (choosing one updates the URL)
      if (points.map((p) => p.id).join() !== was) fan = null
      if (selectedId != null && !points.some((p) => p.id === selectedId)) selectedId = null
      sync(true)
    },
    select(id, { fly = true } = {}) {
      const changed = id !== selectedId
      selectedId = id ?? null
      if (changed) sync(true)
      const p = points.find((x) => x.id === id)
      if (!p || !fly) return
      // A calm, even height: swiping the cards turns the world, it does not dive into a
      // city per swipe. A story inside a group shows as that group, with its cover in front.
      const floor = globe ? homeZoom + 0.6 : 4
      const zz = Math.min(Math.max(map.getZoom(), floor), 6.5)
      move({ center: [p.lng, p.lat], zoom: zz, offset: [0, phone() ? 0 : 96] })
    },
    hover(id) {
      hoverId = id ?? null
      paint()
    },
    setProjection(next) {
      const g = next === 'globe' && !lite
      if (g === globe) return
      globe = g
      map.setProjection({ type: g ? 'globe' : 'mercator' })
      drawRing()
      fitAll({ animate: false })
      drawRing()
    },
    setPadding(next, { animate = true } = {}) {
      const to = { top: 0, bottom: 0, left: 0, right: 0, ...next }
      if (to.top === pad.top && to.bottom === pad.bottom && to.left === pad.left && to.right === pad.right) return
      pad = to
      if (reduced || lite || !animate) map.jumpTo({ padding: pad })
      else map.easeTo({ padding: pad, duration: 320, essential: true })
      drawRing()
    },
    fitAll,
    zoomBy(d) {
      if (reduced) map.jumpTo({ zoom: map.getZoom() + d })
      else map.easeTo({ zoom: map.getZoom() + d, duration: 260, essential: true })
    },
    north() {
      if (reduced) map.jumpTo({ bearing: 0 })
      else map.easeTo({ bearing: 0, duration: 400, essential: true })
    },
    resize() {
      map.resize()
      drawRing()
    },
    destroy() {
      destroyed = true
      for (const m of markers.values()) m.marker.remove()
      markers.clear()
      try {
        map.remove()
      } catch {
        /* already gone */
      }
    },
  }
}
