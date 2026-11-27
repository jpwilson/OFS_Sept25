// A small TrueType reader for line breaking (owner: book ENGINE). Pure: takes the font
// file's bytes, reads only what measuring text needs, and never touches the DOM.
//
//   parseFont(bytes) -> Font
//   Font: {name, unitsPerEm, ascender, descender, capHeight, xHeight,
//          glyph(codePoint) -> glyph id (0 when the font has none),
//          advance(gid) -> font units, kern(leftGid, rightGid) -> font units}
//
// Why not a font library: the engine needs advance widths and pair kerning, nothing else.
// fontkit and opentype.js are 200 to 700 KB and would add a dependency to the shared
// package.json; this file is a few hundred lines with no dependency, runs the same in the
// browser and in Node, and is only ever loaded with the rest of the book code (a lazy chunk).
// Tables read: head, hhea, hmtx, maxp, OS/2, cmap (formats 4 and 12), GPOS pair adjustment
// (lookup type 2, through type 9 extensions, formats 1 and 2) under every 'kern' feature,
// and the old 'kern' table when a font has no GPOS kerning. Ligatures and contextual
// alternates are not applied: in Latin text they do not change a line's width noticeably.

export function parseFont(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = (o) => dv.getUint16(o)
  const i16 = (o) => dv.getInt16(o)
  const u32 = (o) => dv.getUint32(o)

  const tables = {}
  const numTables = u16(4)
  for (let i = 0; i < numTables; i++) {
    const r = 12 + i * 16
    const tag = String.fromCharCode(bytes[r], bytes[r + 1], bytes[r + 2], bytes[r + 3])
    tables[tag] = { offset: u32(r + 8), length: u32(r + 12) }
  }
  const need = (t) => {
    if (!tables[t]) throw new Error(`font has no ${t} table`)
    return tables[t].offset
  }

  const head = need('head')
  const unitsPerEm = u16(head + 18)
  const hhea = need('hhea')
  const numberOfHMetrics = u16(hhea + 34)
  const hmtx = need('hmtx')
  const numGlyphs = u16(need('maxp') + 4)

  let ascender = i16(hhea + 4)
  let descender = i16(hhea + 6)
  let capHeight = Math.round(unitsPerEm * 0.7)
  let xHeight = Math.round(unitsPerEm * 0.5)
  if (tables['OS/2']) {
    const os2 = tables['OS/2'].offset
    const version = u16(os2)
    ascender = i16(os2 + 68)
    descender = i16(os2 + 70)
    if (version >= 2) {
      xHeight = i16(os2 + 86)
      capHeight = i16(os2 + 88)
    }
  }

  // ---- name (family + subfamily, for messages only)
  let name = ''
  if (tables.name) {
    const nt = tables.name.offset
    const count = u16(nt + 2), strOff = nt + u16(nt + 4)
    const found = {}
    for (let i = 0; i < count; i++) {
      const r = nt + 6 + i * 12
      const platform = u16(r), nameId = u16(r + 6), len = u16(r + 8), off = u16(r + 10)
      if (platform !== 3 || (nameId !== 4 && nameId !== 1)) continue
      let s = ''
      for (let k = 0; k < len; k += 2) s += String.fromCharCode(u16(strOff + off + k))
      found[nameId] = found[nameId] || s
    }
    name = found[4] || found[1] || ''
  }

  // ---- cmap
  const cmap = need('cmap')
  let fmt4 = null, fmt12 = null
  {
    const n = u16(cmap + 2)
    for (let i = 0; i < n; i++) {
      const r = cmap + 4 + i * 8
      const platform = u16(r), encoding = u16(r + 2), off = cmap + u32(r + 4)
      const format = u16(off)
      if (format === 12 && (platform === 3 || platform === 0)) fmt12 = fmt12 ?? off
      else if (format === 4 && ((platform === 3 && encoding === 1) || platform === 0)) fmt4 = fmt4 ?? off
    }
  }
  const glyphCache = new Map()
  function glyph(cp) {
    let g = glyphCache.get(cp)
    if (g !== undefined) return g
    g = 0
    if (fmt12 != null) {
      const nGroups = u32(fmt12 + 12)
      let lo = 0, hi = nGroups - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const r = fmt12 + 16 + mid * 12
        const start = u32(r), end = u32(r + 4)
        if (cp < start) hi = mid - 1
        else if (cp > end) lo = mid + 1
        else { g = u32(r + 8) + (cp - start); break }
      }
    } else if (fmt4 != null && cp <= 0xffff) {
      const segX2 = u16(fmt4 + 6)
      const ends = fmt4 + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2
      for (let s = 0; s < segX2; s += 2) {
        const end = u16(ends + s)
        if (cp > end) continue
        const start = u16(starts + s)
        if (cp < start) break
        const delta = i16(deltas + s), ro = u16(ranges + s)
        if (ro === 0) g = (cp + delta) & 0xffff
        else {
          const gi = u16(ranges + s + ro + (cp - start) * 2)
          g = gi === 0 ? 0 : (gi + delta) & 0xffff
        }
        break
      }
    }
    if (g >= numGlyphs) g = 0
    glyphCache.set(cp, g)
    return g
  }

  function advance(gid) {
    const i = gid < numberOfHMetrics ? gid : numberOfHMetrics - 1
    return u16(hmtx + i * 4)
  }

  // ---- kerning: GPOS PairPos under 'kern', else the old kern table
  const coverageIndex = (off, g) => {
    const format = u16(off)
    if (format === 1) {
      let lo = 0, hi = u16(off + 2) - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1, v = u16(off + 4 + mid * 2)
        if (g < v) hi = mid - 1
        else if (g > v) lo = mid + 1
        else return mid
      }
      return -1
    }
    if (format === 2) {
      let lo = 0, hi = u16(off + 2) - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1, r = off + 4 + mid * 6
        const start = u16(r), end = u16(r + 2)
        if (g < start) hi = mid - 1
        else if (g > end) lo = mid + 1
        else return u16(r + 4) + (g - start)
      }
    }
    return -1
  }
  const classOf = (off, g) => {
    const format = u16(off)
    if (format === 1) {
      const start = u16(off + 2), count = u16(off + 4)
      return g >= start && g < start + count ? u16(off + 6 + (g - start) * 2) : 0
    }
    if (format === 2) {
      let lo = 0, hi = u16(off + 2) - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1, r = off + 4 + mid * 6
        const start = u16(r), end = u16(r + 2)
        if (g < start) hi = mid - 1
        else if (g > end) lo = mid + 1
        else return u16(r + 4)
      }
    }
    return 0
  }
  const bits = (v) => { let n = 0; while (v) { n += v & 1; v >>= 1 } return n }
  // x advance inside a value record, or 0
  const xAdvanceOf = (fmt, rec) => {
    if (!(fmt & 0x0004)) return 0
    return i16(rec + bits(fmt & 0x0003) * 2)
  }

  const pairSubtables = []
  if (tables.GPOS) {
    const gpos = tables.GPOS.offset
    const featureList = gpos + u16(gpos + 6), lookupList = gpos + u16(gpos + 8)
    const lookupIdx = new Set()
    const nf = u16(featureList)
    for (let i = 0; i < nf; i++) {
      const r = featureList + 2 + i * 6
      const tag = String.fromCharCode(bytes[r], bytes[r + 1], bytes[r + 2], bytes[r + 3])
      if (tag !== 'kern') continue
      const f = featureList + u16(r + 4)
      const n = u16(f + 2)
      for (let k = 0; k < n; k++) lookupIdx.add(u16(f + 4 + k * 2))
    }
    for (const li of [...lookupIdx].sort((a, b) => a - b)) {
      const l = lookupList + u16(lookupList + 2 + li * 2)
      const type = u16(l), n = u16(l + 4)
      for (let s = 0; s < n; s++) {
        let st = l + u16(l + 6 + s * 2)
        let t = type
        if (t === 9) {
          t = u16(st + 2)
          st = st + u32(st + 4)
        }
        if (t === 2) pairSubtables.push(st)
      }
    }
  }
  let oldKern = null
  if (!pairSubtables.length && tables.kern) {
    const k = tables.kern.offset
    if (u16(k) === 0 && u16(k + 4 + 4) >> 8 === 0) {
      const st = k + 4
      const nPairs = u16(st + 6)
      oldKern = new Map()
      for (let i = 0; i < nPairs; i++) {
        const r = st + 14 + i * 6
        oldKern.set(u16(r) * 65536 + u16(r + 2), i16(r + 4))
      }
    }
  }

  const kernCache = new Map()
  function kern(a, b) {
    const key = a * 65536 + b
    let v = kernCache.get(key)
    if (v !== undefined) return v
    v = 0
    if (oldKern) v = oldKern.get(key) || 0
    for (const st of pairSubtables) {
      const format = u16(st)
      const ci = coverageIndex(st + u16(st + 2), a)
      if (ci < 0) continue
      const vf1 = u16(st + 4), vf2 = u16(st + 6)
      const size1 = bits(vf1) * 2, size2 = bits(vf2) * 2
      if (format === 1) {
        const ps = st + u16(st + 10 + ci * 2)
        const n = u16(ps)
        const recSize = 2 + size1 + size2
        let lo = 0, hi = n - 1, hit = -1
        while (lo <= hi) {
          const mid = (lo + hi) >> 1, g2 = u16(ps + 2 + mid * recSize)
          if (b < g2) hi = mid - 1
          else if (b > g2) lo = mid + 1
          else { hit = mid; break }
        }
        if (hit < 0) continue
        v = xAdvanceOf(vf1, ps + 2 + hit * recSize + 2)
        break
      }
      if (format === 2) {
        const c1 = classOf(st + u16(st + 8), a), c2 = classOf(st + u16(st + 10), b)
        const class2Count = u16(st + 14)
        const rec = st + 16 + (c1 * class2Count + c2) * (size1 + size2)
        v = xAdvanceOf(vf1, rec)
        break
      }
    }
    kernCache.set(key, v)
    return v
  }

  return { name, unitsPerEm, ascender, descender, capHeight, xHeight, numGlyphs, glyph, advance, kern, hasKerning: pairSubtables.length > 0 || !!oldKern }
}
