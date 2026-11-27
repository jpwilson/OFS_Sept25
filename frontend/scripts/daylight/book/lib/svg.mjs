// A reference drawer: display-list page -> SVG (owner: book ENGINE; dev only).
// It makes no layout decision of its own, which is the point: if this can draw a book, a
// preview component and a PDF writer can too. Used by render-sheets.mjs.
//   pageSvg(book, page, {fontUrl, imageUrl, view:'trim'|'bleed', guides}) -> svg string
//   coverSvg(book, {...same}) -> svg string
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n = (v) => Math.round(v * 100) / 100

export function fontFaces(book, fontUrl) {
  return Object.entries(book.fonts).map(([id, f]) => `@font-face{font-family:"B-${id}";src:url("${fontUrl(f.file)}") format("truetype");font-weight:normal;font-style:normal}`).join('')
}

function item(book, it, imageUrl, ids) {
  switch (it.type) {
    case 'rect': {
      const st = it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.strokeWidth || 1}"` : ''
      return `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"${it.r ? ` rx="${it.r}"` : ''} fill="${it.fill || 'none'}"${st}/>`
    }
    case 'circle': {
      const st = it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.strokeWidth || 1}"` : ''
      return `<circle cx="${it.cx}" cy="${it.cy}" r="${it.r}" fill="${it.fill || 'none'}"${st}/>`
    }
    case 'path': {
      const st = it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.strokeWidth || 1}" stroke-linecap="${it.lineCap || 'butt'}" stroke-linejoin="${it.lineJoin || 'miter'}"` : ''
      return `<path d="${it.d}" fill="${it.fill || 'none'}"${st}/>`
    }
    case 'text': {
      const ls = it.tracking ? ` letter-spacing="${it.tracking}"` : ''
      return `<text x="${it.x}" y="${it.y}" font-family="B-${it.font}" font-size="${it.size}" fill="${it.color}"${ls} xml:space="preserve">${esc(it.text)}</text>`
    }
    case 'image': {
      const img = book.images[it.ref]
      const c = it.crop
      const id = `c${ids.n++}`
      return `<svg x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" viewBox="${c.x} ${c.y} ${c.w} ${c.h}" preserveAspectRatio="none" id="${id}"><image href="${esc(imageUrl(img.src))}" width="${img.px.w}" height="${img.px.h}" preserveAspectRatio="none"/></svg>`
    }
    case 'group':
      return `<g transform="rotate(${it.rotate || 0} ${it.ox} ${it.oy})">${it.items.map((x) => item(book, x, imageUrl, ids)).join('')}</g>`
    default:
      throw new Error(`unknown item ${it.type}`)
  }
}

function frame(book, box, size, background, items, o) {
  const ids = { n: 0 }
  const vb = o.view === 'bleed' ? { x: 0, y: 0, w: size.w, h: size.h } : box
  const guides = o.guides ? o.guides() : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(vb.x)} ${n(vb.y)} ${n(vb.w)} ${n(vb.h)}" width="${o.width || n(vb.w)}" height="${o.width ? n((o.width * vb.h) / vb.w) : n(vb.h)}">${o.css ? `<style>${o.css}</style>` : ''}<rect x="0" y="0" width="${size.w}" height="${size.h}" fill="${background}"/>${items.map((x) => item(book, x, o.imageUrl, ids)).join('')}${guides}</svg>`
}

export function pageSvg(book, page, o) {
  const guides = o.guides ? () => {
    const s = page.safe, t = page.trim
    return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="#ff2d55" stroke-width="0.5" stroke-dasharray="3 3"/><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="none" stroke="#00a2ff" stroke-width="0.5"/>`
  } : null
  return frame(book, page.trim, page.size, page.background, page.items, { ...o, guides })
}

export function coverSvg(book, o) {
  const c = book.cover
  const guides = o.guides ? () => {
    const parts = [`<rect x="${c.trim.x}" y="${c.trim.y}" width="${c.trim.w}" height="${c.trim.h}" fill="none" stroke="#00a2ff" stroke-width="1"/>`]
    for (const k of ['back', 'spine', 'front']) { const p = c.panels[k]; parts.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="#00a2ff" stroke-width="0.6"/>`) }
    for (const h of c.hinge) parts.push(`<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" fill="#ff2d55" fill-opacity="0.12" stroke="#ff2d55" stroke-width="0.5" stroke-dasharray="3 3"/>`)
    for (const k of ['back', 'front', 'spine']) { const s = c.safe[k]; parts.push(`<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="#ff2d55" stroke-width="0.5" stroke-dasharray="3 3"/>`) }
    return parts.join('')
  } : null
  return frame(book, c.bleed, c.size, c.background, c.items, { ...o, view: 'bleed', guides })
}
