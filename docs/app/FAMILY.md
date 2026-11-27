# The family tree page (Daylight): decisions, 26 November 2026

The owner: "one of the next to-dos is for you to make a much better family tree than that one." He liked the tree drawn on the landing page (`frontend/src/landing/proof/FamilyTree.jsx`, screenshots in `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude/frontend/shots/proof5-tree/`) and wants the app's `/family-tree` to look and feel like it, for any real family, on phone, iPad and desktop.

Two planners studied the code and data independently and agreed on everything below except where a choice is noted. This file is the spec. Rules from `docs/app/SPEC.md` and `docs/app/handover/FOUNDATION.md` still apply (front end only, classic build byte-identical, phone first, light only, voice rule in `docs/landing/ROUND4.md` section 1).

## 1. What the data can and cannot say

- `GET /relationships` (`backend/app/api/relationships.py:270-315`) returns only **your** confirmed relationships, each as one row: `id, other_user_id, other_user_username, other_user_display_name, other_user_avatar_url, my_relationship_to_them, their_relationship_to_me, status, proposed_by_me, created_at, accepted_at` (`backend/app/schemas/user_relationship.py:34-46`). Labels are relative to you: `my_relationship_to_them: "mother-in-law"` means "Ruth is my mother-in-law". Each person's own word is stored; nothing is computed.
- Also: `/relationships/pending` (requests to you: `they_call_me`, `i_would_call_them`), `/relationships/sent` (yours: `i_call_them`, `they_would_call_me`), `/relationships/pending/count`, `/relationships/with/{id}`, `POST /relationships/propose` (you must follow each other; both words must be in the types list), `POST /{id}/accept`, `POST /{id}/reject`, `DELETE /{id}` (either person, any status: removes a confirmed relationship or withdraws a sent request). **No route edits a label.** Every write refuses demo accounts. `/users/me/notification-counts` does not count relationship requests, so the tree page must read `/relationships/pending` itself.
- `GET /relationships/types` returns 35 words: wife, husband; daughter, son, child; mother, father, parent; sister, brother, sibling; grandmother, grandfather, grandparent; granddaughter, grandson, grandchild; aunt, uncle; niece, nephew; cousin; mother-in-law, father-in-law; daughter-in-law, son-in-law; sister-in-law, brother-in-law; stepmother, stepfather; stepdaughter, stepson; friend; pet, pet owner.
- `GET /tag-profiles/mine` (`backend/app/api/tag_profiles.py:163-190`) returns only tag profiles **you created** (people and pets without accounts), each with `relationship_to_creator` (free text, nullable: read this column, not your link row, which can be stale after an edit), `birth_date`, and `relationships[]`: every approved link from the tag to a user, read as "{tag} is {user}'s {word}". **Tag links are the only facts about how someone relates to a person other than you.**
- **You never learn how two of your relatives are related to each other.** So for Maya the app knows Kate is her sister-in-law and James her brother-in-law, but not that they are a couple, that Kate is Tom's sister, or whose son Finn is. The landing drawing shows those links; the app can only draw them when data supports them (section 8, Stage 2).

## 2. The engine: three pure modules, tested under Node

`frontend/src/daylight/family/kin.js` (words), `arrange.js` (facts to structure), `layout.js` (structure to geometry). Plain ESM with explicit `.js` extensions, no DOM, no JSX, so `node --test` runs them like `src/daylight/lib/journey.test.js`.

**Facts.** A fact is (A, word, B): "A is B's word". Your relationships give (them, your word, you); tag links give (tag, word, user). Facts reduce to primitives: spouse, parent, sibling, plus step-parent and pet (laid out like a child, flagged).

**Words.** Lowercase, trim, collapse spaces; drop "(pending approval)"; hyphenate "in law", "great grand", "half sister"; "step mother" becomes "stepmother"; count and strip "great-" prefixes. Synonyms: mom and mum = mother; dad = father; grandma, nana, granny = grandmother; grandpa, granddad = grandfather; spouse, partner, fiancé(e) = partner; dog, cat = pet. **Then match exactly; never substring-match** (today's transform does, so "godmother" becomes a parent). The label printed under a face is always the word as stored.

| Words | Row | Drawn with lines when | Otherwise (tray caption, side) | List group |
|---|---|---|---|---|
| wife, husband, partner | 0 | always: couple with you | | Partner |
| mother, father, parent, pet owner | −1 | always: you hang from their join, or from the one parent | | Parents |
| stepmother / stepfather | −1 | you have exactly one father / mother: joined to that parent | Step-parents, left | Parents |
| sister, brother, sibling | 0 | always (convention C2) | | Siblings |
| half- and step- siblings (tags only) | 0 | only with a link | Half and step family, left | Siblings |
| daughter, son, child, pet | +1 | always (convention C1) | | Children / Pets |
| stepdaughter, stepson | +1 | you have exactly one partner: from that partner | Stepchildren, right of your children | Children |
| mother-in-law, father-in-law | −1 | you have exactly one partner: your partner hangs from them | Parents-in-law, right | In-laws |
| grandmother, grandfather, grandparent (and great-) | −2 (−3…) | only with a link | Grandparents, centred above your parents | Grandparents |
| aunt, uncle | −1 | only with a link | Aunts and uncles, left | Aunts and uncles |
| cousin | 0 | only with a link | Cousins, left (outermost) | Cousins |
| sister-in-law, brother-in-law | 0 | only with a link | In-laws: right if you have a partner, else left | In-laws |
| daughter-in-law, son-in-law | +1 | only with a link | In-laws, right of your children | In-laws |
| niece, nephew | +1 | only with a link | Nieces and nephews: left if you have siblings in the tree, else right | Nieces and nephews |
| granddaughter, grandson, grandchild (and great-) | +2 (+3…) | only with a link | Grandchildren, centred under your children | Grandchildren |
| friend (and variants) | none | never in the tree | shelf "Friends and more" | Friends |
| anything else, empty, "other" | none | never in the tree | shelf, word as written | More |

**Infers (each a named rule with a test):** your couples; your parents (two form the join you hang from; one, you hang from them; a third or more get their own line to you, ordered father, mother, parent, then name); step-parents joined to your only father or mother; parents-in-law above your only partner; stepchildren from your only partner; exact couples and parentage from tag links.
- **C1:** your children and pets hang from the join of you and your only partner; with no partner, or two or more, from you.
- **C2:** your siblings share your parents' join; with no parent in the tree, a sibling bar links you with them.

**Never invents:** a person not in the data (the only placeholder is the "Add a relative" circle); a couple, a parent or a side for anyone the rules above do not place; a computed relation word; an unconfirmed relationship drawn as confirmed; a friend or custom word in a family position. No surname, gender or age guessing, and no "only one candidate in the tree" pairing for in-laws, aunts, uncles, cousins, nieces or nephews (the relative who connects them is often not on the app, so the only candidate is often the wrong one).

**Trays.** Relatives the rules cannot place go in a tray in their generation row: a rounded `--a-paper-deep` box with a mono caption in family words (never "unknown" or "not linked"), members at 0.88 size, no lines, positioned outside the drawn blocks so it never suggests a parent. More than 6 members (4 on phone): the first 5 (3) and a "+N" disc that opens a tray sheet.

**People you asked** (your sent requests) are placed by your word after the confirmed structure, at 60% opacity with an "Asked" sticker and a faint uncoloured line; they never anchor anyone and are left out of the exported image.

**Placement** (deterministic):
1. Rows: search outward from you over primitive facts (parent −1, child +1, spouse and sibling 0); everyone else from the word table. A fact that contradicts the rows is dropped and that person falls back to a tray.
2. Units are chains of partners in a row: you left of your first partner (a second partner left of you); your parents father, mother, parent, then by name; a person with two partners sits between them, step-parent outside.
3. Each child hangs from its two parents' join or its single parent.
4. Sibling groups: yours by name with you rightmost; your partner's with your partner leftmost; others by birth date when all have one, else first name, then id.
5. Row 0 runs: left trays, your siblings' blocks, your unit, your partner's siblings' blocks, right trays. A block is as wide as its unit or its descendants, whichever is wider; children centred under their join, ancestors over their children. Rows are settled outward from you with a minimum gap of 0.4 column; rounded elbows absorb offsets.
6. Lines, in the landing's geometry (`frontend/src/landing/proof/FamilyTree.jsx:43-85`; copy `elbow()` rather than importing it): couple line between face centres; descent from the join down to a bar at 62% of the row gap, across, and down to each child; the line into you or your partner bars at 56%; a sibling bar with no parents 38% above the row; overlapping bars get lanes 10px apart; an empty row gap shrinks to 0.75.
7. Colours (`frontend/src/daylight/styles/tokens.js`): your couple fizz, your descendants lime, your parents' side azure, your partner's parents zest, other couples violet then tide then sun; lines to tags dashed ink over the colour, as the landing does.
8. Ticks on your partner's couple line and your parents' line, when they are confirmed users.
9. Growth steps: 0 your unit; 1 the drawn row above; 2 the drawn row below; 3 the rest of your row and rows two or three away; 4 trays and asked people; 5 "Add a relative" and the ticks. Empty steps are dropped.
10. "Add a relative" sits at the right end of row −1, or of row 0 if there is no row −1.

**Sizes** by the frame's width: compact < 600px (face 64, column 100, row gap 176, name 15px, label 11px); regular 600–1099px (84, 136, 210, 18px, 12px); wide ≥ 1100px (100, 160, 232, 21px, 13px; matches the landing).

**Determinism.** A total order everywhere (kind, then `Intl.Collator('en', {sensitivity: 'base'})` on first name, then full name, then id); never the API's order; no clock or randomness. Same data, same tree, byte for byte.

## 3. Rendering

Custom SVG for lines and HTML buttons for faces, as the landing does, in pixels. **No React Flow, no `html-to-image`:** the Daylight page never imports them (they stay in `package.json` and in the classic page, which becomes a lazy chunk behind `?look=classic`). Faces keep the landing's ink keyline and hard shadow (the look the owner asked for). Growth reuses the landing's CSS (`pathLength="1"` dash offsets, the scale pop per step).

**Panning.** The page scrolls vertically; the tree frame scrolls sideways at a readable fixed size (`overflow-x: auto; overscroll-behavior-x: contain`). Zoom from max(0.3, fit-the-whole-tree) to 1.25; default 1, or fit when fitting needs 0.85 or more. A control group that stays on screen: zoom out, zoom in, **Whole tree**, **Find me**. Desktop adds ctrl or ⌘ + wheel, trackpad pinch, dragging the background, and the +, − and 0 keys. No custom touch pinch in this version (page pinch still works). The page must never scroll sideways.

**Save image.** The same geometry drawn on a canvas (lines from the same path strings via `Path2D`, round photos with `crossOrigin` and an initials fallback, text after `document.fonts.load`): paper background, "{First}'s family tree", the month and year, the wordmark; up to 4096px wide; `family-tree.png`. Phones use the share sheet with the file where the browser supports it, otherwise download.

## 4. The page

**Phone (390x844), top to bottom:**
1. The shell's top bar.
2. A lime header band (Family owns lime): "Your family [tree]." with the sticker on "tree"; a mono line "10 PEOPLE · 3 GENERATIONS"; a More menu (Save image, Tags, Sharing and groups, Requests about your tags).
3. A requests strip, only when there are incoming requests: one card each in a sideways row ("Nico Russo says you're family · Your brother · You're Nico's sister", Confirm / Not now), "See all" past two.
4. A toolbar: Tree | List, a "Waiting for 2" chip when you have sent requests, and a solid Add button.
5. The tree frame: 2px keyline, radius 20, paper inside, 12px side margins, as tall as the tree, opening centred on your unit, controls at its top right; relation labels stay visible on phone at 11px.
6. The "Friends and more" shelf. 7. The footer.

**iPad portrait (820x1180):** the same, header in one row (title left; Tree | List, Add a relative and More right), requests in two columns, the tree at regular size.

**iPad landscape (1180x820) and desktop (1440x900):** the desktop shell; header band with title and summary on the left, Tree | List, a ghost "Save image" and a solid "Add a relative" on the right; requests as a row of up to three cards; the frame up to 1240px wide, centred, wide size (the Hartley tree fits without panning).

**Growing in:** armed by an IntersectionObserver, once per session (`sessionStorage`); later visits show it complete; a newly confirmed or added person pops in alone. Dev-only `?grow=N` holds step N for screenshots. Expose `data-tree-state="growing|grown|held"`.

**Reduced motion:** never arm growth, in JavaScript (`prefersReducedMotion`) and in a CSS `@media` block that forces the final state (the shared rule shortens durations but not delays). Zoom and pan jump.

**Keyboard and screen readers:** the tree is a group labelled "Family tree, 10 people"; faces are buttons with a roving tab stop starting on you; arrows move spatially, Home returns to you, Enter or Space opens the person sheet; +, − and 0 zoom; the focused face scrolls into view. Names read "Tom Hartley, your husband" plus ", tag profile, no account" or ", waiting to confirm"; lines are hidden from screen readers; trays are labelled groups. A visually hidden "Show your family as a list" link leads the tree.

**List view (`?view=list`), the accessible path:** a "You" card, then groups in this order: Asking to join, Partner, Children, Parents, Siblings, Grandchildren, Grandparents, In-laws, Aunts and uncles, Nieces and nephews, Cousins, Pets, Friends, More, Waiting to confirm. Each group an h2 with a count; rows (face, full name, relation, status) open the same sheet. A search field from 15 people.

**Other states:** loading (skeleton circles in a 1–2–3 shape); error with Retry (data through `apiFetch`, which throws; never a silent empty tree, which is today's bug); empty (you with the "You" sticker beside the dashed "Add a relative" circle; "Grow your family [tree]."; "Add the people you love. Once they confirm, they join your tree. Children and pets join without an account."; primary Add a relative, secondary Add a child or a pet); plan ended (same condition as today: `!canAccessContent && (isExpired || isTrialExpired)`; a positive "See plans" card leads and the tree shows without actions); demo account (write actions hidden); signed out (to `/login`, as today).

## 5. Every action, and where it lives

| Action | Where |
|---|---|
| Open a relative's profile / a tag's page / your own profile | Tap a face or list row, then the person sheet |
| Tree or list | Tree \| List (`?view=list`), Tree by default |
| Pan, zoom, fit | Scrolling, the control group, Whole tree, Find me, keys |
| Save image | Header on desktop; More menu and share sheet on phone |
| Propose a relationship | Add sheet (from the header, the tree's circle, the empty state, the list). Step 1 who: people who follow you and whom you follow first (marked "In your tree", "Waiting" or "Asked you"), then search; someone who does not follow back gets "Follow each other to add {first}" and a link to their profile; last row "Someone without an account". Step 2 how: eight common words as chips plus all 35 grouped; the reverse word suggested; "{first} confirms, then joins your tree." Send. The profile page's entry stays. |
| Answer incoming requests | Requests strip and sheet (Notifications keeps them too) |
| Withdraw a sent request | An asked person's sheet, or the requests sheet |
| Remove a relationship | Person sheet: "Remove from your tree", with a Dialog ("Tom leaves your tree, and you leave his. You still follow each other.") |
| Change a relationship | No API: the sheet says to remove and ask again |
| Create a tag profile | Add sheet "Someone without an account" (name, word, optional photo cropped with the existing `components/ImageCropper`, uploaded with `apiService.uploadImage`, using `data.url \|\| data.urls?.medium`); empty state "Add a child or a pet" |
| Edit a tag profile; link a tag to another relative; remove a link | Tag sheet |
| Claims and tag-link requests | Stay in Notifications; the More menu links there |
| Delete a tag profile | Not in this version (no classic UI; destructive) |

Opening a sheet pushes a history entry so Back closes it (`?person=u:2`, `?person=t:41`, `?add=1`, `?requests=1`, `?tray=cousins`).

## 6. Sample mode

`frontend/src/daylight/family/fixtures.js` (pure) and `family/sample.js` (the extension pattern in `src/daylight/dev/sampleApi.js`, asked before the core; `fixturePage` like auth's `/__fx/inbox`).

- **A truth graph** of the Hartleys: people (name, avatar, account or not), spouse and parent facts and pets. **Finn is Kate and James's son** (decided here, so the app agrees with the landing drawing). `egoWords(truth, viewer)` derives each person's own words (aunt, uncle, cousin, in-laws); for Maya it must reproduce the landing's rows (`frontend/scripts/landing/fixtures/api.mjs:96-99`). It is also the test oracle for `arrange`.
- `sample.js` answers, for whichever sample user is signed in: `/relationships` (list, pending, sent, pending/count, with/{id}), `/relationships/types` (all 35), `/tag-profiles/mine` (Biscuit linked to Maya and to Tom as "pet"), and the writes (propose with the sample's follows and the types list, accept, reject, delete; tag create, update, links), in memory and shaped exactly like production. Correct the landing fixture's quirks in the Daylight sample only: no `other_user_full_name`, Biscuit's word "pet" not "pet owner", 35 types.
- **Sets** at `/__fx/family?set=…&as=…&next=/family-tree`: `hartley` (default; every cast member's own view), `requests` (an incoming request and two sent ones), `empty`, `large` (about 50 people around Maya, mostly without photos, including several tags), `error` (`/relationships` answers 500), `lapsed`. `auth/sample.js` answers 404 for any `/users/{username}` not in `db.profiles` and is asked first, so the `large` set must add its people to `state.db.users` and `state.db.profiles`. `GET /__fx/reset` restores everything.
- **Dev-only `?links=preview`** (only when `ONLY_ENABLED`, lazily imported, dropped from production): feeds `arrange` the truth graph's links among the viewer's relatives, to show what the Stage-2 endpoint in section 8 would draw.

## 7. Files and ownership

FAMILY owns `frontend/src/daylight/family/**` (page, `useFamily.js` store, `kin.js`, `arrange.js`, `layout.js` and tests, `TreeView`, `Person`, `Tray`, `usePanZoom.js`, `ListView`, `PersonSheet`, `AddSheet`, `TagForm`, `RequestsStrip`, `RequestsSheet`, `EmptyTree`, `exportImage.js`, `fixtures.js`, `sample.js`, `dev/`), plus these shared edits: one line in `scripts/daylight/vite-seam.mjs` SEAMS (`'./pages/FamilyTree': 'FamilyTree.jsx'`, and "twelve" becomes "thirteen" in its header comment), the new `src/daylight/seam/FamilyTree.jsx` (the same pattern as `seam/Feed.jsx`: classic page lazy for `?look=classic`, `family/FamilyPage.jsx` lazy otherwise, inside `ClassicPage` / `DaylightPage`), `'family'` in `src/daylight/dev/only.js`, an assertion in `scripts/daylight/check-bundle.mjs` (no `reactflow`, `@reactflow` or `html-to-image` reachable from `src/daylight/family/`; print the family chunk's size), and `/family-tree` added to `scripts/daylight/walk.mjs`. No file under `frontend/src` outside `src/daylight` changes; `index.html`, `public/`, `vercel.json`, `prerender.mjs` and `package.json` do not change. The director runs the classic byte proof.

## 8. Not in this build: Stage 2 (owner's decision)

- `GET /relationships/family`: confirmed relationships among your confirmed relatives. It fills the trays exactly and draws the landing's tree for real families. A privacy decision: Maya would learn that Kate and James confirmed each other.
- Relationship requests in `/users/me/notification-counts`; `PATCH /relationships/{id}` to change a word; `GET /tag-profiles/linked` (tags others created that link to you); creating the relationship when a claim is approved; partner, half- and step-sibling words.

## 9. As built (26 November 2026), and where it departs from the above

Built on `app/daylight` in commit b9128dc. It has 64 unit tests, and its own shots are in `frontend/shots/daylight-family/` (git-ignored). Departures, all from the owner's notes after he saw the first tree:

- **Sibling order (§2.4).** Siblings and children are ordered by age where birthdays are known, oldest on the left, then by first name. Where only some dates are known, the dated people take their age order among their own name places, so the tree never claims an undated person is older or younger. The viewer stands by age among their siblings only when every age is known and no in-law family stands to their right; otherwise they are rightmost, beside their partner. User birthdays are not in the API yet (see section 10), so siblings with accounts order by name for now.
- **Panning (§3).** There is no background dragging. The frame scrolls, and ctrl/⌘ + wheel or a trackpad pinch zooms. Nothing can be moved.
- **Opening zoom (§3).** The tree opens fitted when relation labels stay at 10px or more: 0.85 on phone, 0.83 on iPad and 0.77 on wide screens.
- **Tall trees.** They scroll the viewer into view only as far as the tree's bottom edge.
- **Person sheet (§5).** The sections are To you, Details, Stories (the latest 3, plus a link to all) and then actions. A code comment marks the slot for notes after Stories. The tag form has an optional Birthday.
- **Sample sets (§6).** An `owner-shape` set (the owner's family shape, made-up names) and `GET /users/{username}/events` were added.
- **The server since the security fixes (PR #13), brought in for the production release.** `sample.js` now keeps the server's current rules: every `/relationships` and `/tag-profiles` route needs sign-in except `/tag-profiles/{id}/events` (403 "Not authenticated", as FastAPI 0.109 answers); `GET /tag-profiles/{id}` returns `birth_date` only to the tag's creator and linked users; tag-link requests (`/me/tag-profile-relationship-requests`, its count, sent, approve and reject, and a member's own request) are resolved only by the other party, a creator's proposal being the one whose message starts "Proposed by "; and a person's or a tag's stories list only the stories the viewer may open. The page reads birthdays only from your own tags and from `/users/me`, so it never relies on one it may not see; the person sheet's empty Stories line says "Stories {name} shares with you show here." rather than implying they have none; the Add sheet counts only accepted follows (a withdrawn request stays on the server as `cancelled`).
- **Overlap sweep.** `scripts/daylight/check-overlap.mjs` has family scenes (the tree with the Hartleys and the owner's shape, the person sheet for a member and a tag, Add, Requests, the list, empty and error). With a notch, the tree's sticky controls slid under the top bar; they and the scroll-into-view now clear the safe area.
- **Known weak points.** On a phone, a mother with five children and a partner does not fit 356px at a readable size, so the siblings start one swipe to the left. Cousins, in-laws and nieces stay in trays until `GET /relationships/family` exists.

## 10. Proposal awaiting the owner's approval: notes and history, birthdays

The owner asked (26 Nov 2026) that anyone in a family tree can add comments and history to each person, with richer attributes. This needs one Alembic revision (head is `1b7097086e16`), with the SQLAlchemy models updated alongside. Nothing is built until he approves.

- **Table `family_notes`:**
  - `id`;
  - exactly one of `subject_user_id` (FK users) or `subject_tag_profile_id` (FK tag_profiles), enforced by a CHECK;
  - `author_id` (FK users);
  - `kind`: 'note' or 'history';
  - `body`: Text, up to 4000 characters;
  - `happened_on` (Date, nullable) and `happened_precision` ('day', 'month' or 'year', since families often know only a year);
  - `created_at`, `updated_at` and `is_deleted`;
  - indexes on the subject and author columns.
  - When a tag is claimed (`merged_user_id`), its notes move to the user.
- **Routes:**
  - `GET /family-notes?user_id=|tag_profile_id=` (one query, skip and limit);
  - `POST /family-notes`;
  - `PATCH /family-notes/{id}` (the author only);
  - `DELETE /family-notes/{id}`, a soft delete by the author, the subject user or the tag's creator.
  - Every write refuses demo accounts.
- **Who may read and write.** Only the "family of P" may read and add notes about P. The composer says who can read a note ("Ruth and her family on Our Family Socials").
  - If P is a user: P, and everyone with an accepted `user_relationships` row with P.
  - If P is a tag: its creator, the users linked through `tag_profile_relationships`, and the creator's accepted relatives.
- **Attributes:**
  - `users` gains `birth_date`, `birthplace` and `birth_date_visibility` (default 'relatives', never public). `RelationshipResponse` returns `other_user_birth_date` when visibility allows; the tree already reads it through `birthOf()` in `arrange.js`.
  - `tag_profiles` gains `birthplace`, and optionally `died_on`.
- **Small fix:** `PUT /tag-profiles/{id}` ignores a null `birth_date`, so a birthday cannot be cleared. Use exclude-unset semantics instead.
