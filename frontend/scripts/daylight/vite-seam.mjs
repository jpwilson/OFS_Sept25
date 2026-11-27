// The Daylight seam (owner: F0). docs/app/PLAN-DAYLIGHT.md section 5.2.
//
// Added to the Vite plugin list ONLY when the app look is not 'classic' (vite.config.js),
// so a classic build never sees it. It:
//   1. redirects thirteen imports made by src/App.jsx to src/daylight/seam/<Name>.jsx, and fails
//      the build if any of them did not happen (no existing file under src/ is edited);
//   2. in 'daylight' builds, rewrites index.html for a light page (theme colour, status bar,
//      a Bricolage preload);
//   3. copies frontend/daylight-public/ into the build output (and serves it in dev);
//   4. keeps a copy of the Vite manifest for scripts/daylight/check-bundle.mjs, because
//      scripts/prerender.mjs deletes dist/.vite;
//   5. in sample mode (VITE_DAYLIGHT_SAMPLE=1, dev server only) answers /api/v1/**, /__sb/**
//      and /__fx/** from scripts/daylight/fixtures/sample.json through
//      src/daylight/dev/sampleApi.js. Refused when VERCEL_ENV=production.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '../..')
const SRC = path.join(FRONTEND, 'src')
const SEAM_DIR = path.join(SRC, 'daylight/seam')
const PUBLIC_DIR = path.join(FRONTEND, 'daylight-public')
export const MANIFEST_COPY = path.join(FRONTEND, 'node_modules/.daylight/vite-manifest.json')

/** import specifier in src/App.jsx -> seam file */
export const SEAMS = {
  './pages/Feed': 'Feed.jsx',
  './pages/EventDetail': 'EventDetail.jsx',
  './pages/CreateEvent': 'CreateEvent.jsx',
  './pages/SmartImport': 'SmartImport.jsx',
  './pages/Profile': 'Profile.jsx',
  './components/Layout': 'Layout.jsx',
  // sign-in, sign-up and the returns from Google and email links (docs/app/AUTH.md)
  './pages/Login': 'Login.jsx',
  './pages/AuthCallback': 'AuthCallback.jsx',
  './pages/ResetPassword': 'ResetPassword.jsx',
  './pages/InviteLanding': 'InviteLanding.jsx',
  './pages/InvitedSignup': 'InvitedSignup.jsx',
  './pages/DemoLogin': 'DemoLogin.jsx',
  // the family tree (docs/app/FAMILY.md)
  './pages/FamilyTree': 'FamilyTree.jsx',
}

// Map chunks are large and only wanted when a map opens: never precached by the service
// worker, cached at run time instead (PLAN 3.8).
export const MAP_CHUNK_GLOBS = ['assets/maplibre-gl-*.js', 'assets/maplibre-gl-*.css', 'assets/maplibre-gl-worker-*.mjs']

/**
 * The PWA options for this look. Classic gets the object it was given, untouched, so a
 * classic build's sw.js and manifest are byte-identical to before.
 */
export function daylightPwaOptions(look, options) {
  if (look === 'classic') return options
  const o = structuredClone(options)
  o.workbox.globIgnores = [...(o.workbox.globIgnores || []), ...MAP_CHUNK_GLOBS]
  o.workbox.runtimeCaching = [
    {
      urlPattern: /\/assets\/maplibre-gl-[^/]*\.(m?js|css)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'daylight-map-lib', expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 60 } },
    },
    ...(o.workbox.runtimeCaching || []),
  ]
  if (look === 'daylight') {
    o.manifest.theme_color = '#F4F7FB'
    o.manifest.background_color = '#F4F7FB'
  }
  return o
}

const norm = (p) => (p || '').split(path.sep).join('/').split('?')[0]

function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0
  let n = 0
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name)
    if (e.isDirectory()) n += copyDir(a, b)
    else { fs.mkdirSync(to, { recursive: true }); fs.copyFileSync(a, b); n++ }
  }
  return n
}

const MIME = {
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.json': 'application/json', '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8',
}

export function daylightSeam({ look }) {
  const sample = process.env.VITE_DAYLIGHT_SAMPLE === '1'
  if (sample && process.env.VERCEL_ENV === 'production') {
    throw new Error('VITE_DAYLIGHT_SAMPLE is refused when VERCEL_ENV=production')
  }
  const hits = new Set()
  let outDir = path.join(FRONTEND, 'dist')
  let isBuild = false

  return {
    name: 'ofs-daylight-seam',
    enforce: 'pre',

    // Dev only: pre-bundle MapLibre so the first map does not trigger a re-optimisation reload.
    config() {
      return { optimizeDeps: { include: ['maplibre-gl'] } }
    },

    configResolved(config) {
      isBuild = config.command === 'build'
      outDir = path.resolve(config.root, config.build.outDir)
    },

    buildStart() {
      hits.clear()
    },

    resolveId(source, importer) {
      if (!importer || !SEAMS[source]) return null
      if (norm(importer) !== norm(path.join(SRC, 'App.jsx'))) return null
      hits.add(source)
      return path.join(SEAM_DIR, SEAMS[source])
    },

    buildEnd(err) {
      if (err || !isBuild) return
      const missed = Object.keys(SEAMS).filter((s) => !hits.has(s))
      if (missed.length) this.error(`daylight seam: these imports in src/App.jsx were not redirected: ${missed.join(', ')}. Did App.jsx change?`)
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (look !== 'daylight') return html
        const before = html
        html = html
          .replace('<meta name="theme-color" content="#000000" />', '<meta name="theme-color" content="#F4F7FB" />')
          .replace('content="black-translucent"', 'content="default"')
        if (html === before) throw new Error('daylight seam: index.html theme-color or status-bar meta not found')
        return {
          html,
          tags: [
            { tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: '/landing/fonts/bricolage-grotesque-latin-var-v5.woff2' }, injectTo: 'head' },
          ],
        }
      },
    },

    closeBundle() {
      if (!isBuild) return
      copyDir(PUBLIC_DIR, outDir)
      const m = path.join(outDir, '.vite/manifest.json')
      if (fs.existsSync(m)) {
        fs.mkdirSync(path.dirname(MANIFEST_COPY), { recursive: true })
        fs.copyFileSync(m, MANIFEST_COPY)
      }
    },

    configureServer(server) {
      // daylight-public/ is served like public/ (after Vite's own files)
      server.middlewares.use((req, res, next) => {
        const u = (req.url || '').split('?')[0]
        const f = path.join(PUBLIC_DIR, decodeURIComponent(u))
        if (!u.startsWith('/') || u.includes('..') || !f.startsWith(PUBLIC_DIR) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return next()
        res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream')
        fs.createReadStream(f).pipe(res)
      })
      if (sample) installSample(server)
    },
  }
}

// ------------------------------------------------------------------ sample mode (dev only)
function installSample(server) {
  const SAMPLE = path.join(HERE, 'fixtures/sample.json')
  // Rebuild the snapshot from the fixtures at every start, so merged art and fixtures show up.
  try {
    execFileSync(process.execPath, [path.join(HERE, 'build-sample.mjs'), '--quiet'], { stdio: 'inherit' })
  } catch (e) {
    server.config.logger.error(`[daylight] build-sample failed: ${e.message}`)
  }
  let state = null
  let api = null
  const load = async () => {
    // ssrLoadModule picks up edits to sampleApi.js without a restart
    api = await server.ssrLoadModule('/src/daylight/dev/sampleApi.js')
    if (!state) state = api.createState(JSON.parse(fs.readFileSync(SAMPLE, 'utf8')))
    return api
  }
  const log = []
  server.daylightLog = log

  const send = (res, status, body, headers = {}) => {
    res.statusCode = status
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', '*')
    res.setHeader('access-control-allow-methods', '*')
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
    res.end(body)
  }
  const sendJson = (res, status, json) => send(res, status, JSON.stringify(json), { 'content-type': 'application/json' })
  const readBody = (req) => new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })

  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const p = url.pathname
    const isApi = p.startsWith('/api/v1/') || p === '/api/v1'
    const isSb = p.startsWith('/__sb/')
    const isFx = p.startsWith('/__fx/')
    if (!isApi && !isSb && !isFx) return next()
    if (req.method === 'OPTIONS') return send(res, 204, '')
    try {
      const mod = await load()
      const origin = `http://${req.headers.host}`
      if (isFx) {
        if (p === '/__fx/signin') return send(res, 200, mod.signinPage(url.searchParams.get('as') || 'maya', url.searchParams.get('next') || '/feed'), { 'content-type': MIME['.html'] })
        if (p === '/__fx/viewer') return sendJson(res, 200, mod.setViewer(state, url.searchParams.get('as') || 'maya'))
        if (p === '/__fx/reset') { state = mod.createState(JSON.parse(fs.readFileSync(SAMPLE, 'utf8'))); return sendJson(res, 200, { ok: true }) }
        if (p === '/__fx/log') return sendJson(res, 200, log.slice(-500))
        state.origin = origin
        const page = mod.fixturePage ? await mod.fixturePage({ path: p, query: Object.fromEntries(url.searchParams) }, state) : null
        if (page) return page.redirect ? send(res, 302, '', { location: page.redirect }) : send(res, page.status || 200, page.html, { 'content-type': MIME['.html'], 'cache-control': 'no-store' })
        const file = mod.fixtureFile(p)
        if (file && file.svg) return send(res, 200, file.svg, { 'content-type': MIME['.svg'], 'cache-control': 'max-age=3600' })
        if (file && file.path && fs.existsSync(path.join(FRONTEND, file.path))) {
          res.setHeader('content-type', MIME[path.extname(file.path)] || 'application/octet-stream')
          res.setHeader('cache-control', 'max-age=3600')
          return fs.createReadStream(path.join(FRONTEND, file.path)).pipe(res)
        }
        return send(res, 404, 'no fixture file')
      }
      if (isSb) {
        // the stub auth server: reads JSON and form bodies, answers JSON, HTML or a redirect
        const raw = req.method === 'GET' || req.method === 'HEAD' ? null : await readBody(req)
        let body = null
        if (raw && raw.length) {
          const t = raw.toString('utf8')
          if ((req.headers['content-type'] || '').includes('application/x-www-form-urlencoded')) body = Object.fromEntries(new URLSearchParams(t))
          else { try { body = JSON.parse(t) } catch { body = null } }
        }
        state.origin = origin
        const r = await mod.answerSupabase({ method: req.method, path: p.replace(/^\/__sb/, ''), query: Object.fromEntries(url.searchParams), body, auth: req.headers.authorization || '' }, state)
        log.push({ entry: `${req.method} ${p}`, status: r.status })
        if (r.redirect) return send(res, r.status || 302, '', { location: r.redirect, 'cache-control': 'no-store' })
        if (r.html != null) return send(res, r.status, r.html, { 'content-type': MIME['.html'], 'cache-control': 'no-store' })
        if (r.json == null) return send(res, r.status, '')
        return send(res, r.status, JSON.stringify(r.json), { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' })
      }
      const raw = req.method === 'GET' || req.method === 'HEAD' ? null : await readBody(req)
      const ctype = req.headers['content-type'] || ''
      let body = null
      if (raw && ctype.includes('application/json')) { try { body = JSON.parse(raw.toString('utf8')) } catch { body = null } }
      else if (raw && ctype.includes('multipart/form-data')) body = { __multipart: true, size: raw.length }
      state.origin = origin
      state.viewer = state.viewer || 'maya'
      const r = await mod.answer({ method: req.method, path: p.replace(/^\/api\/v1/, '') || '/', query: Object.fromEntries(url.searchParams), body, auth: req.headers.authorization || '' }, state)
      const entry = `${req.method} ${p}${url.search}`
      if (!r) {
        log.push({ entry, status: 404, unanswered: true })
        server.config.logger.warn(`[daylight] no sample answer for ${entry}`)
        return sendJson(res, 404, { detail: `no sample answer for ${req.method} ${p}` })
      }
      log.push({ entry, status: r.status })
      return sendJson(res, r.status, r.json)
    } catch (e) {
      server.config.logger.error(`[daylight] sample API error: ${e.stack || e.message}`)
      return sendJson(res, 500, { detail: String(e.message) })
    }
  })
}
