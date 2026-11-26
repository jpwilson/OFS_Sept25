// Dev-only isolated view (owner: F0). Never in a production bundle (entry-client.jsx only
// imports it under import.meta.env.DEV).
//   /?only=film | explain | proof | close   that package's sections alone, in page order
//   /?only=ui                               every primitive on every wash
// Each package loads with its own dynamic import behind an error boundary, so a
// half-written sibling cannot break your view.
import { Component, useEffect, useLayoutEffect, useState } from 'react'
import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/base.css'
import { refreshScroll, startScroll } from '../lib/scroll.js'

const LOADERS = {
  film: () => import('../film/index.js'),
  explain: () => import('../explain/index.js'),
  proof: () => import('../proof/index.js'),
  close: () => import('../close/index.js'),
  ui: () => import('./Kitchen.jsx'),
}

const SECTIONS = {
  film: ['Film'],
  explain: ['Difference', 'How', 'Create', 'Import'],
  proof: ['Anatomy', 'Places', 'Views', 'Audience', 'Family'],
  close: ['Nav', 'Limits', 'Compare', 'Plans', 'Questions', 'Start', 'Footer'],
  ui: ['Kitchen'],
}

class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  render() {
    if (this.state.err) {
      return (
        <pre style={{ padding: 24, background: '#fff', color: '#b00020', whiteSpace: 'pre-wrap' }}>
          {this.props.name} crashed: {String(this.state.err.message)}
        </pre>
      )
    }
    return this.props.children
  }
}

export function Only({ pkg }) {
  const [mod, setMod] = useState(null)
  const [err, setErr] = useState(null)

  useLayoutEffect(() => {
    document.documentElement.classList.add('ofsl-on')
    return () => document.documentElement.classList.remove('ofsl-on')
  }, [])
  useEffect(() => startScroll(), [])
  useEffect(() => {
    const load = LOADERS[pkg]
    if (!load) {
      setErr(`Unknown package "${pkg}". Use film, explain, proof, close or ui.`)
      return
    }
    load().then(setMod, (e) => setErr(String((e && e.message) || e)))
  }, [pkg])
  useEffect(() => {
    if (mod) requestAnimationFrame(() => refreshScroll())
  }, [mod])

  if (err) return <pre style={{ padding: 24, color: '#b00020' }}>{err}</pre>
  if (!mod) return null
  return (
    <div className="ofsl" data-ofsl="">
      <main id="main">
        {SECTIONS[pkg].map((n) => {
          const C = mod[n]
          return <Boundary key={n} name={n}>{C ? <C /> : <pre style={{ padding: 24 }}>{n} is not exported yet.</pre>}</Boundary>
        })}
      </main>
    </div>
  )
}
