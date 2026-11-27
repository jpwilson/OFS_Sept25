# Family tree: notes, history and birthdays (decisions, 27 November 2026)

The owner asked: "Anyone that's part of that family tree should be able to add comments and history to each person so give them better attributes." He approved one database migration on 27 Nov 2026.

This record merges two independent plans. Where they disagreed, the director's choice is marked **(decision)**. It supersedes `FAMILY.md` §10.

## Release order (the hard rule)

1. The owner pastes the upgrade SQL into the Supabase SQL editor. This session cannot reach production.
2. Then the **server PR** merges.
3. Then the **page PR** merges.

The order matters because the models carry new `tag_profiles` columns. Code that reaches production before the SQL makes every tag query fail with a 500. The schema change only adds things, so today's code keeps working once the SQL is in.

## Schema: one Alembic revision, `down_revision = '1b7097086e16'` (the only head on `main`)

Create the file with `alembic revision -m family_notes_and_birthdays`, with no autogenerate, and write the body by hand. Update the models in the same commit.

### `family_notes` (new)

**Columns:**

| Column | Type and rule |
|---|---|
| `id` | SERIAL PRIMARY KEY |
| `subject_user_id` | INTEGER NULL REFERENCES users(id) ON DELETE CASCADE |
| `subject_tag_profile_id` | INTEGER NULL REFERENCES tag_profiles(id) ON DELETE CASCADE |
| `author_id` | INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE. **(decision)** An author's words go when their account goes. |
| `kind` | VARCHAR(10) NOT NULL |
| `body` | TEXT NOT NULL |
| `happened_on` | DATE NULL |
| `happened_precision` | VARCHAR(5) NULL |
| `created_at` | TIMESTAMP NOT NULL (naive UTC, `datetime.utcnow`, as elsewhere) |
| `edited_at` | TIMESTAMP NULL |

**CHECK constraints.** Each must work in both SQLite and Postgres, and the model's `__table_args__` repeats them with the same names.

| Name | Condition |
|---|---|
| `family_notes_one_subject` | `(subject_user_id IS NULL) <> (subject_tag_profile_id IS NULL)` |
| `family_notes_kind_check` | `kind IN ('note','history')` |
| `family_notes_body_length` | `length(body) BETWEEN 1 AND 4000` |
| `family_notes_precision_check` | `happened_precision IS NULL OR happened_precision IN ('day','month','year')` |
| `family_notes_date_pair` | `(happened_on IS NULL) = (happened_precision IS NULL)` |
| `family_notes_note_undated` | `kind = 'history' OR happened_on IS NULL` |

**Indexes:**
- `ix_family_notes_subject_user (subject_user_id, kind)`
- `ix_family_notes_subject_tag (subject_tag_profile_id, kind)`
- `ix_family_notes_author_id (author_id)`

**Deletes are real (decision).** There is no `is_deleted` column.

### `member_details` (new; one row per member, created on first save)

**(decision)** Birthdays live here, not on `users`. Three reasons:
- RLS on the new table is certain.
- The February policies on `users` aren't in the repo, so their effect on a new `users` column is unknown.
- `get_current_user` loads `users` on every request, so a model–database mismatch there would break everything.

Columns:

| Column | Type and rule |
|---|---|
| `user_id` | INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE (`autoincrement=False`) |
| `birth_date` | DATE NULL |
| `birthplace` | VARCHAR(120) NULL |
| `birth_date_visibility` | VARCHAR(10) NOT NULL, server default `'relatives'` |
| `updated_at` | TIMESTAMP NOT NULL |

- CHECK `member_details_visibility_check`: `birth_date_visibility IN ('relatives','only_me')`. There is no "public" option.
- The visibility setting covers both the birth date and the birthplace.
- No `notes_seen_at` column for now (no speculative columns).

### `tag_profiles` (four new columns)

- `birth_date_precision VARCHAR(5) NULL`. NULL means an exact day, so existing rows don't change. **(decision)** Families often know only the year a grandparent was born.
- `birthplace VARCHAR(120) NULL`
- `died_on DATE NULL`
- `died_on_precision VARCHAR(5) NULL`
- CHECK `tag_profiles_birth_date_precision_check`: `birth_date_precision IS NULL OR (birth_date IS NOT NULL AND birth_date_precision IN ('day','month','year'))`
- CHECK `tag_profiles_died_on_precision_check`: `(died_on IS NULL AND died_on_precision IS NULL) OR (died_on IS NOT NULL AND died_on_precision IN ('day','month','year'))`

### Postgres-only statements (`op.execute`, when `op.get_context().dialect.name == 'postgresql'`)

- `SET LOCAL lock_timeout = '5s'` at the start, so the migration fails rather than queues behind writes to `users`.
- `ALTER TABLE public.family_notes ENABLE ROW LEVEL SECURITY;` and the same for `public.member_details`.
- In a `DO $$ ... $$` block guarded by `IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')`, and separately for `authenticated`:
  - `REVOKE ALL ON TABLE public.family_notes, public.member_details FROM <role>;`
  - `REVOKE ALL ON SEQUENCE public.family_notes_id_seq FROM <role>;`
- No policies and no FORCE: the backend connects as the table owner.

### `downgrade()`

Run in reverse order:
1. Drop the two tag CHECKs and the four tag columns.
2. Drop `member_details`.
3. Drop the three indexes, then `family_notes`.

### Models

- New: `backend/app/models/family_note.py` (`FamilyNote`) and `backend/app/models/member_details.py` (`MemberDetails`). Register both in `app/models/__init__.py`, and check that `alembic/env.py` sees them.
- `tag_profile.py` gains the four columns and both `CheckConstraint`s.
- `User` gains **no** relationship, so existing loads don't change.

### SQL hand-off (committed beside `backend/migrations/security_lock_down_new_tables.sql`)

No database is contacted. Use the range forms below; a bare `head` replays every migration.

```bash
cd backend
DATABASE_URL='postgresql://offline@localhost/offline' <venv>/bin/alembic upgrade 1b7097086e16:<rev> --sql > migrations/family_notes_and_birthdays.upgrade.sql
DATABASE_URL='postgresql://offline@localhost/offline' <venv>/bin/alembic downgrade <rev>:1b7097086e16 --sql > migrations/family_notes_and_birthdays.downgrade.sql
```

Each file must be a single `BEGIN … COMMIT` that includes the `alembic_version` update. Add a short comment header saying "NOT APPLIED AUTOMATICALLY; paste into the Supabase SQL editor; see docs/app/FAMILY-NOTES.md".

## Who may read and write (`backend/app/utils/family.py`, new)

**Family of member P, for viewer v:**
- `v == P`, or
- one accepted `user_relationships` row with `user_a_id = min(v,P)` and `user_b_id = max(v,P)` (the pair is ordered in Python).

Every accepted relationship word counts, including "friend". **(decision)** Anyone on your tree counts as family here.

**Family of tag T:** T's creator, users linked through `tag_profile_relationships` (approved links only; pending requests don't count), and the creator's accepted relatives.
- One query returns the tag row and the verdict together (`exists()` subqueries).
- A merged tag resolves to its `merged_user_id`, and the member rule applies.
- A missing tag answers 404.

**Rules:**

| Action | Who |
|---|---|
| Read | Family of P. Others get 403 "Only {name}'s family can see notes about {name}." |
| Create | Family of P, through `require_not_demo`. Rate limit: 30 per 10 minutes per user (the existing in-memory `SlidingWindowLimiter`), then 429. |
| Edit | The author only, while still family of P, through `require_not_demo`. |
| Delete | The author (even after losing access), or P if P is a member, or T's creator if P is a tag; through `require_not_demo`. A note you cannot see answers 404. |
| Claim | `approve_claim` moves the tag's notes to the claimant in the same transaction: `subject_user_id = claimant`, `subject_tag_profile_id = NULL`. From then on the member rule applies. |
| Tag deletion | `delete_tag_profile` deletes the tag's notes explicitly first, because SQLite tests don't enforce foreign keys. |

**Connections:** the pool is NullPool, so each HTTP request holds one connection. GET runs about four small indexed statements: resolve the subject and verdict, then two pages with an outer join to the author. There is no N+1 and no count query.

**Text:**
- Clean the body before checking its length:
  - CRLF becomes LF;
  - strip control characters except `\n` and `\t`, and strip the bidi override and isolate characters U+202A–202E and U+2066–2069; keep zero-width joiners, which emoji use;
  - trim, and collapse three or more newlines to two.
- Then require 1 to 4000 characters.
- Store the text as written: never HTML-escape it, never render it as HTML.

**Dates:**
- A note with a date returns 422 ("Only history entries have a date"). So does a precision without a date.
- A date without a precision means a full day.
- Store normalised: month precision as YYYY-MM-01, year precision as YYYY-01-01.
- The date must fall between 1000-01-01 and today + 1 day.

## Endpoints (prefix `/api/v1`)

Schemas live in `backend/app/schemas/family_note.py`, using plain `field: type` lines so `frontend/src/daylight/family/sample.test.js` can parse them. **Field order is part of the contract.**

**`FamilyNoteAuthor`:** `id, username, display_name, avatar_url`

**`FamilyNoteResponse`:** `id, subject_user_id, subject_tag_profile_id, kind, body, happened_on, happened_precision, author, created_at, edited_at, can_edit, can_delete`

**`FamilyNotePage`:** `items, has_more` (fetch `limit + 1` rows)

**`FamilyNotesResponse`:** `subject_user_id, subject_tag_profile_id, can_write, history, notes`
- With no `kind`, both pages are filled. With `kind`, only that page is filled and the other is null.
- `can_write` is false for demo accounts.

### Routes

- **`GET /family-notes`**: `?user_id=` or `?tag_profile_id=` (exactly one, otherwise 422), `[&kind=note|history] [&skip=0] [&limit=10]`. `limit` runs from 1 to 50; above that returns 422.
  - Notes order: `created_at DESC, id DESC`.
  - History order: `(happened_on IS NULL), happened_on ASC, created_at ASC, id ASC`. Undated entries come last.
- **`POST /family-notes`**: `{user_id? | tag_profile_id?, kind: "note"|"history" = "note", body, happened_on?: "YYYY-MM-DD", happened_precision?: "day"|"month"|"year"}`. Returns 201 with a `FamilyNoteResponse`.
- **`PATCH /family-notes/{id}`**: `{kind?, body?, happened_on?, happened_precision?}`. Applies only the fields sent; null clears the date and its precision together. The rules are checked on the merged result. Sets `edited_at`.
- **`DELETE /family-notes/{id}`**: returns `{"message": "Note deleted"}`.
- **`PUT /users/me/family-details`** (`require_not_demo`): `{birth_date?, birthplace?, birth_date_visibility?: "relatives"|"only_me"}`.
  - Applies only the fields sent; null clears. Creates the row if missing.
  - `birth_date` must fall between 1900-01-01 and today. `birthplace` is one line of at most 120 characters. `"public"` returns 422.
  - Returns `{birth_date, birthplace, birth_date_visibility}`.
  - Never log the values. `PUT /users/me/profile` prints its inputs, which is why this is a separate route.

### Changes to existing routes

- **`GET /users/me`** gains `birth_date, birthplace, birth_date_visibility`, with `'relatives'` when there is no row. One primary-key lookup. `birthOf(me)` in `arrange.js` already reads `birth_date`.
- **`RelationshipResponse`** gains `other_user_birth_date: Optional[date] = None` and `other_user_birthplace: Optional[str] = None`, **appended at the end**.
  - They are filled only when the relationship is `accepted` and the other person's visibility is `'relatives'`. Propose and pending `/with/{id}` return null.
  - Build every response through one helper. `GET /relationships` loads the other users and their details with two IN queries, which replaces today's one query per row.
- **`TagProfileBase`** gains `birth_date_precision, birthplace, died_on, died_on_precision`, **immediately after `birth_date`**.
  - Create, `/mine`, get and update all pass them through.
  - `GET /tag-profiles/{id}` hides the birth date, its precision, the birthplace and the died-on fields behind the existing `can_see_birth_date`. Don't widen it.
- **`PUT /tag-profiles/{id}`** applies only the fields sent (`model_dump(exclude_unset=True)`).
  - An explicit null clears `birth_date` with its precision, `birthplace`, `died_on` with its precision, `photo_url` and `relationship_to_creator`.
  - `name: null` returns 422.
  - A death before the birth returns 422.
  - Note: the classic `TagProfilePage.jsx` already sends nulls for emptied fields. Today they are silently ignored; now they will clear, as its users intended.

## Server tests (in-memory SQLite, in the style of `backend/tests/`)

**`test_family_notes.py`:**
- **Members:** P, an accepted relative and a friend can read and write. Pending, rejected, a relative's relative and a stranger get 403.
- **Tags:** the creator, a linked user and the creator's relative are allowed. A linked user's relative, a pending link and a stranger get 403. A merged tag resolves to its user.
- **Demo:** GET returns 200 with `can_write` false. POST, PATCH and DELETE return 403.
- **Edit:** the author only. An author who lost access gets 403.
- **Delete:** the author (also after losing access), the subject and the tag's creator are allowed. Another relative gets 403. A stranger gets 404.
- **Dates:** normalisation, and every 422.
- **Order and paging:** `has_more`, and `limit=51` returns 422.
- **Text:** cleaning; `<b>` round-trips as literal text; whitespace-only and 4001 characters return 422.
- **Claim:** notes move, and the readers change.
- **Tag delete:** removes the tag's notes.
- **Rate limit:** the 31st POST returns 429.

**`test_family_details.py`:**
- Birthdays appear in relationships for `relatives` and stay hidden for `only_me`; null on propose and on pending.
- `/users/me` returns them.
- PUT sets, clears and keeps; `"public"` and future dates return 422; demo gets 403.
- `/users/{username}` and search contain no birth keys.
- Tag PUT applies only the fields sent; the died-before-born and `name: null` 422s; the new tag fields are gated.

**`test_family_notes_migration.py`:**
- There is a single head, and its `down_revision` is `1b7097086e16`.
- Offline upgrade and downgrade SQL compile, with `DATABASE_URL` patched to a `postgresql://` placeholder. The SQL contains every CREATE and CHECK name, the indexes, RLS, the REVOKEs and the `alembic_version` updates.
- **Drift guard:** the generated text equals the committed `.sql` files.
- **Optional:** run on real Postgres only when `FAMILY_PG_URL` is set, refusing any URL containing `supabase`: upgrade, `compare_metadata` (no diff), downgrade.

## Page (`frontend/src/daylight/family/`)

Built on `feat/family-tree` with the server branch merged in, because `sample.test.js` reads the server's schemas.

### New files

- **`dates.js`** (pure, with `dates.test.js`):
  - `partialLabel(ymd, precision)` returns "March 3, 1952", "March 1952" or "1952".
  - `toPartial` and `fromPartial`.
  - `audienceLine(p, you)`. It never uses gendered words:
    - for a member: "Ruth, and Ruth's family on Our Family Socials, can read this."
    - for you: "You and your family on Our Family Socials can read this."
    - for a tag: "You, your family, and anyone linked to Ivy can read this."
- **`PartialDate.jsx`**: Month select, Day select (enabled once a month is chosen) and a Year input (`inputmode=numeric`). The precision follows from what is filled in. It must fit a 345px width.
- **`useNotes.js`**: a per-subject store, like `useFamily.js`. Data is stale after 60 s. A 404 on the list route means the server isn't updated yet, and the section stays hidden.
- **`Notes.jsx`**: the "Notes and history" block (`data-ui="person-notes"`) after Stories.
  - It loads once Stories has settled and the block is near view.
  - A History | Notes switch shows counts.
  - **History items:** a mono date column ("MAR 1952", "UNDATED") and the body.
  - **Note items:** the author's face, name and date, plus "Edited" when edited.
  - **Bodies:** `white-space: pre-line`, clamped with "Read more". Never `dangerouslySetInnerHTML`.
  - **Item menu:** Edit and Delete, shown by `can_edit` and `can_delete`.
  - **Delete dialog:** "Delete this note?" / "It goes for everyone in Ruth's family."
  - "Show more" pages through.
  - **States:**
    - Loading: skeletons.
    - Error: "Notes did not load." with Try again.
    - 403: a neutral line.
    - Empty: "Nothing written about Ruth yet. Add a memory, or something that happened and when."
  - No block for people you have only asked.
- **`NoteComposer.jsx`**: the sheet's mode `'write'`, which replaces the sheet body as edit and link do. Contents:
  - a Note | History switch;
  - a textarea of 5 rows, max 4000, with a counter after 3600;
  - for history, a `PartialDate` ("A year is enough");
  - the audience line;
  - Save and Cancel, with the server's words on error.
  - Hidden when `canWrite` or `can_write` is false.
- **`BirthdayForm.jsx`**: the sheet's mode `'birthday'`, opened from your own sheet.
  - Fields: Birthday, Birthplace, and "Who sees it": Your family | Only you.
  - Hint: "Never public. Brothers and sisters stand in age order when birthdays are known."
  - Remove sends nulls.
  - On save, call `useAuth().updateUser(...)` so the tree re-sorts at once. **(decision)** This is where members set their own birthday: the new look has no settings page yet.
- `Notes.module.css`.

### Edits to existing files

- **`PersonSheet.jsx`**:
  - `<Notes>` goes in the marked slot.
  - Add the modes `'write'` and `'birthday'`.
  - Details shows "Born March 3, 1952 in Cork." and, for tags, "Died 2019." using the precision.
  - Your own sheet shows "Add your birthday" or "Change your birthday".
- **`TagForm.jsx`**:
  - The birthday becomes a `PartialDate`.
  - Birthplace and Died go under "More about {first}".
  - Fields can be cleared.
- **`useFamily.js`**: `createTag` and `updateTag` send the new fields (explicit null clears). Add `saveBirthday`.
- **`sample.js`, `fixtures.js`, `sample.test.js`**:
  - **Routes:** answers for every new route, under the same permission rules (403, 404, 422 and demo texts as the server's), ordering and `has_more`. Also the PUT that applies only the fields sent, and the `/users/me` birth keys.
  - **Seed data:**
    - Birthdays that visibly reorder siblings, plus one `only_me` sibling.
    - Ruth's history: 1952 born in Cork (year), June 1974 married (month), one undated entry.
    - Notes by Tom and by Kate.
    - One note on Biscuit.
    - Someone with none.
  - **Sets:** `notes-many` for paging and `notes-error`.
  - **`SCHEMA_KEYS`** updated in order.
- **`arrange.test.js`**: members with `other_user_birth_date` sort by age; an `only_me` sibling falls back to name order.
- **`frontend/scripts/daylight/check-overlap.mjs`**, new scenes:
  - `family-notes` (Ruth)
  - `family-notes-empty`
  - `family-notes-error` (via `page.route` 500, not a set switch)
  - `family-note-write` (History, a year only, a long body, not submitted)
  - `family-note-menu`
  - `family-note-delete`
  - `family-notes-demo`
  - `family-you-birthday`
  - `family-tag-edit` (with "More about" open)

  Run them at every viewport, including 393×680, and with `--notch`.
- **`docs/app/FAMILY.md`**: mark §10 as superseded by this file.

## Owner steps (Supabase → SQL editor)

1. **Before.** Run `SELECT version_num FROM alembic_version;`. It must return `1b7097086e16`.
2. **Apply.** Paste the whole `backend/migrations/family_notes_and_birthdays.upgrade.sql` and press Run once. If it stops on a lock timeout, nothing was applied; run it again.
3. **After.** Run these checks:
   - The version is now `<rev>`.
   - Both new tables have `relrowsecurity` true.
   - `has_table_privilege` is false for `anon` and `authenticated` on both new tables.
   - `tag_profiles` has the 4 new columns.
   - `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity;` returns no rows.
4. **Merge** the server PR, then the page PR. Then check on the iPhone: write a history entry with only a year, edit it, delete it, and add your own birthday.
5. **Rollback.**
   1. Revert the code merges first.
   2. Export the two tables as CSV if you want to keep the data.
   3. Paste the downgrade file.
   4. Check that the version is back to `1b7097086e16`.

## Tell the owner

- **A note shows its author's name.** Reading notes about Ruth reveals who in Ruth's family wrote them.
- **When a tagged person joins and claims their tag,** the notes move to their account, and from then on their family reads them.
- **Deleting an account removes that member's notes.**
