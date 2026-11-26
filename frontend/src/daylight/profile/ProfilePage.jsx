// Profile, /profile/:username (owner: FEED). PLAN-DAYLIGHT 2.9, ALT 2.7.
// A band in the You wash with the face, name, @username, bio and three readouts, clear
// follow states, then Stories (and, on your own profile, Drafts and Trash) as the same
// cards the feed uses. Endpoints are today's (Profile.jsx); the story list comes from the
// shared paged feed cache, paged to the cap, instead of the newest 100 only.
// ?tab=drafts|trash keeps the tab for Back.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/Toast.jsx'
import RelationshipProposalModal from '../../components/RelationshipProposalModal.jsx'
import UpgradeRibbon from '../../components/UpgradeRibbon.jsx'
import { apiFetch } from '../lib/http.js'
import { useDesktop } from '../lib/capability.js'
import { useFeed, useNotificationCounts, usePeople } from '../lib/data.js'
import { parseBackendDate, plural } from '../lib/format.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Icon } from '../ui/Icon.jsx'
import { IconButton } from '../ui/IconButton.jsx'
import { Menu } from '../ui/Menu.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Loading, Skeleton } from '../ui/Skeleton.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { cx } from '../ui/cx.js'
import StoryCard from '../feed/StoryCard.jsx'
import s from './ProfilePage.module.css'

const firstName = (p) => (p?.full_name || p?.username || '').split(' ')[0]

function useProfile(username) {
  const [st, set] = useState({ profile: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    let live = true
    set((x) => ({ ...x, loading: true, error: null }))
    apiFetch(`/users/${encodeURIComponent(username)}`, { auth: true })
      .then((profile) => live && set({ profile, error: null, loading: false }))
      .catch((error) => live && set({ profile: null, error, loading: false }))
    return () => {
      live = false
    }
  }, [username, nonce])
  return { ...st, reload: useCallback(() => setNonce((n) => n + 1), []) }
}

/** Follow state of the signed-in person towards `username`, and theirs towards us. */
function useFollow(username, profileId, enabled) {
  const [st, set] = useState({ status: null, theyFollow: false, relationship: null, loading: true })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let live = true
    Promise.all([
      apiFetch(`/users/${encodeURIComponent(username)}/is-following`).catch(() => ({ is_following: false, status: null })),
      apiFetch(`/users/${encodeURIComponent(username)}/is-following-me`).catch(() => ({ is_following: false })),
    ]).then(async ([mine, theirs]) => {
      const status = mine.is_following ? 'accepted' : mine.status === 'pending' ? 'pending' : null
      let relationship = null
      if (status === 'accepted' && theirs.is_following && profileId) relationship = await apiFetch(`/relationships/with/${profileId}`).catch(() => null)
      if (live) set({ status, theyFollow: !!theirs.is_following, relationship, loading: false })
    })
    return () => {
      live = false
    }
  }, [username, profileId, enabled, nonce])
  return { ...st, setStatus: (status) => set((x) => ({ ...x, status })), reload: () => setNonce((n) => n + 1) }
}

function useOwnLists(enabled) {
  const [st, set] = useState({ drafts: [], trash: [], loading: true, error: null })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let live = true
    Promise.all([apiFetch('/events/drafts'), apiFetch('/events/trash')])
      .then(([drafts, trash]) => live && set({ drafts: drafts || [], trash: trash || [], loading: false, error: null }))
      .catch((error) => live && set((x) => ({ ...x, loading: false, error })))
    return () => {
      live = false
    }
  }, [enabled, nonce])
  return { ...st, reload: useCallback(() => setNonce((n) => n + 1), []) }
}

function PeopleSheet({ open, onClose, username, kind, me, title }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const load = useCallback(() => {
    setError(null)
    apiFetch(`/users/${encodeURIComponent(username)}/${kind}`)
      .then((r) => setRows(r || []))
      .catch((e) => setError(e))
  }, [username, kind])
  useEffect(() => {
    if (open) {
      setRows(null)
      load()
    }
  }, [open, load])
  const toggle = async (u) => {
    setBusy(u.username)
    try {
      await apiFetch(`/users/${encodeURIComponent(u.username)}/follow`, { method: u.is_following ? 'DELETE' : 'POST' })
      setRows((rs) => rs.map((x) => (x.username === u.username ? { ...x, is_following: false, requested: !u.is_following } : x)))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={title} placement="auto">
      {error ? (
        <div className={s.sheetError} role="alert">
          <span>That list did not load.</span>
          <Button size="sm" variant="ghost" onClick={load}>
            Retry
          </Button>
        </div>
      ) : rows == null ? (
        <div className={s.sheetLoading}>
          <Spinner size={22} />
        </div>
      ) : !rows.length ? (
        <p className={s.sheetEmpty}>Nobody yet.</p>
      ) : (
        <ul className={s.peopleList} data-ui="people-list">
          {rows.map((u) => (
            <li key={u.id || u.username} className={s.personRow}>
              <a className={s.personLink} href={`/profile/${u.username}`} onClick={(e) => (e.preventDefault(), onClose(u.username))}>
                <Avatar name={u.full_name || u.username} src={u.avatar_url} size={44} />
                <span className={s.personText}>
                  <span className={s.personName}>{u.full_name || u.username}</span>
                  <span className={s.personSub}>
                    @{u.username}
                    {u.follows_you ? <span className={s.followsYou}>Follows you</span> : null}
                  </span>
                </span>
              </a>
              {u.username !== me ? (
                u.is_following ? (
                  <Button size="sm" variant="ghost" icon="check" busy={busy === u.username} onClick={() => toggle(u)}>
                    Following
                  </Button>
                ) : u.requested ? (
                  <span className={s.requested}>Requested</span>
                ) : (
                  <Button size="sm" busy={busy === u.username} onClick={() => toggle(u)}>
                    Follow
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

function ProfileSkeleton() {
  return (
    <Loading label="Loading profile" className={s.skeleton}>
      <span className={s.bandSk} />
      <div className="a-wrap">
        <div className={s.skHead}>
          <Skeleton w={96} h={96} r={48} />
          <Skeleton w="50%" h={32} r={10} />
          <Skeleton w="30%" h={14} r={7} />
        </div>
      </div>
    </Loading>
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const auth = useAuth() || {}
  const { user, loading: authLoading, logout, isTrialActive, isPaidSubscriber } = auth
  const { showToast } = useToast() || { showToast: () => {} }
  const own = !!user && user.username === username
  const desktop = useDesktop()
  const { profile, error, loading, reload } = useProfile(username)
  const follow = useFollow(username, profile?.id, !!user && !own && !!profile)
  const lists = useOwnLists(own)
  const counts = useNotificationCounts()
  const { faceFor } = usePeople()
  const { events, loading: feedLoading, error: feedError, hasMore, loadAll, refresh } = useFeed({ orderBy: 'event_date' })
  const [sheet, setSheet] = useState(null) // 'followers' | 'following'
  const [confirm, setConfirm] = useState(null) // {kind, event?}
  const [busy, setBusy] = useState(false)
  const [relOpen, setRelOpen] = useState(false)

  const tabParam = sp.get('tab') || location.state?.activeTab
  const tab = own && ['drafts', 'trash'].includes(tabParam) ? tabParam : 'stories'
  const setTab = (t) => setSp((cur) => {
    const n = new URLSearchParams(cur)
    if (t === 'stories') n.delete('tab')
    else n.set('tab', t)
    return n
  }, { replace: true })

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: `/profile/${username}`, message: 'Please sign in to view profiles' } })
  }, [authLoading, user, navigate, username])

  // Page the shared list to the cap so a profile is not limited to the newest 100 overall.
  useEffect(() => {
    if (events.length && hasMore) loadAll()
  }, [events.length > 0, hasMore, loadAll])

  const stories = useMemo(
    () => events.filter((e) => e.author_username === username).sort((a, b) => (parseBackendDate(b.start_date) || 0) - (parseBackendDate(a.start_date) || 0)),
    [events, username],
  )

  const name = profile?.full_name || username
  const first = firstName(profile) || username
  const canSee = own || follow.status === 'accepted'

  const doFollow = async () => {
    setBusy(true)
    try {
      await apiFetch(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' })
      follow.setStatus('pending')
      showToast(`Follow request sent to ${name}`, 'success')
      reload()
    } catch (e) {
      showToast(e.message || 'The request did not go through. Try again.', 'error')
    }
    setBusy(false)
  }
  const doUnfollow = async () => {
    setBusy(true)
    try {
      await apiFetch(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' })
      const was = follow.status
      follow.setStatus(null)
      showToast(was === 'pending' ? 'Request cancelled' : `Unfollowed ${name}`, 'success')
      reload()
    } catch (e) {
      showToast(e.message || 'That did not work. Try again.', 'error')
    }
    setBusy(false)
    setConfirm(null)
  }
  const act = async (kind, e) => {
    setBusy(true)
    try {
      if (kind === 'publish') await apiFetch(`/events/${e.id}/publish`, { method: 'POST' })
      if (kind === 'restore') await apiFetch(`/events/${e.id}/restore`, { method: 'POST' })
      if (kind === 'delete') await apiFetch(`/events/${e.id}/permanent`, { method: 'DELETE' })
      showToast({ publish: `Published "${e.title}"`, restore: `Restored "${e.title}"`, delete: `Deleted "${e.title}" for good` }[kind], 'success')
      lists.reload()
      if (kind === 'publish' || kind === 'restore') refresh()
      reload()
    } catch (err) {
      showToast(err.message || 'That did not work. Try again.', 'error')
    }
    setBusy(false)
    setConfirm(null)
  }

  if (loading && !profile) return <ProfileSkeleton />
  if (error) {
    const missing = error.status === 404
    return (
      <div className={cx('a-wrap', s.page)}>
        <EmptyState
          tone={missing ? undefined : 'error'}
          icon={missing ? 'user' : 'warning'}
          title={missing ? `There is nobody called @${username} here.` : 'This profile did not load.'}
          body={missing ? 'Check the spelling, or find them with people search.' : error.status === 0 ? 'We could not reach Our Family Socials. Check your connection.' : 'Something went wrong on our side. Try again.'}
          action={missing ? <Button to="/feed">Back to stories</Button> : <Button onClick={reload}>Retry</Button>}
        />
      </div>
    )
  }
  if (!profile) return null

  const rel = follow.relationship
  const followControl = own ? null : follow.loading ? (
    <Button variant="ghost" busy>
      Checking
    </Button>
  ) : follow.status === 'accepted' ? (
    <Button variant="ghost" icon="check" onClick={() => setConfirm({ kind: 'unfollow' })} data-ui="follow-state" data-state="following">
      Following
    </Button>
  ) : follow.status === 'pending' ? (
    <Button variant="ghost" onClick={() => setConfirm({ kind: 'cancel' })} data-ui="follow-state" data-state="pending">
      Requested
    </Button>
  ) : (
    <Button icon="plus" busy={busy} onClick={doFollow} data-ui="follow-state" data-state="none">
      Request to follow
    </Button>
  )

  const statLabel = (n, one, many) => (
    <>
      <span className={s.statN}>{n ?? 0}</span>
      <span className={s.statL}>{(n ?? 0) === 1 ? one : many}</span>
    </>
  )

  return (
    <div className={s.page} data-wash="zest" data-ui="profile-page">
      <div className={cx(s.band, profile.banner_url && s.hasBanner)} aria-hidden="true">
        {profile.banner_url ? <img src={profile.banner_url} alt="" className={s.banner} /> : <span className={s.bandArt} />}
      </div>

      <div className="a-wrap">
        <header className={s.head}>
          <div className={s.faceRow}>
            <Avatar name={name} src={profile.avatar_url} size={96} className={s.face} />
            <div className={s.actions}>
              {own ? (
                <>
                  <IconButton icon="bell" label="Notifications" variant="keyline" to="/notifications" badge={counts.total || undefined} />
                  {desktop ? (
                    <Button variant="ghost" icon="edit" to={`/profile/${username}/edit`}>
                      Edit profile
                    </Button>
                  ) : (
                    <IconButton icon="edit" label="Edit profile" variant="keyline" to={`/profile/${username}/edit`} />
                  )}
                  <Menu
                    align="end"
                    label="More for your profile"
                    trigger={(props) => <IconButton {...props} icon="more" label="More" variant="keyline" />}
                    items={[
                      { label: 'Settings', to: '/settings', icon: 'settings' },
                      { label: 'Your plan', to: '/billing', icon: 'sparkle' },
                      { label: 'Family relationships', to: '/relationships', icon: 'family' },
                      { label: 'Tags', to: '/tags', icon: 'user' },
                      { label: 'Your feedback', to: '/my-feedback', icon: 'comment' },
                      { divider: true },
                      { label: 'Log out', icon: 'logout', onClick: async () => { await logout?.(); navigate('/login') } },
                    ]}
                  />
                </>
              ) : (
                followControl
              )}
            </div>
          </div>

          <div className={s.idBlock}>
            <h1 className={s.name}>{name}</h1>
            <p className={s.handle}>
              <span>@{profile.username}</span>
              {own && profile.subscription_tier ? <span className={s.tier}>{{ free: 'Free plan', premium: 'Pro', family: 'Family' }[profile.subscription_tier] || profile.subscription_tier}</span> : null}
            </p>
          </div>

          {!own && !follow.loading ? (
            <div className={s.tags}>
              {follow.theyFollow ? <Chip size="sm" icon="check">Follows you</Chip> : null}
              {follow.status === 'pending' ? <span className={s.pendingNote}>Waiting for {first} to accept your request.</span> : null}
              {rel?.status === 'accepted' && rel.my_relationship_to_them ? (
                <Chip size="sm" wash="lime" icon="family">
                  Your {rel.my_relationship_to_them}
                </Chip>
              ) : rel?.status === 'pending' ? (
                <Chip size="sm" icon="family">Relationship pending</Chip>
              ) : follow.status === 'accepted' && follow.theyFollow && (!rel || rel.status === 'rejected') ? (
                <button type="button" className={s.addRel} onClick={() => setRelOpen(true)}>
                  <Icon name="plus" size={16} /> Add how you are related
                </button>
              ) : null}
            </div>
          ) : null}

          {profile.bio ? <p className={s.bio}>{profile.bio}</p> : null}

          <div className={s.stats}>
            <div className={s.stat} data-ui="readout">
              {statLabel(profile.event_count ?? stories.length, 'story', 'stories')}
            </div>
            <button type="button" className={cx(s.stat, s.statBtn)} onClick={() => setSheet('followers')}>
              {statLabel(profile.follower_count, 'follower', 'followers')}
            </button>
            <button type="button" className={cx(s.stat, s.statBtn)} onClick={() => setSheet('following')}>
              {statLabel(profile.following_count, 'following', 'following')}
            </button>
          </div>

          {!own && profile.is_active_member === false ? (
            <p className={s.inactive} role="note">
              <Icon name="info" size={18} />
              {first}'s plan is not active right now, so their stories do not open in the app.
            </p>
          ) : null}
        </header>

        {own && isTrialActive && !isPaidSubscriber && user?.subscription_tier === 'free' && stories.length >= 5 ? (
          <div className={s.ribbon}>
            <UpgradeRibbon eventCount={stories.length} limit={5} />
          </div>
        ) : null}

        <section className={s.stories} aria-label={own ? 'Your stories' : `Stories by ${name}`}>
          <div className={s.tabsRow}>
            {own ? (
              <Segmented
                label="Show"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'stories', label: `Stories${stories.length ? ` ${stories.length}` : ''}` },
                  { value: 'drafts', label: `Drafts${lists.drafts.length ? ` ${lists.drafts.length}` : ''}` },
                  { value: 'trash', label: `Trash${lists.trash.length ? ` ${lists.trash.length}` : ''}` },
                ]}
                className={s.tabs}
              />
            ) : (
              <h2 className={s.sectionTitle}>Stories</h2>
            )}
            {own && tab === 'stories' ? (
              <Button size="sm" icon="plus" to="/create?from=photos" className={s.newBtn}>
                New story
              </Button>
            ) : null}
          </div>

          {tab === 'stories' ? (
            !canSee ? (
              <EmptyState
                wash="zest"
                icon="lock"
                before={`${first}'s stories show here once you`}
                mark="follow"
                after="them."
                body={follow.status === 'pending' ? `Your request is with ${first}. When they accept, their stories for followers open for you.` : `Ask to follow and ${first} decides. Each story still opens only for the audience ${first} picks.`}
                action={follow.status === 'pending' ? null : <Button icon="plus" busy={busy} onClick={doFollow}>Request to follow</Button>}
              />
            ) : feedError && !events.length ? (
              <EmptyState tone="error" icon="warning" title="The stories did not load." body="Something went wrong on our side. Try again." action={<Button onClick={refresh}>Retry</Button>} />
            ) : feedLoading && !stories.length ? (
              <Loading label="Loading stories" className={s.grid}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} h={300} r={20} />
                ))}
              </Loading>
            ) : !stories.length ? (
              own ? (
                <EmptyState
                  wash="zest"
                  icon="stories"
                  before="Your first story is a few"
                  mark="photos"
                  after="away."
                  body="Pick the photos from a trip, a birthday or a Saturday, and we lay out the first draft."
                  action={<Button to="/create?from=photos" icon="photos">Make one from photos</Button>}
                />
              ) : (
                <EmptyState wash="paper" icon="stories" title={`${first} has no stories you can see yet.`} />
              )
            ) : (
              <ul className={s.grid} data-ui="profile-stories">
                {stories.map((e) => (
                  <li key={e.id}>
                    <StoryCard event={e} variant="card" face={faceFor(e.author_username, e.author_full_name)} />
                  </li>
                ))}
              </ul>
            )
          ) : lists.error ? (
            <EmptyState tone="error" icon="warning" title={`Your ${tab} did not load.`} body="Try again." action={<Button onClick={lists.reload}>Retry</Button>} />
          ) : lists.loading ? (
            <Loading label={`Loading ${tab}`} className={s.grid}>
              {[0, 1].map((i) => (
                <Skeleton key={i} h={300} r={20} />
              ))}
            </Loading>
          ) : tab === 'drafts' ? (
            lists.drafts.length ? (
              <ul className={s.grid} data-ui="profile-drafts">
                {lists.drafts.map((e) => (
                  <li key={e.id}>
                    <StoryCard
                      event={e}
                      variant="card"
                      face={faceFor(e.author_username, e.author_full_name)}
                      tags={['Draft']}
                      footer={
                        <>
                          <Button size="sm" icon="check" onClick={() => setConfirm({ kind: 'publish', event: e })}>
                            Publish
                          </Button>
                          <Button size="sm" variant="ghost" icon="edit" to={`/event/${e.slug || e.id}/edit`}>
                            Edit
                          </Button>
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState wash="paper" icon="pen" before="No" mark="drafts" after="right now." body="Save a story as a draft and finish it later." />
            )
          ) : lists.trash.length ? (
            <>
              <p className={s.trashNote}>Stories you move to the trash stay here until you restore them or delete them for good.</p>
              <ul className={s.grid} data-ui="profile-trash">
                {lists.trash.map((e) => (
                  <li key={e.id}>
                    <StoryCard
                      event={e}
                      variant="card"
                      to={false}
                      className={s.trashed}
                      face={faceFor(e.author_username, e.author_full_name)}
                      tags={['In the trash']}
                      footer={
                        <>
                          <Button size="sm" variant="ghost" icon="swap" onClick={() => setConfirm({ kind: 'restore', event: e })}>
                            Restore
                          </Button>
                          <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirm({ kind: 'delete', event: e })}>
                            Delete forever
                          </Button>
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState wash="paper" icon="trash" before="The trash is" mark="empty" after="." body="Stories you move to the trash wait here until you restore them or delete them for good." />
          )}
        </section>

        {own ? (
          <div className={s.footer}>
            <Button variant="quiet" icon="logout" onClick={async () => { await logout?.(); navigate('/login') }}>
              Log out
            </Button>
          </div>
        ) : null}
      </div>

      <PeopleSheet
        open={!!sheet}
        onClose={(go) => {
          setSheet(null)
          if (typeof go === 'string') navigate(`/profile/${go}`)
        }}
        username={username}
        kind={sheet || 'followers'}
        me={user?.username}
        title={sheet === 'following' ? (own ? 'You follow' : `${first} follows`) : own ? 'Your followers' : `${first}'s followers`}
      />

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm
            ? {
                unfollow: `Unfollow ${first}?`,
                cancel: 'Cancel your request?',
                publish: `Publish "${confirm.event?.title}"?`,
                restore: `Restore "${confirm.event?.title}"?`,
                delete: `Delete "${confirm.event?.title}" for good?`,
              }[confirm.kind]
            : ''
        }
        actions={
          confirm ? (
            <>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                {confirm.kind === 'cancel' ? 'Keep it' : 'Not now'}
              </Button>
              {confirm.kind === 'unfollow' || confirm.kind === 'cancel' ? (
                <Button variant={confirm.kind === 'unfollow' ? 'danger' : 'solid'} busy={busy} onClick={doUnfollow}>
                  {confirm.kind === 'unfollow' ? 'Unfollow' : 'Cancel request'}
                </Button>
              ) : (
                <Button variant={confirm.kind === 'delete' ? 'danger' : 'solid'} busy={busy} onClick={() => act(confirm.kind, confirm.event)}>
                  {{ publish: 'Publish', restore: 'Restore', delete: 'Delete forever' }[confirm.kind]}
                </Button>
              )}
            </>
          ) : null
        }
      >
        <p className={s.confirmText}>
          {confirm?.kind === 'unfollow'
            ? `${first}'s stories for followers will stop opening for you. You can ask to follow again later.`
            : confirm?.kind === 'cancel'
              ? `${first} will no longer see your request to follow.`
              : confirm?.kind === 'publish'
                ? 'It opens for the audience you picked for it.'
                : confirm?.kind === 'restore'
                  ? 'It goes back to where it was before you moved it to the trash.'
                  : confirm?.kind === 'delete'
                    ? 'It is gone for good. This cannot be undone.'
                    : ''}
        </p>
      </Dialog>

      {relOpen ? (
        <RelationshipProposalModal
          isOpen={relOpen}
          onClose={() => setRelOpen(false)}
          otherUser={profile}
          onSuccess={() => {
            setRelOpen(false)
            follow.reload()
          }}
        />
      ) : null}
    </div>
  )
}
