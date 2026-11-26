// Server build of the story landing (owner: F0): src/landing/entry-server.jsx ->
// dist-ssr/entry-server.mjs, which scripts/prerender.mjs calls to render "/" to a string.
// Run through scripts/landing/build-ssr.mjs, which skips it in the classic variant.
// CSS Modules class names must hash the same as the client build: both use Vite's
// default naming from the same files and the same root, and prerender.mjs fails the
// build if a class in the rendered html is missing from the client stylesheet.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveVariant } from './scripts/landing/variant.mjs'

export default defineConfig({
  plugins: [react()],
  define: {
    __LANDING_VARIANT__: JSON.stringify(resolveVariant()),
  },
  logLevel: 'warn',
  build: {
    ssr: 'src/landing/entry-server.jsx',
    outDir: 'dist-ssr',
    emptyOutDir: true,
    copyPublicDir: false,
    minify: false,
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'entry-server.mjs' },
    },
  },
})
