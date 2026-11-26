// The story landing page (owner: F0). Rendered to a string at build time
// (entry-server.jsx -> scripts/prerender.mjs) and hydrated by entry-client.jsx; also
// lazy-loaded by the app's RootRedirect for signed-out visitors in the story variant.
// Plain <a href> links only: no router, no auth hooks. No browser globals during render.
import { Component, useEffect, useLayoutEffect } from 'react'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'
import { Film } from './film/index.js'
import { Difference, How, Create, Import } from './explain/index.js'
import { Anatomy, Places, Views, Audience, Family } from './proof/index.js'
import { Nav, Limits, Compare, Plans, Questions, Start, Footer, Milestone } from './close/index.js'
import { OLD_HASHES, ROUTES } from './content/routes.js'
import { BRAND } from './content/common.js'
import { startScroll, scrollToId } from './lib/scroll.js'
import { initAnalytics } from './lib/analytics.js'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Map the old landing hashes (#features, #pricing) to the new section ids. */
function mapOldHash() {
  const key = window.location.hash.replace(/^#/, '')
  const target = OLD_HASHES[key]
  if (!target) return
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${target}`)
  requestAnimationFrame(() => scrollToId(target, { immediate: true }))
}

/** Every section, in SPEC's page order. */
export function PageBody() {
  useIsoLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add('ofsl-on')
    return () => html.classList.remove('ofsl-on')
  }, [])

  useEffect(() => {
    const stop = startScroll()
    mapOldHash()
    initAnalytics()
    return stop
  }, [])

  return (
    <div className="ofsl" data-ofsl="">
      <Nav />
      <main id="main">
        <Film />
        <Milestone />
        <Difference />
        <How />
        <Create />
        <Import />
        <Anatomy />
        <Places />
        <Views />
        <Audience />
        <Family />
        <Limits />
        <Compare />
        <Plans />
        <Questions />
        <Start />
      </main>
      <Footer />
    </div>
  )
}

/** Shown only if the page throws inside the app: a plain way on, never a blank screen. */
function Fallback() {
  // No data-ofsl here: that attribute is what the app-boot hide rule targets.
  return (
    <div className="ofsl">
      <div className="l-wrap" style={{ paddingBlock: 96, display: 'grid', gap: 16 }}>
        <p className="l-head">{BRAND}</p>
        <p>
          <a href={ROUTES.signup}>Start free</a> · <a href={ROUTES.login}>Log in</a> · <a href={ROUTES.features}>Features</a> ·{' '}
          <a href={ROUTES.pricing}>Pricing</a> · <a href={ROUTES.faq}>FAQ</a>
        </p>
      </div>
    </div>
  )
}

class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.error('[landing] page crashed', err)
    if (this.props.onFatal) this.props.onFatal(err)
  }
  render() {
    if (this.state.failed) return this.props.onFatal ? null : <Fallback />
    return this.props.children
  }
}

/**
 * onFatal: called if the page throws. entry-client passes one that puts the static,
 * server-rendered HTML back; inside the app it is omitted and a plain link list shows.
 */
export default function Page({ onFatal }) {
  return (
    <Boundary onFatal={onFatal}>
      <PageBody />
    </Boundary>
  )
}
