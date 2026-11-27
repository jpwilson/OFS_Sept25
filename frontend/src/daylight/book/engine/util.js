// Small helpers shared inside the engine (owner: book ENGINE).

/** The path of a URL, for matching a cover URL to a photo (as lib/storyBlocks.js mediaKey does). */
export function mediaKeyOf(url) {
  if (!url) return ''
  const s = String(url).split(/[?#]/)[0]
  const m = s.match(/^[a-z]+:\/\/[^/]+(\/.*)$/i)
  return (m ? m[1] : s).replace(/\/+$/, '')
}

/** A stable hash of a string (FNV-1a, 32 bit, hex). */
export function hash(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
