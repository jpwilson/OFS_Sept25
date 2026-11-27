// A photo's real pixel size from the first bytes of its file (owner: book ENGINE).
// The stored width and height on event_images are often missing or wrong (BOOKS.md decision
// 3), and resolution decides how big a photo may print, so the engine is given measured sizes.
//
//   imageSize(bytes) -> {w, h, type} | null      JPEG (EXIF orientation applied), PNG, WebP, GIF
//   measurePhotos(srcs, readHead, {concurrency}) -> Promise<{[src]: {w, h, type} | null}>
//     readHead(src) -> Promise<bytes>: the file, or at least its first 128 KB
//     (in the browser: fetch with a Range header; in Node: fs.readFile)

export function imageSize(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input)
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const n = b.length
  const ascii = (o, len) => String.fromCharCode(...b.subarray(o, o + len))
  // PNG
  if (n >= 24 && b[0] === 0x89 && ascii(1, 3) === 'PNG') return { w: dv.getUint32(16), h: dv.getUint32(20), type: 'png' }
  // GIF
  if (n >= 10 && ascii(0, 3) === 'GIF') return { w: dv.getUint16(6, true), h: dv.getUint16(8, true), type: 'gif' }
  // WebP
  if (n >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4)
    if (chunk === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), type: 'webp' }
    if (chunk === 'VP8 ') return { w: dv.getUint16(26, true) & 0x3fff, h: dv.getUint16(28, true) & 0x3fff, type: 'webp' }
    if (chunk === 'VP8L') {
      const bits = dv.getUint32(21, true)
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1, type: 'webp' }
    }
    return null
  }
  // JPEG
  if (n >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let o = 2
    let orientation = 1
    while (o + 9 < n) {
      if (b[o] !== 0xff) { o++; continue }
      const marker = b[o + 1]
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) { o += marker === 0xff ? 1 : 2; continue }
      const len = dv.getUint16(o + 2)
      if (marker === 0xe1 && ascii(o + 4, 4) === 'Exif') orientation = exifOrientation(dv, o + 10, len - 8) || 1
      // SOF0..SOF15 except DHT (C4), JPG (C8) and DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const h = dv.getUint16(o + 5), w = dv.getUint16(o + 7)
        return orientation >= 5 && orientation <= 8 ? { w: h, h: w, type: 'jpeg' } : { w, h, type: 'jpeg' }
      }
      o += 2 + len
    }
  }
  return null
}

function exifOrientation(dv, tiff, len) {
  try {
    const little = dv.getUint16(tiff) === 0x4949
    const ifd = tiff + dv.getUint32(tiff + 4, little)
    const count = dv.getUint16(ifd, little)
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12
      if (e + 12 > tiff + len) break
      if (dv.getUint16(e, little) === 0x0112) return dv.getUint16(e + 8, little)
    }
  } catch {
    return 1
  }
  return 1
}

export async function measurePhotos(srcs, readHead, { concurrency = 6 } = {}) {
  const list = [...new Set(srcs.filter(Boolean))]
  const out = {}
  let next = 0
  const work = async () => {
    while (next < list.length) {
      const src = list[next++]
      try {
        out[src] = imageSize(await readHead(src))
      } catch {
        out[src] = null
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, work))
  return Object.fromEntries(list.map((s) => [s, out[s] ?? null]))
}
