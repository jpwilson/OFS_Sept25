// The person's choices, as constraints on the layout (owner: book ENGINE).
//
// Edits are keyed by photo and section ids, never by page numbers, so after any reflow
// (a new size, a photo removed, a section left out) the same edits give the same book.
// applyEdits is pure and deterministic; the layout reads only its result.
//
//   Edits (every field optional):
//   {
//     size: 'hc-8x8' | 'hc-10x8' | ...          the product
//     title: string, subtitle: string           shown on the cover and the title page
//     dedication: string                        a page of its own after the title page; '' for none
//     cover: {photoId, style: 'photo'|'framed'|'type'}
//     photos: {[photoId]: 'bigger' | 'smaller' | 'removed'}
//     swaps: [[photoIdA, photoIdB], ...]        exchange two photos' places (captions travel with them)
//     sections: {[sectionId]: false}            leave a section out
//     map: boolean                              the map page on (default when there is a route) or off
//   }
//   applyEdits(source, edits) -> {source, directives, applied, ignored}
//     directives: {size, title, subtitle, dedication, coverPhoto, coverStyle, map,
//                  big: Set<photoId>, small: Set<photoId>}
//     applied / ignored: human-readable lists (an edit naming a photo that no longer exists is ignored)
export const COVER_STYLES = ['photo', 'framed', 'type']

export function normaliseEdits(e = {}) {
  const out = {}
  if (e.size) out.size = String(e.size)
  if (typeof e.title === 'string' && e.title.trim()) out.title = e.title.trim()
  if (typeof e.subtitle === 'string') out.subtitle = e.subtitle.trim()
  if (typeof e.dedication === 'string') out.dedication = e.dedication.trim()
  if (e.cover && (e.cover.photoId || e.cover.style)) {
    out.cover = {}
    if (e.cover.photoId) out.cover.photoId = String(e.cover.photoId)
    if (COVER_STYLES.includes(e.cover.style)) out.cover.style = e.cover.style
  }
  if (e.photos) {
    const ids = Object.keys(e.photos).sort()
    const p = {}
    for (const id of ids) if (['bigger', 'smaller', 'removed'].includes(e.photos[id])) p[id] = e.photos[id]
    if (ids.length) out.photos = p
  }
  if (Array.isArray(e.swaps) && e.swaps.length) out.swaps = e.swaps.filter((x) => Array.isArray(x) && x.length === 2).map(([a, b]) => [String(a), String(b)])
  if (e.sections) {
    const s = {}
    for (const id of Object.keys(e.sections).sort()) if (e.sections[id] === false) s[id] = false
    out.sections = s
  }
  if (typeof e.map === 'boolean') out.map = e.map
  return out
}

export function applyEdits(source, edits = {}) {
  const e = normaliseEdits(edits)
  const applied = [], ignored = []
  // a deep copy of what we change: sections (with units) and photos
  const photos = Object.fromEntries(Object.entries(source.photos).map(([k, v]) => [k, { ...v }]))
  let sections = source.sections.map((s) => ({ ...s, units: s.units.map((u) => ({ paras: u.paras, photos: [...u.photos] })) }))

  // sections left out
  for (const id of Object.keys(e.sections || {})) {
    if (sections.some((s) => s.id === id)) applied.push(`section ${id} left out`)
    else ignored.push(`section ${id}: not in this story`)
  }
  sections = sections.filter((s) => e.sections?.[s.id] !== false)

  // swaps: exchange places in the flow
  for (const [a, b] of e.swaps || []) {
    const where = (id) => {
      for (const s of sections) for (const u of s.units) { const i = u.photos.indexOf(id); if (i >= 0) return { s, u, i } }
      return null
    }
    const A = where(a), B = where(b)
    if (!A || !B) { ignored.push(`swap ${a} with ${b}: photo not in the book`); continue }
    A.u.photos[A.i] = b
    B.u.photos[B.i] = a
    photos[a].sectionId = B.s.id
    photos[b].sectionId = A.s.id
    applied.push(`swapped ${a} and ${b}`)
  }

  // removed, bigger, smaller
  const big = new Set(), small = new Set()
  for (const [id, what] of Object.entries(e.photos || {})) {
    if (!photos[id]) { ignored.push(`${id}: not in this story`); continue }
    if (what === 'removed') {
      for (const s of sections) for (const u of s.units) u.photos = u.photos.filter((x) => x !== id)
      applied.push(`${id} removed`)
    } else if (what === 'bigger') { big.add(id); applied.push(`${id} bigger`) }
    else if (what === 'smaller') { small.add(id); applied.push(`${id} smaller`) }
  }
  for (const s of sections) s.units = s.units.filter((u) => u.paras.length || u.photos.length)
  sections = sections.filter((s) => s.units.length)

  // each section's lead photo is its first photo after the edits
  for (const p of Object.values(photos)) p.lead = false
  for (const s of sections) {
    const first = s.units.flatMap((u) => u.photos)[0]
    if (first && s.kind !== 'more') photos[first].lead = true
  }

  const placed = new Set(sections.flatMap((s) => s.units.flatMap((u) => u.photos)))
  let coverPhoto = null
  if (e.cover?.photoId) {
    if (photos[e.cover.photoId] && e.photos?.[e.cover.photoId] !== 'removed') { coverPhoto = e.cover.photoId; applied.push(`cover photo ${coverPhoto}`) }
    else ignored.push(`cover photo ${e.cover.photoId}: not in this story`)
  }
  if (!coverPhoto) coverPhoto = source.coverCandidates.find((id) => photos[id] && e.photos?.[id] !== 'removed') || null
  for (const p of Object.values(photos)) p.cover = p.id === coverPhoto

  const directives = {
    size: e.size || null,
    title: e.title || source.title,
    subtitle: e.subtitle ?? null,
    dedication: e.dedication || '',
    coverPhoto,
    coverStyle: e.cover?.style || null,
    map: e.map ?? true,
    big,
    small,
  }
  return {
    source: { ...source, photos, sections, placed },
    directives,
    edits: e,
    applied,
    ignored,
  }
}
