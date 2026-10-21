// Tiny inline-markup helpers shared by the static HTML renderer and the React
// renderer so **bold** and [label](href) mean the same thing in both.
export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Splits a string into plain / bold / link tokens.
export function tokenizeInline(text) {
  const tokens = []
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) })
    if (m[1] !== undefined) tokens.push({ type: 'bold', value: m[1] })
    else tokens.push({ type: 'link', value: m[2], href: m[3] })
    last = m.index + m[0].length
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) })
  return tokens
}

export function inlineToHtml(text) {
  return tokenizeInline(text)
    .map((t) => {
      if (t.type === 'bold') return `<strong>${escapeHtml(t.value)}</strong>`
      if (t.type === 'link') {
        const external = /^https?:\/\//.test(t.href)
        const attrs = external ? ' rel="noopener"' : ''
        return `<a href="${escapeHtml(t.href)}"${attrs}>${escapeHtml(t.value)}</a>`
      }
      return escapeHtml(t.value)
    })
    .join('')
}

// Plain text, used for meta descriptions, JSON-LD and llms-full.txt.
export function inlineToText(text) {
  return tokenizeInline(text)
    .map((t) => t.value)
    .join('')
}
