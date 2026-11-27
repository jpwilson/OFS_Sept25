// The Daylight shell (owner: F0). PLAN-DAYLIGHT 2.1.
// Desktop (900px and up): a white 64px top bar with the wordmark, Stories / Map / Family,
// people search, the bell, a solid "New story" button and the avatar menu.
// Phone: a 52px top bar (wordmark, search, bell) and a bottom tab bar (Stories, Map, New,
// Family, You) with safe-area padding. Pages hide parts of it with useChrome().
// It mounts the existing WelcomeModal, TrialBanner, Footer and FeedbackWidget unchanged,
// and keeps the demo-account banner and the open-ai-create event from Layout and Header.
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import TrialBanner from '../../components/TrialBanner.jsx'
import WelcomeModal from '../../components/WelcomeModal.jsx'
import FeedbackWidget from '../../components/FeedbackWidget.jsx'
import Footer from '../../components/Footer.jsx'
import { Root } from '../ui/Root.jsx'
import { Button } from '../ui/Button.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { Menu, MenuList } from '../ui/Menu.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { setLook } from '../lib/look.js'
import { signOutHere } from '../auth/lib/client.js'
import { useNotificationCounts } from '../lib/data.js'
import { useDesktop } from '../lib/capability.js'
import { ChromeContext, STORIES_RESELECT } from './chrome.js'
import { NewChoices, NewSheet } from './NewMenu.jsx'
import { SearchSheet } from './SearchSheet.jsx'
import s from './Shell.module.css'

const isInstalledPWA = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)

export function familyItems() {
  return [
    { label: 'Family tree', to: '/family-tree', icon: 'family' },
    { label: 'Sharing and groups', to: '/groups', icon: 'people' },
    { label: 'Tags', to: '/tags', icon: 'user', note: 'People without an account, and pets' },
  ]
}

function youItems({ user, isSuperuser, navigate, logout }) {
  const free = user?.subscription_tier === 'free'
  return [
    { label: 'Your profile', to: `/profile/${user.username}`, icon: 'user' },
    { label: 'Settings', to: '/settings', icon: 'settings' },
    { label: free ? 'Go Premium' : 'Plan and billing', to: '/billing', icon: 'sparkle' },
    { label: 'Notifications', to: '/notifications', icon: 'bell' },
    { divider: true },
    { label: "What's new", to: '/blog', icon: 'info' },
    { label: 'FAQ', to: '/faq', icon: 'help' },
    { label: 'Send feedback', icon: 'comment', onClick: () => window.dispatchEvent(new Event('open-feedback')) },
    isInstalledPWA()
      ? { label: 'Install the app (FAQ)', to: '/faq', icon: 'download' }
      : { label: 'Install the app', icon: 'download', onClick: () => window.dispatchEvent(new Event('show-install-prompt')) },
    isSuperuser ? { label: 'Admin', to: '/admin', icon: 'settings' } : null,
    { divider: true },
    { label: 'Use the previous look', icon: 'swap', note: 'You can come back to this one any time', onClick: () => setLook('classic') },
    {
      label: 'Log out',
      icon: 'logout',
      onClick: async () => {
        // This browser only: the phone and the iPad stay signed in (docs/app/AUTH.md decision 9).
        await signOutHere(logout)
        navigate('/')
      },
    },
  ]
}

function Wordmark({ to }) {
  return (
    <Link to={to} className={s.wordmark} aria-label="Our Family Socials, home">
      <span className={s.mark} aria-hidden="true" />
      <span className={s.wordText}>Our Family Socials</span>
    </Link>
  )
}

export default function Shell({ override }) {
  const auth = useAuth() || {}
  const { user, isDemoAccount, isSuperuser, logout, loading: authLoading } = auth
  const navigate = useNavigate()
  const loc = useLocation()
  const navType = useNavigationType()
  // Arriving at a page by a link starts it at the top; Back and Forward (POP) keep their place.
  // The router keeps the window's scroll across routes, so without this a story opened from far
  // down the feed would open mid-story.
  useLayoutEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
  }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  const desktop = useDesktop()
  const counts = useNotificationCounts()
  const [sheet, setSheet] = useState(null) // 'new' | 'search' | 'you' | 'family' | null

  // pages push overrides (useChrome); the latest wins
  const [stack, setStack] = useState([])
  const chrome = useMemo(() => Object.assign({ tabBar: true, topBar: true, footer: true }, ...stack.map((x) => x.opts)), [stack])
  const ctx = useMemo(
    () => ({
      push(opts) {
        const entry = { opts }
        setStack((st) => [...st, entry])
        return () => setStack((st) => st.filter((x) => x !== entry))
      },
    }),
    [],
  )

  // The Header's open-ai-create event (FeedbackWidget sends it) now opens the photo flow.
  useEffect(() => {
    const go = () => navigate('/create?from=photos')
    window.addEventListener('open-ai-create', go)
    return () => window.removeEventListener('open-ai-create', go)
  }, [navigate])
  useEffect(() => setSheet(null), [loc.pathname, loc.search])

  const onFeed = loc.pathname === '/feed'
  const onMap = onFeed && new URLSearchParams(loc.search).get('view') === 'map'
  const onStories = onFeed && !onMap
  const onProfile = user && loc.pathname === `/profile/${user.username}`
  const onFamily = ['/family-tree', '/groups', '/tags', '/relationships'].includes(loc.pathname)
  const canCreate = user && !isDemoAccount
  const homeTo = user ? '/feed' : '/'

  const storiesClick = useCallback(
    (e) => {
      if (!onStories) return
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      window.dispatchEvent(new Event(STORIES_RESELECT))
    },
    [onStories],
  )

  const you = user ? youItems({ user, isSuperuser, navigate, logout }) : []
  const showTabs = !!user && chrome.tabBar && !desktop

  return (
    <Root className={s.shell}>
      <ChromeContext.Provider value={ctx}>
        <a href="#ofsa-main" className={s.skip}>
          Skip to content
        </a>
        <WelcomeModal />
        {isDemoAccount && (
          <div className={s.demo} role="note">
            You're viewing a demo.{' '}
            <button
              type="button"
              onClick={async () => {
                await signOutHere(logout)
                navigate('/login?signup=true')
              }}
            >
              Create your own account
            </button>
          </div>
        )}
        <TrialBanner />

        {chrome.topBar && (
          <header className={s.bar} data-ui="topbar">
            <div className={s.barInner}>
              <Wordmark to={homeTo} />
              {user && desktop ? (
                <nav className={s.nav} aria-label="Main">
                  <Link to="/feed" className={s.navLink} aria-current={onStories ? 'page' : undefined} onClick={storiesClick}>
                    Stories
                  </Link>
                  <Link to="/feed?view=map" className={s.navLink} aria-current={onMap ? 'page' : undefined}>
                    Map
                  </Link>
                  <Menu
                    label="Family"
                    items={familyItems()}
                    trigger={(p, open) => (
                      <button type="button" {...p} className={s.navLink} data-open={open || undefined} aria-current={onFamily ? 'page' : undefined}>
                        Family <Icon name="chevron-down" size={16} />
                      </button>
                    )}
                  />
                </nav>
              ) : null}
              <div className={s.actions}>
                {user ? (
                  <>
                    <IconButton icon="search" label="Find people" onClick={() => setSheet('search')} />
                    <IconButton icon="bell" label="Notifications" to="/notifications" badge={counts.total || 0} />
                    {desktop && canCreate ? (
                      <Button onClick={() => setSheet('new')} icon="plus" className={s.newBtn} aria-haspopup="dialog">
                        New story
                      </Button>
                    ) : null}
                    {desktop ? (
                      <Menu
                        label="You"
                        align="end"
                        items={you}
                        width={290}
                        trigger={(p) => (
                          <button type="button" {...p} className={s.me} aria-label={`${user.full_name || user.username}: your menu`}>
                            <Avatar name={user.full_name || user.username} src={user.avatar_url} size={36} />
                            <Icon name="chevron-down" size={16} />
                          </button>
                        )}
                      />
                    ) : null}
                  </>
                ) : authLoading ? null : (
                  <>
                    <Button variant="quiet" to="/login" size="sm">
                      Log in
                    </Button>
                    <Button to="/login?signup=true" size="sm">
                      Start free
                    </Button>
                  </>
                )}
              </div>
            </div>
          </header>
        )}

        <main id="ofsa-main" tabIndex={-1} className={s.main}>
          {override || <Outlet />}
        </main>

        {chrome.footer && (
          <div className={s.footer}>
            <Footer />
          </div>
        )}
        <div className={s.feedbackSlot}>
          <FeedbackWidget />
        </div>
        {showTabs ? <div className={s.tabSpacer} aria-hidden="true" /> : null}

        {showTabs && (
          <nav className={s.tabs} aria-label="Main" data-ui="tabbar">
            <Link to="/feed" className={s.tab} aria-current={onStories ? 'page' : undefined} onClick={storiesClick} data-wash="tide">
              <span className={s.tabIcon}><Icon name="stories" size={24} /></span>
              <span className={s.tabLabel}>Stories</span>
            </Link>
            <Link to="/feed?view=map" className={s.tab} aria-current={onMap ? 'page' : undefined} data-wash="azure">
              <span className={s.tabIcon}><Icon name="map" size={24} /></span>
              <span className={s.tabLabel}>Map</span>
            </Link>
            {canCreate ? (
              <button type="button" className={`${s.tab} ${s.tabNew}`} onClick={() => setSheet('new')} aria-haspopup="dialog">
                <span className={s.newDisc}><Icon name="plus" size={26} strokeWidth={2.4} /></span>
                <span className={s.tabLabel}>New</span>
              </button>
            ) : null}
            <button type="button" className={s.tab} onClick={() => setSheet('family')} aria-haspopup="dialog" aria-current={onFamily ? 'page' : undefined} data-wash="lime">
              <span className={s.tabIcon}><Icon name="family" size={24} /></span>
              <span className={s.tabLabel}>Family</span>
            </button>
            <button type="button" className={s.tab} onClick={() => setSheet('you')} aria-haspopup="dialog" aria-current={onProfile ? 'page' : undefined} data-wash="zest">
              <span className={s.tabIcon}>
                <Avatar name={user.full_name || user.username} src={user.avatar_url} size={26} />
              </span>
              <span className={s.tabLabel}>You</span>
            </button>
          </nav>
        )}

        {user ? (
          <>
            <NewSheet open={sheet === 'new'} onClose={() => setSheet(null)} />
            <SearchSheet open={sheet === 'search'} onClose={() => setSheet(null)} />
            <Sheet open={sheet === 'family'} onClose={() => setSheet(null)} title="Family" wash="lime">
              <MenuList items={familyItems()} onDone={() => setSheet(null)} />
            </Sheet>
            <Sheet open={sheet === 'you'} onClose={() => setSheet(null)} title={user.full_name || user.username} wash="zest">
              <MenuList items={you} onDone={() => setSheet(null)} />
            </Sheet>
          </>
        ) : null}
      </ChromeContext.Provider>
    </Root>
  )
}

export { NewChoices }
