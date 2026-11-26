// Bootstrap (story variant only; a classic build uses boot-app.jsx as its entry, see
// vite.config.js). The inline script in index.html has already set <html data-boot>:
// 'landing' boots the standalone story landing without downloading the app, anything
// else boots the app exactly as before.
const boot = document.documentElement.dataset.boot

function bootApp() {
  return import('./boot-app.jsx')
}

if (__LANDING_VARIANT__ === 'story' && boot === 'landing') {
  // If the landing chunk cannot load, the visitor keeps the static page (real HTML,
  // real links). Log and stop; never fall through to an empty app shell.
  import('./landing/entry-client.jsx').catch((err) => {
    console.error('[landing] failed to load', err)
  })
} else {
  bootApp()
}
