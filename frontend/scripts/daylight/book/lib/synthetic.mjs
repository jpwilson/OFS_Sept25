// Made-up stories for the engine tests (owner: book ENGINE; dev only): any mix of photo
// shapes and pixel sizes, long or short, with no image files (the engine needs only sizes).
//   syntheticStory({chapters:[{title, paras, photos:[[w, h, caption?], ...], textAfter}]}) -> {source, event}
import { parseStory, buildJourney } from './node-story.mjs'
import { buildSource } from '../../../../src/daylight/book/engine/index.js'

const WORDS = 'we drove out early and the light came over the ridge while the children argued about breakfast and the dog slept through all of it until somebody opened the cooler'.split(' ')
function sentence(seed, n = 18) {
  const out = []
  for (let i = 0; i < n; i++) out.push(WORDS[(seed * 7 + i * 13) % WORDS.length])
  const s = out.join(' ')
  return s[0].toUpperCase() + s.slice(1) + '.'
}
const para = (seed, sentences = 4) => `<p>${Array.from({ length: sentences }, (_, i) => sentence(seed + i)).join(' ')}</p>`

export function syntheticStory({ id = 9000, title = 'A made-up story', chapters }) {
  const images = []
  let html = ''
  let n = 0
  chapters.forEach((ch, ci) => {
    html += `<h1>${ch.title || `Chapter ${ci + 1}`}</h1>`
    for (let k = 0; k < (ch.paras ?? 2); k++) html += para(ci * 10 + k, ch.sentences ?? 4)
    for (const [w, h, caption] of ch.photos || []) {
      const imgId = id * 100 + n++
      const url = `https://example.invalid/p/${imgId}.jpg`
      images.push({ id: imgId, image_url: url, caption: caption ?? `Photo ${n}, ${w} by ${h}.`, width: null, height: null, latitude: null, longitude: null, timestamp: null, order_index: n, media_type: 'image' })
      html += `<img src="${url}">`
    }
    if (ch.textAfter) html += para(ci * 10 + 7, ch.textAfter)
  })
  const event = {
    id, slug: `synthetic-${id}`, title, summary: 'Made up for the tests.', description: html,
    start_date: '2026-06-14T09:00:00', end_date: '2026-06-16T18:00:00', location_name: null,
    cover_image_url: images[0]?.image_url || null, author_full_name: 'Test Author', author_username: 'test', author_id: 1,
    event_images: images, locations: [],
  }
  const parsed = parseStory(event.description, event.event_images)
  const journey = buildJourney(event, parsed)
  const measured = {}
  let i = 0
  for (const ch of chapters) for (const [w, h] of ch.photos || []) measured[images[i++].image_url] = { w, h }
  const tags = [{ status: 'accepted', tagged_user_username: 'kid', tagged_user_display_name: 'A Kid' }]
  return { event, source: buildSource({ event, parsed, journey, tags, measured }) }
}

/** The fixture story with every shape: portraits, small photos, panoramas, squares, long text. */
export function everyShape() {
  return syntheticStory({
    id: 9100,
    title: 'Every shape there is',
    chapters: [
      { title: 'Portraits', photos: [[1080, 1440], [1080, 1440], [1200, 1600], [900, 1200]] },
      { title: 'Small ones', photos: [[543, 911], [640, 480], [500, 500]] },
      { title: 'Wide', photos: [[3000, 760], [1800, 1200], [1800, 1200], [2400, 1350]], textAfter: 2 },
      { title: 'Squares and big', photos: [[2400, 2400], [3000, 2000], [1500, 1500], [1500, 1500], [1500, 1500], [1500, 1500]] },
      { title: 'Talk', paras: 14, sentences: 6, photos: [[1448, 1086]] },
    ],
  })
}
