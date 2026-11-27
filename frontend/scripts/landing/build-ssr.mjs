// Builds the landing's server bundle, only in the story variant (owner: F0).
// In the classic variant it does nothing, so a production build never compiles the
// landing at all and cannot be broken by it.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { build } from 'vite'
import { resolveVariant } from './variant.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const variant = resolveVariant()
if (variant !== 'story') {
  console.log(`landing: variant ${variant}, skipping the server build`)
} else {
  // Honesty check first: a typed number in landing copy fails the build.
  execFileSync(process.execPath, [join(root, 'scripts/landing/check-facts.mjs')], { stdio: 'inherit' })
  await build({ root, configFile: join(root, 'vite.landing-ssr.config.js') })
  console.log('landing: server build -> dist-ssr/entry-server.mjs')
}
