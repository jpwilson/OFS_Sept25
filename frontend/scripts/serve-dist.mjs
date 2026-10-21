// Serves dist/ the way Vercel does, so the built site can be verified and
// screenshotted locally with the production routing:
//   node scripts/serve-dist.mjs 4173
//
// It reads ../vercel.json and applies the real order of operations: the
// filesystem first (with cleanUrls, so /faq serves faq.html), then the
// rewrites (only real React routes, all to /), then a genuine HTTP 404 served
// from 404.html. That last step is the point - an unknown address must not come
// back as a 200 copy of the home page.
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const DIST = join(ROOT, '../dist')
const port = Number(process.argv[2] || 4173)

const { rewrites = [] } = JSON.parse(readFileSync(join(ROOT, '../vercel.json'), 'utf-8'))

// Vercel source patterns, limited to the syntax this project uses:
// literal paths, :param (one segment) and :param* (the rest of the path).
const compiled = rewrites.map(({ source, destination }) => ({
  destination,
  re: new RegExp(
    '^' +
      source
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\/:[A-Za-z_]\w*\*/g, '(?:/.*)?')
        .replace(/:[A-Za-z_]\w*/g, '[^/]+') +
      '$'
  )
}))

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
  if (!rel) return { file: join(DIST, 'index.html'), status: 200 }

  // 1. filesystem, including cleanUrls (/faq -> faq.html)
  const direct = join(DIST, rel)
  if (existsSync(direct) && statSync(direct).isFile()) return { file: direct, status: 200 }
  const clean = join(DIST, `${rel}.html`)
  if (existsSync(clean)) return { file: clean, status: 200 }

  // 2. rewrites from vercel.json - real React routes only
  if (compiled.some((r) => r.re.test(`/${rel}`))) {
    return { file: join(DIST, 'index.html'), status: 200 }
  }

  // 3. real 404
  return { file: join(DIST, '404.html'), status: 404 }
}

createServer((req, res) => {
  const { file, status } = resolve(new URL(req.url, 'http://localhost').pathname)
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }
  const body = readFileSync(file)
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' })
  res.end(body)
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`))
