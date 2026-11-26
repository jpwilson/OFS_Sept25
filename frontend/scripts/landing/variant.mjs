// Which landing page this build serves (owner: F0).
//
//   VITE_LANDING=classic|story   wins when set
//   VERCEL_ENV=production        -> landing.config.json "production" (today: classic)
//   anything else                -> landing.config.json "preview"    (today: story)
//
// Going live is a one-line change to landing.config.json.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONFIG = join(dirname(fileURLToPath(import.meta.url)), '../../landing.config.json')
export const VARIANTS = ['classic', 'story']

/** @returns {'classic'|'story'} */
export function resolveVariant(env = process.env) {
  const forced = (env.VITE_LANDING || '').trim()
  if (forced) {
    if (!VARIANTS.includes(forced)) throw new Error(`VITE_LANDING must be classic or story, got "${forced}"`)
    return forced
  }
  const config = JSON.parse(readFileSync(CONFIG, 'utf-8'))
  const v = env.VERCEL_ENV === 'production' ? config.production : config.preview
  if (!VARIANTS.includes(v)) throw new Error(`landing.config.json has an unknown variant "${v}"`)
  return v
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.log(resolveVariant())
