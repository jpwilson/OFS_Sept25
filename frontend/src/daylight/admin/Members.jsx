// The Members tab (owner: ADMIN). docs/app/ADMIN-ANALYTICS.md "Members tab".
// A search (300 ms), a Filters sheet of chip groups with the active ones as removable chips,
// a sort menu and paging. Cards on a phone, a sortable table on desktop. POST /members,
// so the search text never reaches a URL or a log.
import { useEffect, useState } from 'react'
import { useDesktop } from '../lib/capability.js'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { Chip } from '../ui/Chip.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { Field } from '../ui/Field.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Menu } from '../ui/Menu.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Loading, Skeleton } from '../ui/Skeleton.jsx'
import { cx } from '../ui/cx.js'
import { num, postMembers, useDebounced, useResource } from './api.js'
import { EMPTY_FILTERS, FILTERS, SORTS, activeFilters, clearFilter, membersBody, pageLine } from './query.js'
import { ago, dayLabel } from './time.js'
import s from './AdminPage.module.css'

const PAGE_SIZE = 25

export function MethodChip({ method }) {
  if (!method) return null
  const label = { email: 'Email', google: 'Google', legacy: 'Legacy', other: 'Other' }[method] || method
  return (
    <Chip size="sm" wash={method === 'email' ? 'azure' : method === 'google' ? 'fizz' : undefined} className={s.chipNoShrink}>
      {label}
    </Chip>
  )
}

const PLAN = { trial: ['Trial', 'sun'], trial_ended: ['Trial ended', undefined], paid: ['Paid', 'lime'], canceled: ['Canceled', undefined], viewer: ['Viewer', 'violet'], legacy: ['Legacy plan', undefined] }
export function PlanChip({ plan }) {
  if (!plan?.state) return null
  const [label, wash] = PLAN[plan.state] || [plan.state]
  const tier = plan.state === 'paid' && plan.tier && plan.tier !== 'free' ? ` · ${plan.tier[0].toUpperCase()}${plan.tier.slice(1)}` : ''
  const ends = plan.state === 'trial' && plan.trial_ends_at ? ` · ends ${dayLabel(plan.trial_ends_at).replace(/, \d{4}$/, '')}` : ''
  return <Chip size="sm" wash={wash}>{label}{tier}{ends}</Chip>
}

const nameOf = (m) => m.display_name || m.username
const activeLine = (m) => (m.last_active_at ? `Active ${ago(m.last_active_at)}` : 'Not active yet')

export default function Members({ q, onSort }) {
  const desktop = useDesktop()
  const [text, setText] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [sheet, setSheet] = useState(false)
  const [retry, setRetry] = useState(0)
  const search = useDebounced(text, 300)
  useEffect(() => setPage(1), [search])

  const body = membersBody({ q: search, filters, sort: q.sort, order: q.order, page, pageSize: PAGE_SIZE })
  const r = useResource(JSON.stringify({ ...body, retry }), (signal) => postMembers(body, signal))
  const d = r.data
  const chips = activeFilters(filters)
  const setF = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }
  const sortTo = (sort, order) => {
    setPage(1)
    onSort(sort, order)
  }
  const sortLabel = SORTS.find((x) => x.value === q.sort)?.label

  return (
    <section className={s.members} aria-label="Members" data-ui="admin-members">
      <div className={s.membersBar}>
        <Field label="Search members" hideLabel className={s.search}>
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, @username or email" maxLength={200} autoComplete="off" spellCheck={false} enterKeyHint="search" data-ui="admin-search" />
        </Field>
        <div className={s.barButtons}>
          <Button variant="ghost" size="sm" icon="filter" onClick={() => setSheet(true)} aria-haspopup="dialog" data-ui="admin-filters-button">
            Filters{chips.length ? <span className={s.badge}>{chips.length}</span> : null}
          </Button>
          <Menu
            label="Sort members"
            align="end"
            trigger={(props) => (
              <Button {...props} variant="ghost" size="sm" iconAfter={q.order === 'asc' ? 'chevron-up' : 'chevron-down'} data-ui="admin-sort">
                {sortLabel}
              </Button>
            )}
            items={[
              ...SORTS.map((o) => ({ label: o.label, icon: o.value === q.sort ? 'check' : undefined, onClick: () => sortTo(o.value, q.order) })),
              { divider: true },
              { label: q.sort === 'name' ? 'A to Z' : 'Lowest or oldest first', icon: q.order === 'asc' ? 'check' : undefined, onClick: () => sortTo(q.sort, 'asc') },
              { label: q.sort === 'name' ? 'Z to A' : 'Highest or newest first', icon: q.order === 'desc' ? 'check' : undefined, onClick: () => sortTo(q.sort, 'desc') },
            ]}
          />
        </div>
      </div>

      {chips.length ? (
        <div className={s.activeChips} role="group" aria-label="Active filters">
          {chips.map((c) => (
            <Chip key={c.key} size="sm" onRemove={() => setF(clearFilter(filters, c.key))} removeLabel={`Remove the filter ${c.label}`}>
              {c.label}
            </Chip>
          ))}
          {chips.length > 1 ? (
            <button type="button" className={s.clearAll} onClick={() => setF(EMPTY_FILTERS)}>
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}

      <p className={s.countLine} aria-live="polite">
        {d ? `${num(d.total)} ${d.total === 1 ? 'member' : 'members'}${search.trim() ? ' found' : ''}${filters.include_staff ? ', staff included' : ''}` : ' '}
      </p>

      {r.error ? (
        r.error.status === 404 ? (
          <EmptyState icon="info" title="The server has not been updated yet." body="The member list comes from a newer version of the server, which is not live yet." className={s.state} />
        ) : (
          <EmptyState tone="error" icon="warning" title="Members did not load." body={r.error.status === 0 ? r.error.message : 'Try again in a minute.'} action={<Button onClick={() => setRetry((n) => n + 1)}>Try again</Button>} className={s.state} />
        )
      ) : !d ? (
        <Loading label="Loading members" className={s.memberList}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={desktop ? 52 : 132} r={desktop ? 8 : 20} />)}
        </Loading>
      ) : !d.members.length ? (
        <EmptyState
          icon="search"
          title="No members match."
          body={search.trim() || chips.length ? 'Try fewer filters or another search.' : 'Nobody has joined yet.'}
          action={chips.length || search ? <Button variant="ghost" onClick={() => { setText(''); setF(EMPTY_FILTERS) }}>Clear search and filters</Button> : null}
          className={s.state}
        />
      ) : (
        <div className={cx(r.loading && s.stale)} aria-busy={r.loading || undefined}>
          {desktop ? <MemberTable members={d.members} sort={q.sort} order={q.order} onSort={sortTo} /> : <MemberCards members={d.members} />}
          <nav className={s.pager} aria-label="Pages">
            <span className={s.pageLine}>{pageLine(d.page, d.page_size, d.total)}</span>
            <span className={s.pageButtons}>
              <Button variant="ghost" size="sm" icon="chevron-left" disabled={d.page <= 1} onClick={() => setPage(d.page - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" iconAfter="chevron-right" disabled={d.page * d.page_size >= d.total} onClick={() => setPage(d.page + 1)} data-ui="admin-next">Next</Button>
            </span>
          </nav>
        </div>
      )}

      <FilterSheet open={sheet} onClose={() => setSheet(false)} filters={filters} onChange={setF} total={d?.total} />
    </section>
  )
}

function MemberCards({ members }) {
  return (
    <ul className={s.memberList}>
      {members.map((m) => (
        <li key={m.id}>
          <Card pad="sm" className={s.memberCard} data-ui="member-card">
            <div className={s.mHead}>
              <Avatar name={nameOf(m)} src={m.avatar_url} size={40} />
              <span className={s.mName}>
                <span className={s.mDisplay}>{nameOf(m)}</span>
                <span className={s.mUser}>@{m.username}</span>
              </span>
              <MethodChip method={m.method} />
            </div>
            <p className={s.mTimes}>
              Joined {ago(m.joined_at)} · {activeLine(m)}
            </p>
            <div className={s.mChips}>
              <PlanChip plan={m.plan} />
              <Chip size="sm">{m.stories === 1 ? '1 story' : `${num(m.stories)} stories`}</Chip>
              {m.email_confirmed === false ? <Chip size="sm" wash="sun">Email not confirmed</Chip> : null}
              {m.is_superuser ? <Chip size="sm">Staff</Chip> : null}
            </div>
            {m.invited_by ? <p className={s.mInvited}>Invited by {m.invited_by.display_name || `@${m.invited_by.username}`}</p> : null}
          </Card>
        </li>
      ))}
    </ul>
  )
}

const COLS = [
  { key: 'name', label: 'Member', sort: 'name' },
  { key: 'method', label: 'Method' },
  { key: 'joined', label: 'Joined', sort: 'joined' },
  { key: 'active', label: 'Last active', sort: 'last_active' },
  { key: 'signin', label: 'Last sign-in', sort: 'last_sign_in' },
  { key: 'plan', label: 'Plan' },
  { key: 'stories', label: 'Stories', sort: 'stories', num: true },
  { key: 'invited', label: 'Invited by' },
]
function MemberTable({ members, sort, order, onSort }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table} data-ui="member-table">
        <caption className="a-sr">Members, sorted by {SORTS.find((x) => x.value === sort)?.label.toLowerCase()}</caption>
        <thead>
          <tr>
            {COLS.map((c) => {
              const on = c.sort && c.sort === sort
              return (
                <th key={c.key} scope="col" aria-sort={on ? (order === 'asc' ? 'ascending' : 'descending') : undefined} className={cx(c.num && s.numCol)}>
                  {c.sort ? (
                    <button type="button" className={cx(s.thBtn, on && s.thOn)} onClick={() => onSort(c.sort, on ? (order === 'asc' ? 'desc' : 'asc') : c.sort === 'name' ? 'asc' : 'desc')}>
                      {c.label}
                      <Icon name={on && order === 'asc' ? 'chevron-up' : 'chevron-down'} size={16} className={cx(s.thIcon, !on && s.thIconOff)} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                <span className={s.tMember}>
                  <Avatar name={nameOf(m)} src={m.avatar_url} size={32} />
                  <span className={s.mName}>
                    <span className={s.mDisplay}>{nameOf(m)}{m.is_superuser ? <span className={s.staff}> · staff</span> : null}</span>
                    <span className={s.mUser}>@{m.username}</span>
                    <span className={cx(s.mUser, s.tEmail)} title={m.email}>{m.email}</span>
                  </span>
                </span>
              </td>
              <td><MethodChip method={m.method} />{m.email_confirmed === false ? <span className={s.tNote}>not confirmed</span> : null}</td>
              <td title={dayLabel(m.joined_at)}>{ago(m.joined_at)}</td>
              <td>{m.last_active_at ? ago(m.last_active_at) : <span className="a-mute">never</span>}</td>
              <td>{m.last_sign_in_at ? ago(m.last_sign_in_at) : <span className="a-mute">—</span>}</td>
              <td><PlanChip plan={m.plan} /></td>
              <td className={s.numCol} title={m.stories ? `${num(m.published)} published` : undefined}>{num(m.stories)}</td>
              <td>{m.invited_by ? m.invited_by.display_name || `@${m.invited_by.username}` : <span className="a-mute">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FilterSheet({ open, onClose, filters, onChange, total }) {
  const n = activeFilters(filters).length
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter members"
      footer={
        <div className={s.sheetFoot}>
          <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)} disabled={!n}>Clear all</Button>
          <Button onClick={onClose} data-ui="admin-filters-done">{total != null ? `Show ${num(total)}` : 'Done'}</Button>
        </div>
      }
    >
      <div className={s.sheetBody} data-ui="admin-filter-sheet">
        {FILTERS.map((g) => (
          <fieldset key={g.key} className={s.group}>
            <legend className={s.groupLabel}>{g.label}</legend>
            <div className={s.groupChips}>
              {g.options.map(([value, label]) => {
                const on = filters[g.key] === value
                return (
                  <Chip key={String(value)} selected={on} onClick={() => onChange({ [g.key]: on ? EMPTY_FILTERS[g.key] : value })}>
                    {label}
                  </Chip>
                )
              })}
            </div>
          </fieldset>
        ))}
        <fieldset className={s.group}>
          <legend className={s.groupLabel}>Staff</legend>
          <div className={s.groupChips}>
            <Chip selected={!!filters.include_staff} onClick={() => onChange({ include_staff: !filters.include_staff })}>
              Include staff and the demo account
            </Chip>
          </div>
        </fieldset>
      </div>
    </Sheet>
  )
}
