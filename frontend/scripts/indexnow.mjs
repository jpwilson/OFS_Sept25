// Pings IndexNow (Bing, Yandex, Seznam, Naver - and Bing feeds Copilot and
// DuckDuckGo) with every public URL in the sitemap.
//
//   node scripts/indexnow.mjs --dry-run    # print the payload, send nothing
//   node scripts/indexnow.mjs              # actually submit
//
// Requires https://www.ourfamilysocials.com/<key>.txt to be live and to contain
// the key, otherwise IndexNow returns 403. The key file is generated into
// public/ by scripts/generate-seo-files.mjs, so it ships with the next deploy.
import { PAGES } from '../src/content/marketing.js'
import { SITE_ORIGIN, INDEXNOW_KEY, absUrl } from '../src/content/site.js'

const ENDPOINT = 'https://api.indexnow.org/indexnow'
const dryRun = process.argv.includes('--dry-run')

const host = new URL(SITE_ORIGIN).host
const urlList = [...PAGES.map((p) => absUrl(p.path)), `${SITE_ORIGIN}/sitemap.xml`]
const payload = { host, key: INDEXNOW_KEY, keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`, urlList }

console.log(`IndexNow: ${urlList.length} URLs for ${host}`)
urlList.forEach((u) => console.log(`  ${u}`))

if (dryRun) {
  console.log('\n--dry-run: nothing submitted. Payload would be:')
  console.log(JSON.stringify(payload, null, 2))
  process.exit(0)
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload)
})

// IndexNow returns 200 (accepted) or 202 (accepted, key validation pending).
console.log(`\n${res.status} ${res.statusText}`)
if (!res.ok && res.status !== 202) {
  console.error(await res.text())
  process.exit(1)
}
