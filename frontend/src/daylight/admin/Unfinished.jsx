// Accounts that never made a profile (owner: ADMIN): where a broken sign-up shows. A Sheet
// opened from the funnel's "N did not finish"; fetched only when it opens. At most 50,
// newest first.
import { Sheet } from '../ui/Sheet.jsx'
import { Chip } from '../ui/Chip.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Loading, Skeleton } from '../ui/Skeleton.jsx'
import { getUnfinished, useResource } from './api.js'
import { stamp, ago } from './time.js'
import { MethodChip } from './Members.jsx'
import s from './AdminPage.module.css'

export default function Unfinished({ open, onClose, range, long }) {
  const r = useResource(open ? `unfinished|${range}` : null, (signal) => getUnfinished({ range }, signal))
  const d = r.data
  return (
    <Sheet open={open} onClose={onClose} title="Did not finish signing up">
      <div className={s.sheetBody} data-ui="admin-unfinished">
        <p className={s.sub}>Accounts started in {long} with no profile yet. An unconfirmed email usually means the confirmation email was not opened; a confirmed one that stopped here may have hit a problem.</p>
        {r.error ? (
          <p className={s.inlineNote} role="alert">
            <Icon name="warning" size={18} /> The list did not load.
          </p>
        ) : !d ? (
          <Loading label="Loading the accounts">
            {[0, 1, 2].map((i) => <Skeleton key={i} h={64} r={14} style={{ marginBottom: 8 }} />)}
          </Loading>
        ) : !d.available ? (
          <p className={s.inlineNote}>
            <Icon name="info" size={18} /> Supabase accounts could not be read, so this list is not available.
          </p>
        ) : d.accounts.length ? (
          <ul className={s.unfinished}>
            {d.accounts.map((a) => (
              <li key={`${a.email}-${a.created_at}`} className={s.unRow}>
                <span className={s.unEmail}>{a.email}</span>
                <span className={s.unMeta}>
                  Started {stamp(a.created_at)} ({ago(a.created_at)})
                </span>
                <span className={s.unChips}>
                  <MethodChip method={a.method} />
                  <Chip size="sm" wash={a.confirmed ? 'lime' : 'sun'}>{a.confirmed ? 'Email confirmed' : 'Not confirmed'}</Chip>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.sub}>Nobody in {long}.</p>
        )}
      </div>
    </Sheet>
  )
}
