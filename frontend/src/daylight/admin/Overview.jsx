// The Overview tab (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "Phone layout":
// tiles, then Visitors (above the fold on a phone), Sign-ups, the one conversion line, the
// funnel, Sign-ins, top referrers and the newest members.
import { useRef, useState } from 'react'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Readout } from '../ui/Readout.jsx'
import { Segmented } from '../ui/Segmented.jsx'
import { Loading, Skeleton } from '../ui/Skeleton.jsx'
import { cx } from '../ui/cx.js'
import { getUnfinished, num, pct, postMembers, useResource, useSeen } from './api.js'
import { EMPTY_FILTERS, membersBody, rangeOf } from './query.js'
import { ago } from './time.js'
import { Bars } from './charts/Bars.jsx'
import { Funnel } from './charts/Funnel.jsx'
import { Ranked } from './charts/Ranked.jsx'
import { MethodChip } from './Members.jsx'
import Unfinished from './Unfinished.jsx'
import s from './AdminPage.module.css'

// colours checked against white: azure-deep and fizz-deep for the two series, line-strong
// for other and legacy; never zest-deep (2.89:1)
const C1 = 'var(--a-azure-deep)'
const C2 = 'var(--a-fizz-deep)'
const C3 = 'var(--a-line-strong)'
const METHOD_KEYS = [
  { key: 'email', label: 'email', color: C1 },
  { key: 'google', label: 'Google', color: C2 },
  { key: 'other', label: 'other or legacy', color: C3 },
]
const SOURCE_KEYS = [
  { key: 'organic', label: 'found us', color: C1 },
  { key: 'invited', label: 'invited', color: C2 },
]

export default function Overview({ q, overview, visitors, nonce, onRetry, onTab }) {
  const err = overview.error
  if (err?.status === 404) {
    return (
      <EmptyState
        icon="info"
        title="The server has not been updated yet."
        body="These numbers come from a newer version of the server, which is not live yet. The Tools tab still works."
        action={
          <>
            <Button onClick={() => onTab('tools')}>Open Tools</Button>
            <Button variant="ghost" onClick={onRetry}>Try again</Button>
          </>
        }
        className={s.state}
      />
    )
  }
  if (err?.status === 403 || err?.status === 401) {
    return <EmptyState icon="lock" title="Only admins can see these numbers." body="Sign in with the site owner's account to see them." className={s.state} />
  }
  if (err) {
    return (
      <EmptyState
        tone="error"
        icon="warning"
        title="The numbers did not load."
        body={err.status === 0 ? err.message : 'The server could not count them just now. Try again in a minute.'}
        action={<Button onClick={onRetry}>Try again</Button>}
        className={s.state}
      />
    )
  }
  if (!overview.data) return <OverviewSkeleton />
  return <OverviewBody q={q} o={overview.data} vis={visitors} stale={overview.loading} nonce={nonce} onRetry={onRetry} onTab={onTab} />
}

function OverviewSkeleton() {
  return (
    <Loading label="Counting visitors, sign-ups and sign-ins" className={s.overview}>
      <div className={s.tiles}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={s.tile}>
            <Skeleton w="60%" h={11} />
            <Skeleton w="40%" h={22} />
          </div>
        ))}
      </div>
      <div className={s.grid}>
        {[0, 1].map((i) => (
          <Card key={i} pad="sm" className={s.card}>
            <Skeleton w="40%" h={22} />
            <Skeleton h={160} r={12} />
          </Card>
        ))}
      </div>
    </Loading>
  )
}

/** "active" for the range when the server could not count it from sign-in events. */
function activeFor(o, range) {
  if (o.signins.totals.active != null) return o.signins.totals.active
  const a = o.activity
  return { '24h': a.active_24h, '7d': a.active_7d, '30d': a.active_30d }[range] ?? null
}

function OverviewBody({ q, o, vis, stale, nonce, onRetry, onTab }) {
  const long = rangeOf(o.range).long
  const v = vis.data?.ok ? vis.data : null
  const su = o.signups.totals
  const si = o.signins.totals
  const visitorNote = vis.loading && !vis.data ? 'Counting…' : vis.error ? 'Did not load' : vis.data?.configured === false ? 'Not set up yet' : vis.data && !vis.data.ok ? 'PostHog did not answer' : `${num(v?.totals.pageviews)} page views`
  const active = activeFor(o, o.range)

  return (
    <div className={cx(s.overview, stale && s.stale)} aria-busy={stale || undefined} data-ui="admin-overview">
      <div className={s.tiles} role="group" aria-label={`In ${long}`}>
        <Readout className={s.tile} size="sm" label="Visitors" value={v ? num(v.totals.visitors) : '—'} note={visitorNote} />
        <Readout className={s.tile} size="sm" label="Sign-ups" value={num(su.profiles)} note={su.started != null ? `${num(su.started)} started` : 'profiles made'} />
        <Readout className={s.tile} size="sm" label="Sign-ins" value={num(si.signins)} note={si.members != null ? `by ${num(si.members)} people` : 'not readable'} />
        <Readout className={s.tile} size="sm" label="Active members" value={num(active)} note={`of ${num(o.activity.members)}`} />
      </div>

      <div className={s.grid}>
        <Card pad="sm" className={s.card} data-ui="admin-visitors">
          <VisitorsCard vis={vis} v={v} q={q} long={long} onRetry={onRetry} />
        </Card>

        <Card pad="sm" className={s.card} data-ui="admin-signups">
          <SignupsCard o={o} long={long} />
        </Card>

        <p className={s.convert} data-ui="admin-convert">
          {v && v.totals.visitors ? (
            <>
              <strong>{num(su.profiles)}</strong> of <strong>{num(v.totals.visitors)}</strong> visitors signed up
              {pct(su.profiles, v.totals.visitors) ? ` (${pct(su.profiles, v.totals.visitors)})` : ''} in {long}.
            </>
          ) : (
            <>
              <strong>{num(su.profiles)}</strong> {su.profiles === 1 ? 'person' : 'people'} signed up in {long}.
            </>
          )}
        </p>

        <Card pad="sm" className={s.card} data-ui="admin-funnel">
          <FunnelCard o={o} range={o.range} long={long} />
        </Card>

        <Card pad="sm" className={s.card} data-ui="admin-signins">
          <SigninsCard o={o} long={long} />
        </Card>

        <Card pad="sm" className={s.card} data-ui="admin-referrers">
          <ReferrersCard vis={vis} v={v} long={long} />
        </Card>

        <Card pad="sm" className={s.card} data-ui="admin-recent">
          <RecentMembers nonce={nonce} onAll={() => onTab('members', { sort: 'joined', order: 'desc' })} />
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- visitors
function VisitorsCard({ vis, v, q, long, onRetry }) {
  const d = vis.data
  if (!d && vis.loading) {
    return (
      <>
        <h3 className={s.cardTitle}>Visitors</h3>
        <Skeleton h={180} r={12} />
      </>
    )
  }
  if (vis.error || !d) {
    return (
      <>
        <h3 className={s.cardTitle}>Visitors</h3>
        <p className={s.inlineNote} role="alert">
          <Icon name="warning" size={18} /> Visitor numbers did not load.
        </p>
        <Button size="sm" variant="ghost" onClick={onRetry}>Try again</Button>
      </>
    )
  }
  if (d.configured === false) return <VisitorsSetup d={d} />
  if (!d.ok) {
    return (
      <>
        <h3 className={s.cardTitle}>Visitors</h3>
        <p className={s.inlineNote} role="alert">
          <Icon name="warning" size={18} /> {d.error || 'PostHog did not answer.'} The other numbers on this page come from our own server and are up to date.
        </p>
        <Button size="sm" variant="ghost" onClick={onRetry}>Try again</Button>
      </>
    )
  }
  return (
    <Bars
      ui="chart-visitors"
      title="Visitors"
      series={v.series}
      interval={v.interval || q.interval}
      keys={[{ key: 'visitors', label: 'visitors', color: C1 }]}
      extra={[{ key: 'pageviews', label: 'page views' }]}
      summary={`${num(v.totals.visitors)} visitors, ${num(v.totals.pageviews)} page views.`}
    />
  )
}

function VisitorsSetup({ d }) {
  return (
    <div className={s.setup} data-ui="admin-visitors-setup">
      <h3 className={s.cardTitle}>Visitors are not set up yet</h3>
      <p className={s.body}>Visitor counts come from PostHog, which the site already sends page views to. The server needs a key to read them back:</p>
      <ol className={s.steps}>
        <li>In PostHog, open the project behind the key <span className="a-mono">phc_o34s…</span> and copy its numeric Project ID.</li>
        <li>Create a Personal API key with the scope <strong>Query: Read</strong>, limited to that project.</li>
        <li>In Vercel, in the backend project <span className="a-mono">ofs-sept25</span>, set {(d.missing || []).map((m, i) => <span key={m}>{i ? ' and ' : ''}<span className="a-mono">{m}</span></span>)} for Production, then redeploy.</li>
      </ol>
      <div className={s.setupLinks}>
        {d.links?.vercel_analytics ? <Button size="sm" href={d.links.vercel_analytics} target="_blank" rel="noreferrer" iconAfter="arrow">Vercel Analytics</Button> : null}
        {d.links?.posthog ? <Button size="sm" variant="ghost" href={d.links.posthog} target="_blank" rel="noreferrer" iconAfter="arrow">PostHog</Button> : null}
      </div>
      <p className={s.foot}>Until then, Vercel Analytics counts visitors to the site.</p>
    </div>
  )
}

// ---------------------------------------------------------------- sign-ups
function SignupsCard({ o, long }) {
  const [by, setBy] = useState('method')
  const t = o.signups.totals
  return (
    <Bars
      ui="chart-signups"
      title="Sign-ups"
      action={
        <Segmented
          label="Split sign-ups"
          size="sm"
          value={by}
          onChange={setBy}
          options={[
            { value: 'method', label: 'By method' },
            { value: 'source', label: 'Invited?' },
          ]}
        />
      }
      series={o.signups.series}
      interval={o.interval}
      keys={by === 'method' ? METHOD_KEYS : SOURCE_KEYS}
      summary={`${num(t.profiles)} made a profile in ${long}${t.started != null ? `; ${num(t.started)} started an account` : ''}.`}
    />
  )
}

// ---------------------------------------------------------------- funnel
function FunnelCard({ o, range, long }) {
  const [method, setMethod] = useState('all')
  const [open, setOpen] = useState(false)
  const f = o.funnel
  const hasAuth = f.steps.accounts != null
  const steps = method === 'all' ? f.steps : f.by_method?.[method]
  return (
    <div className={s.stack}>
      <div className={s.cardHead}>
        <h3 className={s.cardTitle}>How far they got</h3>
        {hasAuth ? (
          <Segmented
            label="Sign-up method"
            size="sm"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'all', label: 'All' },
              { value: 'email', label: 'Email' },
              { value: 'google', label: 'Google' },
            ]}
          />
        ) : null}
      </div>
      <p className={s.sub}>Everyone who {hasAuth ? 'started an account' : 'made a profile'} in {long}, and how far each has got since.</p>
      {steps ? <Funnel steps={steps} color={method === 'google' ? C2 : method === 'email' ? C1 : 'var(--a-ink)'} label="Sign-up funnel" /> : null}
      {f.unfinished ? (
        <button type="button" className={s.linkBtn} onClick={() => setOpen(true)} aria-haspopup="dialog" data-ui="admin-unfinished-link">
          {num(f.unfinished)} did not finish
          <Icon name="chevron-right" size={18} />
        </button>
      ) : f.unfinished === 0 ? (
        <p className={s.foot}>Everyone who started an account made a profile.</p>
      ) : (
        <p className={s.foot}>Supabase accounts could not be read, so the funnel starts at profiles.</p>
      )}
      <Unfinished open={open} onClose={() => setOpen(false)} range={range} long={long} />
    </div>
  )
}

// ---------------------------------------------------------------- sign-ins
const SOURCE_NOTE = {
  audit_log: 'From Supabase’s sign-in log: sign-ins, and token refreshes for active members.',
  sessions: 'From Supabase sessions: people who later signed out are not counted.',
}
function SigninsCard({ o, long }) {
  const t = o.signins.totals
  const canActive = t.active != null
  const [mode, setMode] = useState('signins')
  const m = canActive ? mode : 'signins'
  const series = o.signins.series.map((b) => ({ ...b, other: Math.max(0, (b.signins || 0) - (b.email || 0) - (b.google || 0)) }))
  const hasOther = series.some((b) => b.other)
  const a = o.activity
  // the source, then whatever the server adds (sessions, the 90-day cap on All, no auth)
  const notes = [o.sources.signins === 'audit_log' ? SOURCE_NOTE.audit_log : null, o.signins.note || (o.sources.signins === 'sessions' ? SOURCE_NOTE.sessions : null)].filter(Boolean)
  return (
    <div className={s.stack}>
      {t.signins == null ? (
        <>
          <h3 className={s.cardTitle}>Sign-ins</h3>
          <p className={s.inlineNote}>
            <Icon name="info" size={18} /> {o.signins.note || 'Sign-ins could not be read.'}
          </p>
        </>
      ) : (
        <Bars
          ui="chart-signins"
          title="Sign-ins"
          action={
            canActive ? (
              <Segmented
                label="Show"
                size="sm"
                value={m}
                onChange={setMode}
                options={[
                  { value: 'signins', label: 'Sign-ins' },
                  { value: 'active', label: 'Active' },
                ]}
              />
            ) : null
          }
          series={series}
          interval={o.interval}
          keys={m === 'active' ? [{ key: 'active', label: 'active members', color: C1 }] : [{ key: 'email', label: 'email', color: C1 }, { key: 'google', label: 'Google', color: C2 }, ...(hasOther ? [{ key: 'other', label: 'other', color: C3 }] : [])]}
          summary={m === 'active' ? `${num(t.active)} members came back in ${long}.` : `${num(t.signins)} sign-ins by ${num(t.members)} people in ${long}.`}
        />
      )}
      <p className={s.foot}>
        Right now: {num(a.active_24h)} active in the last day, {num(a.active_7d)} this week and {num(a.active_30d)} this month, of {num(a.members)} members.
        {a.last_login_latest ? ` Last seen ${ago(a.last_login_latest)}.` : ''}
      </p>
      {t.signins == null ? null : notes.map((n) => <p key={n} className={s.foot}>{n}</p>)}
    </div>
  )
}

// ---------------------------------------------------------------- referrers
function ReferrersCard({ vis, v, long }) {
  const d = vis.data
  return (
    <div className={s.stack}>
      <h3 className={s.cardTitle}>Where visitors came from</h3>
      {v ? (
        v.referrers.length ? (
          <>
            <Ranked
              label={`Top referrers in ${long}`}
              rows={v.referrers.slice(0, 6).map((r) => ({ key: r.domain, label: r.label, note: r.label !== r.domain && r.domain !== '$direct' ? r.domain : null, value: r.visitors }))}
            />
            {v.utm_sources?.length ? (
              <p className={s.foot}>
                Tagged links: {v.utm_sources.map((u, i) => <span key={u.source}>{i ? ', ' : ''}<span className="a-mono">utm_source={u.source}</span> {num(u.visitors)}</span>)}.
              </p>
            ) : null}
          </>
        ) : (
          <p className={s.sub}>No visitors in {long}.</p>
        )
      ) : (
        <p className={s.sub}>{vis.loading && !d ? 'Counting…' : d?.configured === false ? 'This needs PostHog: see Visitors above.' : 'Not available while visitor numbers are not loading.'}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- newest members
function RecentMembers({ nonce, onAll }) {
  const ref = useRef(null)
  const seen = useSeen(ref)
  const body = membersBody({ q: null, filters: EMPTY_FILTERS, sort: 'joined', order: 'desc', page: 1, pageSize: 5 })
  const r = useResource(seen ? `recent|${nonce}` : null, (signal) => postMembers(body, signal))
  return (
    <div ref={ref} className={s.stack}>
      <h3 className={s.cardTitle}>Newest members</h3>
      {r.error ? (
        <p className={s.inlineNote} role="alert">
          <Icon name="warning" size={18} /> Members did not load.
        </p>
      ) : !r.data ? (
        <Loading label="Loading the newest members">
          {[0, 1, 2].map((i) => <Skeleton key={i} h={44} r={12} style={{ marginBottom: 8 }} />)}
        </Loading>
      ) : r.data.members.length ? (
        <ul className={s.recent}>
          {r.data.members.map((m) => (
            <li key={m.id} className={s.recentRow}>
              <Avatar name={m.display_name || m.username} src={m.avatar_url} size={36} />
              <span className={s.recentText}>
                <span className={s.recentName}>{m.display_name || m.username}</span>
                <span className={s.recentMeta}>Joined {ago(m.joined_at)}</span>
              </span>
              <MethodChip method={m.method} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.sub}>No members yet.</p>
      )}
      <Button variant="ghost" size="sm" onClick={onAll} iconAfter="chevron-right" className={s.allBtn} data-ui="admin-see-all">
        See all members
      </Button>
    </div>
  )
}

