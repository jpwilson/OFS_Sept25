import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { resolveVariant } from './scripts/landing/variant.mjs'
import { storyPages } from './scripts/landing/story-pages.mjs'

// Which landing page this build serves: 'classic' (today's) or 'story' (the rebuild).
// See scripts/landing/variant.mjs and landing.config.json.
const LANDING_VARIANT = resolveVariant()

// Story variant: fills the variant into the inline boot script in index.html.
// Classic variant: removes the boot script and makes boot-app.jsx (today's main.jsx body)
// the page entry, so a classic build's html and app loading are exactly as before.
const BOOT_BLOCK = /\n\s*<!-- LANDING:BOOT[\s\S]*?<\/script>/
function landingVariantHtml() {
  return {
    name: 'ofs-landing-variant',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!BOOT_BLOCK.test(html)) throw new Error('index.html: LANDING:BOOT block missing')
        if (LANDING_VARIANT === 'story') return html.replace(/__LANDING_VARIANT__/g, LANDING_VARIANT)
        return html.replace(BOOT_BLOCK, '').replace('src="/src/main.jsx"', 'src="/src/boot-app.jsx"')
      }
    }
  }
}

export default defineConfig({
  define: {
    __LANDING_VARIANT__: JSON.stringify(LANDING_VARIANT),
  },
  build: {
    // scripts/prerender.mjs reads this to find the landing chunk and stylesheet.
    manifest: true,
  },
  plugins: [
    landingVariantHtml(),
    // Story variant only: the marketing pages in the landing's look (scripts/landing/story-pages.mjs).
    // Not registered at all in a classic build, so a classic build is unchanged.
    LANDING_VARIANT === 'story' && storyPages(fileURLToPath(new URL('.', import.meta.url))),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Our Family Socials',
        short_name: 'OFS',
        description: 'A private social network for families to share memories, photos, and life events together.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'any',
        categories: ['social', 'lifestyle', 'photo'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Our Family Socials'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Our Family Socials'
          }
        ]
      },
      workbox: {
        // The public marketing pages are prerendered to real HTML files
        // (scripts/prerender.mjs). Without this denylist the service worker's
        // navigateFallback would hand back index.html for /faq, /pricing and the
        // comparison pages, so an installed PWA would show the home page's
        // <title> and meta description instead of the page's own.
        navigateFallbackDenylist: [
          /^\/(features|pricing|faq|about|alternatives)$/,
          /^\/compare\//
        ],
        // Landing images and fonts are large and only wanted on the landing page; they are
        // served with an immutable cache header instead (vercel.json). Landing JS and CSS
        // chunks stay precached so a cached index.html always finds its own chunks.
        globIgnores: ['landing/**', '.vite/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB (increased from default 2 MB)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cloudflare R2 media (images + videos) served via custom domain
            urlPattern: /^https:\/\/media\.ourfamilysocials\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-media',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  // Dev only: pre-bundle the landing's lazily imported deps so the first visit to the
  // landing does not trigger a dependency re-optimisation and a full reload.
  optimizeDeps: {
    include: ['lenis', '@vercel/analytics', 'posthog-js'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
