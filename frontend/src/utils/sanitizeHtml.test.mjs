// Tests for the shared story sanitizer (sanitizeHtml.js).
//
//   cd frontend && JSDOM_DIR=/path/to/node_modules node --test src/utils/sanitizeHtml.test.mjs
//
// Needs jsdom (not an app dependency): JSDOM_DIR points at a node_modules folder that has
// it, or install it anywhere Node can resolve it. STORY_FIXTURES may point at
// scripts/landing/fixtures/stories.mjs; the repo copy is used when it exists.
//
// Two halves: what an attacker puts in a story must not survive, and nothing a real story
// uses may be lost. "Real" is proven by running the app's own TipTap editor extensions
// headless: editor output must pass through unchanged, and stored stories must load into
// the editor identically before and after sanitizing (that is what the edit page does).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))

async function loadJsdom() {
  if (process.env.JSDOM_DIR) return createRequire(path.join(process.env.JSDOM_DIR, 'noop.js'))('jsdom')
  return import('jsdom')
}
const { JSDOM } = await loadJsdom()
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://ourfamilysocials.com/' })
globalThis.window = dom.window
for (const k of ['document', 'navigator', 'Node', 'Element', 'HTMLElement', 'DOMParser', 'DocumentFragment', 'MutationObserver', 'getComputedStyle']) {
  if (!(k in globalThis)) Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true })
}

const { sanitizeHtml } = await import(process.env.SANITIZER_MODULE ? pathToFileURL(process.env.SANITIZER_MODULE).href : './sanitizeHtml.js')
const { Editor } = await import('@tiptap/core')
const StarterKit = (await import('@tiptap/starter-kit')).default
const Image = (await import('@tiptap/extension-image')).default
const Link = (await import('@tiptap/extension-link')).default
const { LocationMarker } = await import('../extensions/LocationMarker.js')
const { VideoNode } = await import('../extensions/VideoNode.js')

// The same extension set RichTextEditor.jsx configures (node views are browser-only and
// do not change the stored HTML).
function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      Image.configure({ inline: false, allowBase64: true }),
      VideoNode,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', class: 'editor-link' } }),
      LocationMarker,
    ],
  })
}
const editor = makeEditor()
const load = (html) => {
  editor.commands.setContent(html)
  return { json: editor.getJSON(), html: editor.getHTML() }
}

const parse = (html) => new dom.window.DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body
const MEDIA = 'https://media.ourfamilysocials.com'
const marker = (name, lat, lng, ts, placeId = '') =>
  `<span data-location-marker="" data-location-name="${name}" data-latitude="${lat}" data-longitude="${lng}" data-timestamp="${ts}" data-place-id="${placeId}" class="location-marker" contenteditable="false">📍 ${name}</span>`
// As the editor stores it: TipTap also writes each node attribute as a plain attribute,
// and reads the marker back only from those (not from the data-* copies).
const storedMarker = (name, lat, lng, ts, placeId = '') =>
  `<span locationname="${name}" latitude="${lat}" longitude="${lng}" timestamp="${ts}" placeid="${placeId}" ` + marker(name, lat, lng, ts, placeId).slice(6)

// What each writer stores.
const SAMPLES = {
  editor: [
    '<h1>Day one</h1>',
    `<p>We started at ${storedMarker('Portland Head Light, Maine', 43.6231, -70.2079, '2026-08-08T16:20:00', 'ChIJ123')} and <strong>walked</strong> <em>a lot</em>, <u>really</u> <s>slowly</s> with <code>snacks</code>.</p>`,
    `<p>See <a target="_blank" rel="noopener noreferrer" class="editor-link" href="https://example.com/trail">the trail</a>.</p>`,
    `<img src="${MEDIA}/full/0f8fad5b-d9cb-469f-a165-70867728950e.jpg" alt="The lighthouse" width="1200" height="900">`,
    `<video src="${MEDIA}/videos/7c9e6679-7425-40de-944b-e07fc1f90ae7.mp4" controls="true" width="100%" maxwidth="600px"></video>`,
    '<h2>Snacks</h2><ul><li><p>Crisps</p></li><li><p>Apples</p></li></ul><ol start="3"><li><p>Third</p></li></ol>',
    '<blockquote><p>Are we there yet?</p></blockquote><pre><code class="language-js">let x = 1</code></pre><hr><p>Line<br>break</p><h3>Small</h3>',
    '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRg==" alt="">',
  ].join(''),
  // ai_creator.py asks for exactly this shape.
  aiWriter: `<h1>A day at the lake</h1><p>The kids ran ahead.</p><img src='${MEDIA}/full/9b2e1c3a-0000-4000-8000-000000000001.jpg'/><h2>Lunch</h2><p>Sandwiches.</p>`,
  // QuickAddModal.jsx builds this when publishing straight from photos.
  quickAdd: `<p>Fun day</p>\n<p><img src="${MEDIA}/full/9b2e1c3a-0000-4000-8000-000000000002.jpg" alt="Event photo" style="max-width: 100%;" /></p>\n<p><video src="${MEDIA}/videos/9b2e1c3a-0000-4000-8000-000000000003.mp4" controls style="max-width: 100%;"></video></p>`,
  // The Cloudinary-to-R2 migration rewrote images to Cloudflare resizing URLs.
  migrated: `<p><img src="${MEDIA}/cdn-cgi/image/width=1200,quality=82,format=auto/full/9b2e1c3a-0000-4000-8000-000000000004.jpg"></p>`,
}

async function loadFixtureStories() {
  const candidates = [process.env.STORY_FIXTURES, path.join(HERE, '../../scripts/landing/fixtures/stories.mjs')].filter(Boolean)
  const file = candidates.find((f) => existsSync(f))
  if (!file) return []
  const { STORIES } = await import(pathToFileURL(file).href)
  return STORIES.map((s) => ({ name: s.slug || s.key, body: s.body }))
}
const FIXTURES = await loadFixtureStories()

// ---------------------------------------------------------------- attacks

const ATTACKS = {
  'img onerror': ['<img src=x onerror="alert(document.cookie)">', (b) => !b.querySelector('[onerror]')],
  script: ['<p>hi</p><script>alert(1)</script>', (b) => !b.querySelector('script') && !b.textContent.includes('alert')],
  'style tag': ['<p>hi</p><style>body{display:none}</style><div><style>*{color:red}</style></div>', (b) => !b.querySelector('style') && !b.textContent.includes('display')],
  'fake sign-in form': ['<form action="https://evil.test"><input name="password" type="password"><button>Sign in</button><select><option>x</option></select><textarea>t</textarea></form>', (b) => !b.querySelector('form,input,button,select,option,textarea')],
  link: ['<link rel="stylesheet" href="https://evil.test/x.css"><p>a</p>', (b) => !b.querySelector('link')],
  meta: ['<meta http-equiv="refresh" content="0;url=https://evil.test">', (b) => !b.querySelector('meta')],
  base: ['<base href="https://evil.test/"><a href="/x">x</a>', (b) => !b.querySelector('base')],
  iframe: ['<iframe src="https://evil.test"></iframe>', (b) => !b.querySelector('iframe')],
  object: ['<object data="https://evil.test/x.swf"></object><embed src="https://evil.test/x">', (b) => !b.querySelector('object,embed')],
  svg: ['<svg width="2000" height="2000"><rect width="2000" height="2000"/></svg>', (b) => !b.querySelector('svg,rect')],
  dialog: ['<dialog open>Your session expired</dialog>', (b) => !b.querySelector('dialog')],
  'javascript: link': ['<a href="javascript:alert(1)">x</a>', (b) => !b.querySelector('a[href]')],
  'fixed overlay style': ['<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:white">Sign in again</div>', (b) => {
    const s = b.querySelector('div').getAttribute('style') || ''
    return !/position|z-index|top|left|background:/i.test(s)
  }],
  'absolute + transform': ['<p style="position: absolute; inset: 0; transform: scale(9); opacity: 0.99; pointer-events: none">x</p>', (b) => !b.querySelector('p').hasAttribute('style')],
  'css url / expression': ['<p style="background-image: url(https://evil.test/t.gif); width: expression(alert(1)); color: red">x</p>', (b) => b.querySelector('p').getAttribute('style') === 'color: red'],
  'escaped css': ['<p style="posi\\tion: fixed; color: blue">x</p>', (b) => b.querySelector('p').getAttribute('style') === 'color: blue'],
  'negative margin': ['<p style="margin-top: -2000px; margin-bottom: 8px">x</p>', (b) => b.querySelector('p').getAttribute('style') === 'margin-bottom: 8px'],
  'box-shadow cover': ['<p style="box-shadow: 0 0 0 100000px white">x</p>', (b) => !b.querySelector('p').hasAttribute('style')],
  'global overlay class': ['<div class="yarl__portal yarl__portal_open leaflet-pane image-caption">x</div>', (b) => b.querySelector('div').getAttribute('class') === 'image-caption'],
  popover: ['<div popover="manual" id="p">x</div>', (b) => !b.querySelector('[popover]')],
  'contenteditable true': ['<p contenteditable="true">x</p>', (b) => !b.querySelector('[contenteditable]')],
  'target other than _blank': ['<a href="https://x.test" target="_top">x</a>', (b) => !b.querySelector('a').hasAttribute('target')],
}

for (const [name, [html, ok]] of Object.entries(ATTACKS)) {
  test(`attack removed: ${name}`, () => {
    const out = sanitizeHtml(html)
    assert.ok(ok(parse(out)), `survived: ${out}`)
  })
}

test('target=_blank links get rel=noopener', () => {
  const a = parse(sanitizeHtml('<a href="https://x.test" target="_blank">x</a>')).querySelector('a')
  assert.equal(a.getAttribute('rel'), 'noopener noreferrer')
})

// ---------------------------------------------------------------- nothing real is lost

test('editor output passes through unchanged', () => {
  for (const [name, html] of Object.entries(SAMPLES)) {
    const stored = load(html).html
    assert.equal(sanitizeHtml(stored), stored, `${name}: editor HTML changed by sanitizing`)
  }
})

test('stored stories load into the editor identically after sanitizing (edit page)', () => {
  for (const [name, html] of Object.entries(SAMPLES)) {
    assert.deepEqual(load(sanitizeHtml(html)).json, load(html).json, name)
  }
})

test('location markers keep every attribute the editor and server read', () => {
  const stored = load(SAMPLES.editor).html
  const sp = parse(sanitizeHtml(stored)).querySelector('span[data-location-marker]')
  assert.ok(sp)
  for (const [attr, want] of Object.entries({
    'data-location-name': 'Portland Head Light, Maine', 'data-latitude': '43.6231', 'data-longitude': '-70.2079',
    'data-timestamp': '2026-08-08T16:20:00', 'data-place-id': 'ChIJ123', class: 'location-marker', contenteditable: 'false',
    // TipTap reads its node attributes back from these
    locationname: 'Portland Head Light, Maine', latitude: '43.6231', longitude: '-70.2079', timestamp: '2026-08-08T16:20:00', placeid: 'ChIJ123',
  })) assert.equal(sp.getAttribute(attr), want, attr)
  const json = load(sanitizeHtml(stored)).json
  const node = JSON.stringify(json).includes('"locationName":"Portland Head Light, Maine"')
  assert.ok(node, 'marker attributes lost on reload into the editor')
})

test('story page (EventDetail) shapes survive: heading ids, caption divs, media', () => {
  // EventDetail adds ids to headings and caption divs under media, then sanitizes.
  const captionStyle = 'font-size: 0.85em; color: var(--text-tertiary); font-weight: 500; text-align: center; margin-top: 2px; margin-bottom: 48px; line-height: 1.4;'
  const html = `<h1 id="section-0">Day one</h1><img src="${MEDIA}/full/a.jpg"><div class="image-caption" style="${captionStyle}">The lighthouse</div>` +
    `<video src="${MEDIA}/videos/b.mp4" controls="true" poster="${MEDIA}/full/c.jpg"></video><div class="video-caption" style="${captionStyle}">Speeches</div>`
  const b = parse(sanitizeHtml(html))
  assert.equal(b.querySelector('h1').id, 'section-0')
  const cap = b.querySelector('.image-caption')
  assert.equal(cap.textContent, 'The lighthouse')
  assert.equal(cap.getAttribute('style'), captionStyle.replace(/;$/, ''))
  assert.ok(b.querySelector('.video-caption'))
  assert.equal(b.querySelector('video').getAttribute('poster'), `${MEDIA}/full/c.jpg`)
  assert.equal(b.querySelector('video').getAttribute('controls'), 'true')
})

test('new look (daylight storyBlocks) shapes survive: picture, source, figure, figcaption, sizes', () => {
  const html = `<figure><picture><source srcset="${MEDIA}/full/a.webp" type="image/webp"><img src="${MEDIA}/full/a.jpg" alt="A" width="800" height="600"></picture><figcaption>Cap</figcaption></figure>` +
    `<video poster="${MEDIA}/full/p.jpg" controls><source src="${MEDIA}/videos/v.mp4" type="video/mp4"></video>` +
    `<p>${marker('Camden harbor', 44.2098, -69.0648, '2026-08-09T15:05:00-04:00')} then on</p>`
  const out = sanitizeHtml(html)
  const b = parse(out)
  assert.equal(b.querySelector('figure picture img').getAttribute('src'), `${MEDIA}/full/a.jpg`)
  assert.equal(b.querySelector('img').getAttribute('width'), '800')
  assert.equal(b.querySelector('figcaption').textContent, 'Cap')
  assert.equal(b.querySelector('video source').getAttribute('src'), `${MEDIA}/videos/v.mp4`)
  assert.equal(b.querySelector('video').getAttribute('poster'), `${MEDIA}/full/p.jpg`)
  const sp = b.querySelector('span[data-location-marker]')
  assert.equal(sp.getAttribute('data-latitude'), '44.2098')
  assert.equal(sp.getAttribute('data-timestamp'), '2026-08-09T15:05:00-04:00')
  assert.equal(out, sanitizeHtml(out), 'sanitizing is not idempotent')
})

test('sample stories (landing fixtures) lose nothing', { skip: FIXTURES.length ? false : 'stories.mjs fixtures not found' }, () => {
  for (const { name, body } of FIXTURES) {
    const clean = sanitizeHtml(body)
    assert.deepEqual(load(clean).json, load(body).json, `${name}: editor document changed`)
    const before = parse(body), after = parse(clean)
    for (const sel of ['span[data-location-marker]', 'img', 'video', 'h1', 'h2', 'p']) {
      assert.equal(after.querySelectorAll(sel).length, before.querySelectorAll(sel).length, `${name}: ${sel} count`)
    }
    const stored = load(body).html
    assert.equal(sanitizeHtml(stored), stored, `${name}: editor HTML changed`)
  }
})
