// Which app look this build ships (owner: F0). docs/app/SPEC.md decision 1.
//
//   VITE_APP_LOOK=classic|optin|daylight   wins when set
//   VERCEL_ENV=production                  -> app.config.json "production" (today: classic)
//   anything else                          -> app.config.json "preview"    (today: daylight)
//
//   classic   today's app; no Daylight code in the build (the seam plugin is not added)
//   optin     both in the build; classic by default; ?look=daylight or the switch turns it on
//   daylight  the new look by default; ?look=classic or "Use the previous look" is the escape
//
// Going live is a one-line change to app.config.json. A copy of scripts/landing/variant.mjs.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONFIG = join(dirname(fileURLToPath(import.meta.url)), '../../app.config.json')
export const LOOKS = ['classic', 'optin', 'daylight']

/** @returns {'classic'|'optin'|'daylight'} */
export function resolveAppLook(env = process.env) {
  const forced = (env.VITE_APP_LOOK || '').trim()
  if (forced) {
    if (!LOOKS.includes(forced)) throw new Error(`VITE_APP_LOOK must be classic, optin or daylight, got "${forced}"`)
    return forced
  }
  const config = JSON.parse(readFileSync(CONFIG, 'utf-8'))
  const v = env.VERCEL_ENV === 'production' ? config.production : config.preview
  if (!LOOKS.includes(v)) throw new Error(`app.config.json has an unknown look "${v}"`)
  return v
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(resolveAppLook())
