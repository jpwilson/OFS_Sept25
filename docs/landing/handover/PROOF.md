# PROOF handover: the product, shown part by part

You own `frontend/src/landing/proof/**`, `frontend/src/landing/content/proof.js` (plus `proof.sample.js` and `proof.facts.js` if needed). Export `Anatomy`, `Places`, `Views`, `Audience`, `Family` from `proof/index.js`. Read `docs/landing/SPEC.md` in full first, then look at the reference's information bands (`/Users/jpwilson/Documents/Projects/otherwise/shots/art-d/sheet.jpg`, code in `/Users/jpwilson/Documents/Projects/otherwise/src/explain/` and `src/close/`) for the level of craft.

Your five bands are the evidence. They show the real interface (captures listed in `docs/landing/handover/CAPTURE.md`, rendered with `<Shot>`) and state exactly what it does. The owner asked for these features by name: the journey map of a trip; all the family's stories on a map of the world; browsing by category; showing different people different things; long-form stories with video, text, captions and good galleries. He wants each "highlighted and animated in interesting ways".

Headlines are SPEC's fixed lines. Everything you state comes from SPEC's "true statements" and facts. The map is flat: never draw or mention a globe.

## 6. `Anatomy` (`lp-anatomy`, tone paper, pinned, about 380svh)

One idea: everything that fits in one story.

The tall real capture `ui-story-d` sits in a keylined browser frame, centre stage, and scrolls inside the frame as the page scrolls. As each part passes, a labelled tag pops out to the side with a leader line, and the matching detail capture slides in: cover and title (`ui-story-head`); contents built from your headings (`ui-story-toc`); text with a captioned photo (`ui-story-text`); a video clip; the journey map (`ui-story-journey`); the gallery (`ui-story-gallery`); the lightbox with reactions (`ui-lightbox`); comments and replies (`ui-story-comments`); tags; audience and share link (`ui-privacy`, `ui-share`). Each tag is a button that opens a detail card with two or three true lines and the relevant facts (photos per story, clip length, clips per story, reactions, reply levels, share-link days). Detail cards have a visible close control.

An `Explode / Assemble` toggle spreads all the parts out around the frame at once and puts them back. Phone: a stepper, one part per step, capture on top and card beneath.

## 7. `Places` (`lp-places`, wash `azure`)

One idea: every stop of a trip, and every story, on one map.

- Left: an interactive route of the sample coast walk, drawn by you in SVG in the app's pin style (numbered circles, a start flag, a dashed line joining the stops in order), with the six stop names from `proof.sample.js`. Hovering or focusing a stop in the list lifts its pin and shows that stop's `Print`. The route draws itself when the band is revealed.
- Right: the real captures `ui-story-journey` and `ui-worldmap-d`, with a two-option control to switch between "One trip" and "Every story".
- Four plain facts as instruments: location and time are read from each photo in your browser before upload; each located photo becomes a numbered stop, joined in order; map layers from their fact with the three names; the map view shows one pin per story and groups pins that are close together. One more line: no location in a photo? Add the place by hand.
- `o-campervan` and `p-kate-pack` stand on the floor line; `o-lighthouse` at the back.

## 8. `Views` (`lp-views`, wash `lime`, pinned sideways reel, about 300svh)

One idea: four views of the same year.

A reel of four `Device` cards moves sideways with scroll (and by drag): Feed (`ui-feed-m`), Calendar (`ui-calendar`), Map (`ui-worldmap`), Timeline (`ui-timeline`), each with one true paragraph: the feed is cards in date order, by the date posted or the date it happened; the calendar is a month grid; the map is a pin per story; the timeline groups stories by year, newest first.

Under the reel, a working copy of browsing by category: the eight real category names as chips (plus `Your own`), and the five sample story cards (`ui-card-*`). Tapping a chip filters the cards, with the same behaviour as the app (a story can carry up to `fact('categoriesPerStory')` categories; state that). Then the other filters as a mono row: person, date range, order, and mute.

`p-leo-school` and `p-ivy-trophy` at the edges.

## 9. `Audience` (`lp-audience`, wash `tide`)

One idea: exactly who can open what. This is the product's main difference and the band a careful visitor will read hardest, so it must be exactly right.

- The `AudienceSwitch` (from `ui/`) again, driving a **matrix**. Rows: the five settings. Columns: You; Close family; A follower; A Run club member; A signed-in member you have not approved; Someone with a share link; Anyone on the web. Each cell is one of three states with an icon and words: `Opens it`, `Sees the card only`, `Nothing`.
- Build the matrix from a data table in `content/proof.js`, and **verify every cell yourself against `backend/app/utils/privacy.py`** (`can_view_event`, `filter_events_for_feed`) and `backend/app/api/events.py` (`get_event`, the list endpoint), and against `backend/app/api/share_links.py`. Put the file and line for each row in a comment. If the code and SPEC's true statements disagree anywhere, stop and tell the director.
- The selected row lights up, and a compact crowd of the cast beside the matrix shows who is standing for that setting (reuse the film's idea in miniature: small cut-outs rise and drop).
- Three "worth knowing" cards, plainly worded: Public means anyone with the link, signed in or not. The feed card (title, cover, place) of any story that is not Private is listed to signed-in members; opening it follows the audience. Someone who follows a person you tagged can open the story unless it is Private.
- Then four short facts: a share link opens one story without an account and ends after the days in its fact; you accept or decline each follow request, and following is one-way; you can mute someone; while an author's plan or trial is not active, other people cannot open that author's stories.

## 10. `Family` (`lp-family`, wash `fizz`)

One idea: it knows who is who.

- Captures: `ui-tree` large, `ui-groups` and `ui-profile` smaller.
- Three points with a small animation each: relationships both people confirm build the family tree; you can tag people who have no account (a child, a grandparent, a pet) and they can claim the profile later; Close Family ticks and named groups are how one story reaches the right people.
- `g-kids-biscuit` on the floor line, with a small tag on the dog: `Biscuit · tag profile, no account`.

## Round three (26 Nov 2026): what changed

Brief: `ROUND3.md` section 3 (five-second test, no claim on a small label, reading sizes, captures that earn their size, people) and section 4 (four viewports). Sheets: `frontend/shots/proof3-{m,tp,tl,d}/sheet.jpg` (phone 390x844, iPad portrait 820x1180, iPad landscape 1180x820, desktop 1440x900; every section in page order).

- **Every section** sets `--l-size-label: 13px` on its root (the shared token is 11.5px); body copy is 18px desktop / 16px phone; numbers sit beside their noun at one size ("60 seconds for the longest clip", "3 map layers"). Part facts are rendered by `PartFacts` in `Parts.jsx`, no longer by `Readout`.
- **Anatomy.** Pinned from 761px wide (`usePinMode('(min-width: 761px)')`), 560svh. The story page is the hero: a browser frame about 740px wide (landscape) or full width (portrait), so the page reads near its real size. A sticker on the reading line names the part on the page; the part comes out beside it large (label in display type, capture fitted by height with container units, one line, facts, "More about ..." opens the dialog). A rail of ten numbered buttons jumps to each part (`scrollStageTo`). Spread it out stays in landscape only. Landscape: part left, page right. Portrait: page top, part beneath. Phone: the stepper, with the part name in display type and larger media. `at` positions were re-measured on the round-three `ui-story-d` (journey map moved from 0.74 to 0.725 etc.); re-measure if that capture is re-shot again.
- **Places.** Header now sits above the real map (with its switch) in the left column and the drawn route is beside it, so the first screen has the claim and the route together. The real maps are cropped to the map (`MAP_CROP` in `Places.jsx`). Facts are a row of four with display titles. Sizes up throughout (stop names 15px, dates 13px).
- **Views.** Pinned at every width with motion (400svh). The switch is the visual: the app's four-view control, large, and one big phone; scrolling changes the view, the previous screens tuck in behind as a deck, and the view name is set huge with its "By date / By month / On the map / Year by year" sticker. Nana Ruth (`p-ruth-tablet`) stands beside the phone. A tap on the switch glides to that view. Reduced motion, no script and the prerender show the four phones side by side (phone: a sideways snap row). Category browser unchanged in behaviour, sizes up.
- **Audience.** Leads with people. A line-up of `LINEUP` (content/proof.js): Maya (the author) and her eight followers, plus two grey silhouettes for anyone with the link. Each face lights from `AUDIENCE_MATRIX` (same verified table), wears a name badge with a tick when they open it and "Card only" when they are shown the card. Scrolling walks Private, Close Family, Followers, Custom Group, Public (460svh, pinned at every width); the readout names who opens it in display type (`AUDIENCE_STEPS`). All state comes from the checked radio of `AudienceSwitch` through CSS `:has()`, so no React state follows the scroll and the prerender rests on Followers, complete. Wide screens: one row. Portrait and phone: two rows on a riser. The exact matrix follows beneath ("Cell by cell, the way the app decides."); a row tap lights the line-up without moving the page. At 900px and below the matrix becomes one list per setting (the chosen one open). The household group cut-out is deliberately not in the line-up: Private means Maya alone, and showing Tom and the kids lit would contradict the matrix.
- **Family.** Lead is the real tree, cropped to its cards and shown about 1200px wide (on a phone it pans sideways, starting on Maya). Ivy, Leo and Biscuit kneel at the horizon below it with the dog tag. Two beats on the floor: "Tag people with no account" (Biscuit's dashed TAG card cropped from the tree, and the profile) and "Ticks and groups do the sharing" (the Sharing page's name column and Close Family column cropped side by side so every name and switch is readable, plus the Run club card). Crops are constants at the top of `Family.jsx`, measured on the round-three captures.
- Director's follow-up: "Video clips" and "Audience and share link" are `offPage` parts (no `at`): the page holds on the last located part, the reading line and sticker hide, and the part card carries a dashed note ("From another sample story" / "The author's view, not on the reader's page"). The on-page walk ends at comments. The Places route draws in about 0.65s and its observer fires 25% before it enters the screen, so it is never seen empty. Shots: `frontend/shots/proof3-fix/`.
- `shared.jsx`: `usePinMode` also takes a media-query string; `scrollStageTo(el, t)`; drawn icons for the four views.
- Checked: `check-facts` passes; scratch `vite build` passes; each section server-renders (`renderToString`) with complete copy; no sideways scroll at the four viewports; reduced-motion pass shows every section complete and static.

## Checks

Look at your own sheets before reporting: each band at 1440x900 and 390x844 (use `/?only=proof`), the pinned stages at six progress points each, every interactive state (each matrix row, each category chip, each Anatomy tag open, both Places views), 768 for the matrix, 1920 once, and a reduced-motion pass (pinned stages become stacked content; nothing hidden). Keyboard-only pass of the matrix, the chips and the Anatomy tags. Captures or art may be missing when you start: build against the ids and re-shoot when they land.

Report: files, sheet paths, the matrix with the code line behind each row, placeholders, weak spots.
