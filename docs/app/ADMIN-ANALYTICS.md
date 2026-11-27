# Admin analytics: decisions and contract (27 November 2026)

## Why

The owner's request: "admin page... users per hour and per day and how many visitors... Posthog... users and their last logins... filters". He posted the site on X and could not tell whether anyone visited, signed up or signed in.

This spec combines two independent plans. Both found the same facts:
- `users.last_login` is already written, at most once an hour, by `_update_last_login` in `backend/app/core/deps.py`. It means "last seen".
- `auth.users.last_sign_in_at` holds only the latest sign-in. Sign-in history is in `auth.audit_log_entries`, or `auth.sessions` as a fallback.
- The PostHog project behind the hard-coded fallback key is shared with another app. Every PostHog query must filter `properties.app = 'ofs'`, which the app and the landing both register, and `properties.$host`.

There are **no schema changes.**

## Two pull requests

| Part | Branch / checkout | Merges |
|---|---|---|
| API | `feat/admin-analytics-api` in `OFS_claude-admin-api` (from `main`) | first, safe alone: nothing calls it yet |
| Page | `feat/admin-analytics-page` in `OFS_claude-admin-page` (from `fix/daylight-short-screens`, PR #15, which has `check-overlap.mjs`) | after the API |

The response shapes below are the contract between them.
- **Page branch:** add `frontend/scripts/daylight/fixtures/admin-contract.json`, listing the keys of every response and nested object, and extend `check-contract.mjs` to compare `daylight/admin/sample.js` against it.
- **API branch:** add the same file, and a test that compares the Pydantic responses against it.
- The two copies must be identical. Add/add with identical content merges cleanly.

## Shared rules

- **Time zone:** `America/Chicago`, from setting `ANALYTICS_TZ`.
  - Data: `public.*` timestamps are naive UTC; `auth.*` timestamps are `timestamptz`.
  - Bucketing: **hour** buckets are cut in UTC with `date_trunc('hour', timezone('UTC', ts))` and labelled in Chicago time with their offset, so the two 1 AM hours of the 1 Nov fall-back stay apart. **Day and month** buckets are cut in Chicago wall time with `date_trunc('<unit>', timezone(:tz, ts))`.
  - Use the function form `timezone(zone, x)`, never `AT TIME ZONE`, so the same SQL text runs in SQLite tests with Python-registered `timezone`, `date_trunc` and `greatest`. Wrap naive `public.*` columns as `timezone('UTC', col)` first.
- **Output times** always carry `Z` or an offset. The new look's `parseBackendDate` reads naive strings as local time.
- **Ranges:**

  | `range` | window | `interval` allowed (default first) |
  |---|---|---|
  | `24h` | floor_hour(now) − 23h … now | hour |
  | `7d` | Chicago midnight − 6 days … now | day, hour |
  | `30d` | Chicago midnight − 29 days … now | day |
  | `90d` | Chicago midnight − 89 days … now | day, month |
  | `all` | first `users.created_at` … now | month, day |

  An interval the range doesn't allow falls back to the default, and the server echoes the interval it used. Every series is zero-filled, and the last bucket carries `partial: true`.
- **Staff:** `include_staff=false` by default, which leaves out `is_superuser` and `is_demo_account` users.
- **Safety:**
  - Every route is superuser-only, set router-wide with `dependencies=[Depends(get_current_superuser)]`, and sends `Cache-Control: no-store`.
  - Each request runs `SET LOCAL statement_timeout = '8s'`.
  - Errors log only `type(e).__name__` and a stage name, never `str(e)`: SQLAlchemy messages include bound parameters such as a searched email. They return a generic detail.
  - Probing the auth schema runs inside a savepoint (`db.begin_nested()`), cached per process for 10 minutes and reported in `sources`. If `auth` can't be read, return nulls, never a 500.
- **Pooler:** the Supabase pooler allows about 5 connections.
  - One page load makes at most 3 requests. `overview` runs its queries one after another on one connection.
  - `visitors` calls `db.close()` before calling PostHog.
  - Results are cached per process for 60 s (PostHog for 5 min). There is no polling.
- **Sign-in history:** `auth.audit_log_entries` (`payload->>'action'` in `login`, `token_refreshed`; `payload->>'actor_id'`; `payload->'traits'->>'provider'`), capped at 90-day ranges because the table has no index on `created_at`. Fallback: `auth.sessions.created_at`, with a note that people who later signed out are not counted.
- **Last active** = `GREATEST(timezone('UTC', users.last_login), auth.users.last_sign_in_at)`. Postgres `GREATEST` ignores NULLs; the SQLite shim must match.
- **Invited** = `users.is_invited_viewer`, or a row in `invited_viewers` with `resulting_user_id` = the member.

## Endpoints (prefix `/api/v1/admin/analytics`)

### `GET /overview?range=7d&interval=day&include_staff=false`

```json
{
  "range": "7d", "interval": "day", "tz": "America/Chicago",
  "start": "2026-11-21T00:00:00-06:00", "end": "2026-11-27T14:05:12-06:00", "generated_at": "2026-11-27T20:05:12Z",
  "sources": { "auth": true, "signins": "audit_log" },
  "signups": {
    "series": [{ "t": "2026-11-21T00:00:00-06:00", "partial": false, "started": 3, "profiles": 2, "email": 1, "google": 1, "other": 0, "invited": 1, "organic": 1 }],
    "totals": { "started": 9, "profiles": 7, "email": 4, "google": 3, "other": 0, "invited": 2, "organic": 5 }
  },
  "funnel": {
    "steps": { "accounts": 9, "confirmed": 8, "profiles": 7, "with_story": 3, "with_published": 2 },
    "by_method": { "email": { "accounts": 5, "confirmed": 4, "profiles": 4, "with_story": 2, "with_published": 1 },
                   "google": { "accounts": 4, "confirmed": 4, "profiles": 3, "with_story": 1, "with_published": 1 } },
    "unfinished": 2
  },
  "signins": {
    "series": [{ "t": "...", "partial": false, "signins": 5, "members": 4, "google": 2, "email": 3, "active": 11 }],
    "totals": { "signins": 31, "members": 18, "active": 40 },
    "note": null
  },
  "activity": { "members": 132, "active_24h": 14, "active_7d": 40, "active_30d": 71, "signed_in_24h": 6, "signed_in_7d": 19,
                "last_login_rows": 120, "last_login_latest": "2026-11-27T19:58:00Z" }
}
```

- **The funnel is a cohort:** accounts created in the range, and how far each has got by now.
- **Sign-ups by method:**
  - `started` counts `auth.users` rows created in the range (excluding `deleted_at`).
  - `profiles` counts `users` rows created in the range.
  - Method comes from `raw_app_meta_data->>'provider'`: `email`, `google`, otherwise `other`. A `users` row with no `auth_user_id` counts as `other` ("legacy").
- **Without the auth schema:** `started`, `email`, `google`, `funnel.steps.accounts` and `funnel.steps.confirmed` are null, and the funnel starts at `profiles`.
- **Sign-ins:** `active` counts distinct actors with `login` or `token_refreshed` events. It is null when the source is sessions.

### `POST /members` (POST, so search text stays out of URLs and logs)

Request body:

```json
{ "q": "smith", "method": "email|google|legacy|null", "source": "invited|organic|null",
  "plan": "trial|trial_ended|paid|canceled|viewer|legacy|null", "activity": "active_7d|quiet_30d|null",
  "stories": "has|none|null", "confirmed": null, "joined": "24h|7d|30d|90d|all", "include_staff": false,
  "sort": "joined|last_active|last_sign_in|stories|name", "order": "desc|asc", "page": 1, "page_size": 25 }
```

- `page_size` is at most 100.
- `q` is lower-cased, with `%` and `_` escaped, and matched against username, email, display_name and full_name.
- An unknown `sort` returns 422.
- The query is a single statement with `count(*) OVER ()`, ordered `NULLS LAST, id DESC`.

Response:

```json
{ "total": 132, "page": 1, "page_size": 25, "sources": { "auth": true },
  "members": [{ "id": 41, "username": "ruth", "display_name": "Ruth", "email": "ruth@example.com", "avatar_url": null,
    "joined_at": "2026-11-27T15:04:00Z", "last_sign_in_at": "2026-11-27T15:04:10Z", "last_active_at": "2026-11-27T19:00:00Z",
    "email_confirmed": true, "method": "google", "invited_by": { "id": 3, "username": "tom", "display_name": "Tom" },
    "plan": { "state": "trial", "tier": "free", "status": "trial", "trial_ends_at": "2026-12-27T15:04:00Z" },
    "stories": 2, "published": 1, "is_superuser": false }] }
```

`plan.state` is one of `viewer` (`invited_viewer_mode`), `paid` (active premium/family), `canceled`, `legacy` (no trial end), `trial` or `trial_ended`.

### `GET /unfinished?range=7d`

This lists Supabase accounts that have no profile, which is where a broken sign-up shows. At most 50, newest first.

```json
{ "available": true, "accounts": [{ "created_at": "...Z", "confirmed": false, "method": "email", "email": "a@b.com" }] }
```

### `GET /visitors?range=7d&interval=day&include_staff=false`

- **Not configured** (either setting empty): no HTTP call.
  ```json
  { "configured": false, "missing": ["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"], "links": { "posthog": "https://us.posthog.com", "vercel_analytics": "https://vercel.com/jpwilsons-projects/ofs-sept25-frontend/analytics" } }
  ```
- **PostHog failed** (timeout, 401, 429, other): still HTTP 200.
  ```json
  { "configured": true, "ok": false, "error": "PostHog did not answer (timeout)" }
  ```
- **Success:**
  ```json
  { "configured": true, "ok": true, "interval": "day", "cached_at": "...Z",
    "series": [{ "t": "2026-11-26T00:00:00-06:00", "partial": false, "visitors": 120, "pageviews": 410 }],
    "totals": { "visitors": 390, "pageviews": 1200, "landing_cta": 44, "signed_up": 7 },
    "referrers": [{ "domain": "t.co", "label": "X (Twitter)", "visitors": 210 }],
    "utm_sources": [{ "source": "x", "visitors": 30 }] }
  ```

**How it calls PostHog:**
- Request: `POST {POSTHOG_API_HOST}/api/projects/{POSTHOG_PROJECT_ID}/query/`, header `Authorization: Bearer <key>`, body `{"query": {"kind": "HogQLQuery", "query": ..., "values": {...}}}`. Timeout 10 s, with a 5-minute cache per (range, interval, staff).
- Shared filter: `event='$pageview' AND properties.app='ofs' AND properties.$host IN ('ourfamilysocials.com','www.ourfamilysocials.com')` and the time window.
- Staff are excluded by `person_id NOT IN (SELECT person_id FROM person_distinct_ids WHERE distinct_id IN {staff})`, with `staff` being `user_<id>` values passed in `values`, never formatted into the string.
- Referrers come from `properties.$referring_domain`, excluding the site itself. Labels are mapped in Python: `t.co`/`x.com`/`twitter.com` → "X (Twitter)", `$direct` → "Direct", plus Facebook and Gmail.

## API files

- `backend/app/core/config.py`: add `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_API_HOST="https://us.posthog.com"` and `ANALYTICS_TZ="America/Chicago"`.
- `backend/requirements.txt`: add `tzdata` (pinned).
- `backend/app/services/analytics_time.py`: pure functions `resolve_window(range, interval, now)`, `fill()` and `label()`.
- `backend/app/services/analytics_sql.py`: SQL builders. Intervals and the time zone come from whitelists; values are bound.
- `backend/app/services/posthog_query.py`: built on `requests`.
- `backend/app/schemas/admin_analytics.py`: Pydantic models.
- `backend/app/api/admin_analytics.py`, registered in `backend/app/main.py`.
- `backend/app/core/deps.py`: make `_update_last_login` a conditional `UPDATE ... WHERE id=:id AND (last_login IS NULL OR last_login < :cutoff)`, so parallel requests write once. Keep the one-hour throttle, and never log the user.
- `backend/app/api/admin.py`: add `'last_login'` to `safe_sort_columns`.

### Tests (unittest, in-memory SQLite, in the style of `backend/tests/`)

- **Test database:** `ATTACH DATABASE ':memory:' AS auth` with minimal `auth.users`, `auth.sessions` and `auth.audit_log_entries` tables. Register Python `timezone`, `date_trunc` and `greatest` with Postgres semantics.
- **Windows:** every preset; the 1 Nov fall-back (169 hourly buckets over 7 days, two 1 AM labels); spring-forward; 00:30 Chicago landing on the right day.
- **Numbers:** sign-ups, funnel, sign-ins (audit log, then the sessions fallback), activity, staff exclusion, and `auth` missing (nulls, HTTP 200).
- **Members:** every filter, every sort with NULLS LAST, paging, the total, `%` escaping, unknown sort → 422.
- **Access:** 403 for a member, 200 for a superuser, `no-store`. A forced DB error must leave no email or search text in captured stdout.
- **PostHog** (`requests.post` mocked): not configured → no call; timeout, 401 and 429 → `ok:false`; the `app` and `$host` filters are present; `values` are bound; the DB is closed before the HTTP call; the cache works.
- **Throttle:** two calls within an hour make one write.
- **Contract:** responses match `admin-contract.json`.
- **Optional:** `tests/test_admin_analytics_pg.py`, skipped unless `ANALYTICS_PG_URL` is set, and refusing any URL that contains `supabase`.

## Page (`frontend/src/daylight/admin/`, a new Daylight page behind a 13th seam)

### Seam and tabs

- **Seam:** in `scripts/daylight/vite-seam.mjs`, add `'./pages/AdminDashboard': 'AdminDashboard.jsx'` to `SEAMS`, changing "twelve" to "thirteen" in the comment. Add `src/daylight/seam/AdminDashboard.jsx` in the pattern of `seam/Feed.jsx`:
  - the classic look gets `<ClassicPage>` around the lazy classic dashboard;
  - otherwise it renders `<DaylightPage pkg="admin" name="Admin"><AdminPage/></DaylightPage>`.

  Add `'admin'` to `ONLY_PACKAGES` in `src/daylight/dev/only.js`.
- **Tabs:**
  - **Overview** (the default) and **Members**.
  - **Tools** renders the classic dashboard lazily, keeping the stats, demo password, AI model and links to Users, Events and Feedback.
  - **Classic page links:** classic admin routes (`/admin/users`, and so on) are unchanged.

### State and loading

- URL state: `?range=7d&interval=day&tab=members&sort=last_active`. Search text never goes in the URL. The last range is kept in `localStorage`.
- Data goes through `apiFetch` in `../lib/http.js`, with an `AbortController` per request and no `useCallback` chains.
- On load, `overview` and `visitors` are fetched in parallel. `members` is fetched only when its tab or the "Recent members" card is shown.
- A refresh button and "as of 2:05 pm CT"; one refetch when the tab becomes visible after more than 5 minutes.
- If `overview` returns 404, show "The server has not been updated yet".

### Phone layout (393×680 visible)

1. Title row with refresh.
2. Range `Segmented` (24h · 7d · 30d · 90d · All), then an interval `Segmented` showing only the allowed intervals.
3. 2×2 `Readout` tiles: Visitors · Sign-ups · Sign-ins · Active members.
4. **Visitors** chart, above the fold.
5. **Sign-ups** chart, stacked, with a toggle: by method, or invited vs organic.
6. One line, for example "7 of 390 visitors signed up (1.8%)".
7. **Funnel**, with an Email | Google switch and a "2 did not finish" link that opens a `Sheet` listing the unfinished accounts.
8. **Sign-ins** chart (Sign-ins | Active members), with a footnote naming the source.
9. Top referrers, with t.co shown as X.
10. Recent members (5) and a "See all members" link.

Nothing on this page is `position: sticky`.

### Members tab

- A search `Field`, debounced by 300 ms.
- A Filters button that opens a `Sheet` of `Chip` groups. Active filters show as removable chips.
- **On phones**, each member is a card: name and @username, method chip, "Joined 2h ago", "Active 20m ago", plan chip, number of stories, "Invited by Tom".
- **On desktop**, a sortable `<table>` (`aria-sort`).
- A sort menu and paging: "1–25 of 132 · Next".

### Desktop layout (900px and wider)

A wrap of at most 1120px. Range controls on the right of the header, tiles 4 across, and a 2-column card grid.

### Charts

Hand-written SVG; no chart library may be added.

- **`charts/Bars.jsx`:**
  - Bars use `viewBox` with `preserveAspectRatio="none"`. All text is HTML outside the SVG.
  - Axis labels: the y-axis shows its maximum and baseline; the x-axis labels only the first, middle and last buckets.
  - A partial bucket is drawn at 50% opacity, labelled "so far".
  - Selecting a bar (tap, hover or arrow keys over transparent hit columns) writes a readout line **above** the chart, never a floating tooltip.
  - Accessibility: `<figure>`, `<figcaption>`, and a "Show as table" `<details>`.
- **`charts/Funnel.jsx` and `charts/Ranked.jsx`:** HTML bars.
- **Scales:** visitors and sign-ups get separate charts, never a dual axis.
- **Colours** (checked against white):
  - series 1: `--a-azure-deep` (email, or organic);
  - series 2: `--a-fizz-deep` (Google, or invited);
  - other and legacy: `--a-line-strong`;
  - text: `--a-ink` and `--a-mute`;
  - do not use `--a-zest-deep` (2.89:1).
- **Not configured visitors:** setup steps for the owner and a link to Vercel Analytics.

### Times

`admin/time.js` formats with `Intl.DateTimeFormat('en-US', {timeZone: 'America/Chicago'})`, and `time.test.js` tests it. The client never re-buckets.

### Sample mode

`admin/sample.js` answers these routes deterministically from the sample data:
- the four analytics routes;
- `/admin/stats`, `/admin/demo-account` and `/admin/settings/ai-model`, for the Tools tab;
- a `fixturePage` `/__fx/admin-posthog?on=0|1` that switches visitors between "configured" and "set up".

### Checks

- `VITE_APP_LOOK=daylight npm run build`.
- `check-bundle.mjs`: the admin package must not import `daylight/map/` or `maplibre-gl`.
- `build-sample.mjs`, then `check-contract.mjs`, extended with `admin-contract.json`.
- `check-overlap.mjs`, with new scenes `admin`, `admin-chart-selected`, `admin-members`, `admin-filters`, `admin-unfinished`, `admin-tools` and `admin-visitors-setup`, at every viewport and with `--notch`.
- A production build: `VERCEL_ENV=production`.

## What the owner configures (after both merge)

1. **PostHog:**
   - In the project behind key `phc_o34s…`, copy the numeric Project ID.
   - Create a Personal API key with scope **Query: Read**, limited to that project.
2. **Vercel, backend project `ofs-sept25`:** set `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` (Production; never a `VITE_` name), then redeploy.
3. **Supabase:** if `auth.audit_log_entries` has no recent `login` rows, the page uses sessions and says so.
4. **X:** links with `?utm_source=x&utm_campaign=<post>` show up by name.

## Later, separately

PostHog may drop the first page view of a visit that boots the app, because `PostHogPageTracker`'s effect runs before the provider's init. Check this in PostHog's live events. If it's real, fix it in a small PR of its own.
