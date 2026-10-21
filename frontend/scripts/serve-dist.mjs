// Serves dist/ the way vercel.json does (cleanUrls plus the marketing rewrites,
// everything else falling through to index.html) so the built site can be
// verified and screenshotted locally:
//   node scripts/serve-dist.mjs 4173
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../dist')
const port = Number(process.argv[2] || 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
}

const resolve = (pathname) => {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '').replace(/^\//, '')
  if (!rel) return join(DIST, 'index.html')
  const direct = join(DIST, rel)
  if (existsSync(direct) && statSync(direct).isFile()) return direct
  const clean = join(DIST, `${rel}.html`) // cleanUrls
  if (existsSync(clean)) return clean
  return join(DIST, 'index.html') // SPA fallback
}

createServer((req, res) => {
  const file = resolve(new URL(req.url, 'http://localhost').pathname)
  const body = readFileSync(file)
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
  res.end(body)
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`))
