// Server render of the story landing (owner: F0). Built by vite.landing-ssr.config.js and
// called by scripts/prerender.mjs for "/" in the story variant.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import Page from './Page.jsx'

/** @returns {string} the html of <Page />, to place inside #root */
export function render() {
  return renderToString(
    <StrictMode>
      <Page />
    </StrictMode>,
  )
}
