// DOM marker elements for both maps (owner: MAP). PLAN-DAYLIGHT 3.3 and 2.7. No maplibre here.
//   storyPin(event)            a round cover thumbnail: 3px white ring, 2px ink keyline, hard shadow
//   clusterPin(cluster, lead)  up to three covers stacked, with a DM Mono count
//   stopDisc(stop, opts)       a numbered disc with upright numerals, its name tag and photo prints
//   setFlag(el, name, on)      data-<name> attributes drive every state in pins.module.css
// Markers are real buttons with an accessible name. They are not tab stops (tabindex -1):
// the list beside the map is the keyboard and screen-reader path, so a keyboard user does
// not have to step through every pin to cross the page.
import { imageSrc } from '../lib/data.js'
import { dateRange, shortPlace } from '../lib/format.js'
import { initialsOf } from '../ui/Avatar.jsx'
import { washFor } from '../styles/tokens.js'
import s from './pins.module.css'

const el = (tag, cls, attrs) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v)
  return n
}

export function setFlag(node, name, on) {
  if (on) node.setAttribute(`data-${name}`, on === true ? '' : on)
  else node.removeAttribute(`data-${name}`)
}

function print(event, back) {
  const p = el('span', back ? `${s.print} ${s.back}` : s.print)
  if (event.cover_image_url) p.style.backgroundImage = `url("${imageSrc(event.cover_image_url, 'micro')}")`
  else {
    p.setAttribute('data-empty', '')
    p.setAttribute('data-wash', washFor(event.title))
    p.textContent = initialsOf(event.title)
  }
  return p
}

export const storyLabel = (e) => ['Story: ' + (e.title || 'Untitled'), shortPlace(e.location_name), dateRange(e.start_date, e.end_date)].filter(Boolean).join(', ')

export function storyPin(event) {
  const b = el('button', s.pin, { type: 'button', tabindex: '-1', 'data-ui': 'map-pin', 'data-story': event.id, 'aria-label': storyLabel(event) })
  const body = el('span', s.body)
  body.appendChild(print(event))
  b.appendChild(body)
  return b
}

/** `lead` is the story drawn in front (the selected one when it is in this group). */
export function clusterPin(cluster, lead) {
  const events = cluster.members.map((m) => m.event)
  const front = lead || events[0]
  const behind = events.filter((e) => e !== front).slice(0, 2)
  const place = shortPlace(front.location_name)
  const b = el('button', s.pin, { type: 'button', tabindex: '-1', 'data-ui': 'map-cluster', 'data-count': events.length, 'aria-label': `${events.length} stories${place ? ` near ${place}` : ''}` })
  const body = el('span', s.body)
  for (const e of behind.reverse()) body.appendChild(print(e, true))
  body.appendChild(print(front))
  const c = el('span', s.count, { 'aria-hidden': 'true' })
  c.textContent = String(events.length)
  body.appendChild(c)
  b.appendChild(body)
  return b
}

/**
 * A journey stop. named: a numbered disc; photo: a small dot in the day's colour.
 * opts: {color, label, photos: [src...]}
 */
export function stopDisc(stop, { color, label, photos = [] } = {}) {
  const named = stop.kind === 'named'
  const b = el('button', named ? s.stop : `${s.stop} ${s.dot}`, {
    type: 'button',
    tabindex: '-1',
    'data-ui': 'map-stop',
    'data-stop': stop.id,
    'aria-label': named ? `Stop ${stop.n}: ${label || 'unnamed'}` : 'A photo on the route',
  })
  b.style.setProperty('--day', color)
  if (photos.length) {
    const wrap = el('span', s.prints, { 'aria-hidden': 'true' })
    for (const src of photos.slice(0, 3)) {
      const p = el('span', s.stopPrint)
      p.style.backgroundImage = `url("${imageSrc(src, 'small')}")`
      wrap.appendChild(p)
    }
    b.appendChild(wrap)
  }
  const d = el('span', s.disc)
  d.textContent = named ? String(stop.n) : ''
  b.appendChild(d)
  if (label) {
    const t = el('span', s.tag, { 'aria-hidden': 'true' })
    t.textContent = label
    b.appendChild(t)
  }
  return b
}

export const anchorClass = s.anchor
