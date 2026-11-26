# EXPLAIN handover: why it is different, how it works, how a story gets made

You own `frontend/src/landing/explain/**`, `frontend/src/landing/content/explain.js` (plus `explain.sample.js` and `explain.facts.js` if you need them). Export `Difference`, `How`, `Create`, `Import` from `explain/index.js`. Read `docs/landing/SPEC.md` in full first, then look at the reference page's information bands (`/Users/jpwilson/Documents/Projects/otherwise/shots/art-d/sheet.jpg`, and the code in `/Users/jpwilson/Documents/Projects/otherwise/src/explain/`) for the level of craft: each band has one idea, one big headline with one marked word, something that moves or can be touched, and real detail one tap away.

The film above you is the spectacle. Your four bands are where a visitor who is now curious finds out exactly how it works. The owner's words: it should "be clear and explain exactly how it works and what makes it so much better and different from LinkedIn, Instagram, Twitter and all the other social media, which has nothing to do with sharing with a small group of family and friends that you know", and each feature should be "highlighted and animated in interesting ways".

Headlines are SPEC's fixed lines. Everything you state must come from SPEC's "true statements" and facts. Sample numbers live in `explain.sample.js` and appear under a visible `SAMPLE` label. Product numbers not in SPEC's table go in `explain.facts.js` with a `src` of `path:line` that you read yourself.

## 2. `Difference` (`lp-difference`, tone white, type-led)

One idea: this is built for a family, not an audience.

- Head, then the positioning line from SPEC, set large. That line is positioning: make no factual claim about any other company anywhere in this band.
- Three big instruments that count up when revealed: ads (`fact('ads')`), audience settings (`fact('audiences')`), and a third that is words, not a number: `NOTHING RANKED` with the note "Stories are listed by date."
- **A post / A story** toggle (a real two-option control, keyboard operable). "A post" shows a small generic social post drawn by you in CSS: a square of one sample photo, one line of caption, a row of anonymous icons. No brand marks, no brand colours, labelled `A typical social post (illustration)`. "A story" swaps in the real thing: `ui-story-head` at the top of a tall frame through which `ui-story-d` scrolls when dragged or wheeled. The swap should feel like the small thing unfolding into the large thing.
- A six-row table of OFS facts only, each row a mono label and one plain sentence: who can open it (the audience you pick for each story); what you share (long stories with photos, video and a map); the order (by date, nothing ranked); who pays (the people who write; no ads); who can follow you (people whose request you accept); where it lives (a web app you can add to your home screen).
- `p-ruth-tablet` stands at the edge, reading.

## 3. `How` (`lp-how`, wash `tide`, pinned, about 320svh)

One idea: four steps from camera roll to family.

A path draws itself across the stage with scroll (SVG stroke, see the reference's HowItWorks), through four stations. A mono counter reads the step out of four. Each station pops open with a capture and two or three true lines; clicking a station dot jumps to it.

1. **Start free.** The trial terms from facts: days, no card, stories allowed.
2. **Bring your people.** Send a follow request or an invite link. Accepting a request lets that person open your Followers stories; follow them back to open theirs. An invite link sets up following in both directions. Tick Close Family for the inner circle, or build a group. Capture: `ui-groups`.
3. **Make a story.** Three ways: talk it through with AI Create, drop in a batch with Smart Import, or write it yourself. Capture: `ui-quickadd-modes`.
4. **They read, react and reply.** Followers get an email when you publish. Reactions and threaded replies, facts for both. Capture: `ui-story-comments`.

Phone: the path runs vertically and the stations stack.

## 4. `Create` (`lp-create`, wash `fizz`)

One idea: the fast way in is talking.

- A `Device` holds the three real captures in turn (`ui-quickadd-input`, `ui-quickadd-recording`, `ui-quickadd-review`), stepped by scroll or by three tabs. Beside it `p-maya-tada`.
- Three mode cards with the app's exact names from `fact('aiModes')`: **Quick Publish** (posts it straight away), **AI Draft** (shows you the draft to edit first; the default), **AI Interview** (asks follow-up questions first).
- "What comes back" as five small stickers that land in order: a title, section headings, a caption for every photo, a category, a place.
- A plain limits row, not hidden: labelled Beta; AI actions a day from its fact; needs Pro or the trial; AI-made stories are published to Followers, and you change the audience by editing the story.
- Below: **Or write it yourself.** The `ui-editor` capture with a short list of what the editor does (SPEC's story-editor statement).

Say "a couple of minutes" at most once, as an invitation ("talk for a couple of minutes"), never as a measured time or a limit.

## 5. `Import` (`lp-import`, wash `azure`, pinned, about 340svh)

One idea: drop in a few hundred photos and it finds the stories.

A canvas (2D canvas or DOM, your choice; it must hold 60fps) of small photo thumbnails, driven by scroll progress through five states: (a) a loose pile; (b) they line up on a time axis; (c) the line breaks where there are gaps in time; (d) runs taken away from home on consecutive days merge into one trip; (e) each group stacks into an album card with a sample title and a sample evidence line. Use the sample photos from the manifest (kind `photo`), repeated and cropped small, and label the stage `Made-up photos. Real rules.` A `Shuffle` button re-deals the pile.

Beside the canvas, rule cards that appear as each state arrives. **Read `backend/app/utils/photo_clustering.py` yourself** and state only rules that are in that file, in plain words, with any number declared in `explain.facts.js` with its line. Also true and worth saying: up to `fact('importMax')` photos at a time; the times and places are read on your device; nothing is uploaded until you pick an album; it needs Pro or the trial. Finish with the two real captures `ui-import-drop` and `ui-import-albums`.

Phone: the canvas is the top half of the pinned stage and the rule cards swap in the bottom half.

## Checks

Look at your own sheets before reporting: each band at 1440x900 and 390x844 (use `/?only=explain`), every state of the toggle, the tabs, the pinned stages at five progress points each, once at 768 and 1920, and a reduced-motion pass (pinned stages become plain stacked content; nothing is hidden). Keyboard: tab through every control. Each pinned stage must still make sense as a still thumbnail. Captures or art may be missing when you start: build against the ids (placeholders render) and re-shoot when they land.

Report: files, sheet paths, each rule card with the line of `photo_clustering.py` it rests on, anything you left as placeholder, anything that looks weak.

## Round three (26 Nov 2026): what changed

Brief: `ROUND3.md` section 3 (five-second test, no claim on a small label, reading sizes, captures that earn their size, people) and section 4 (four viewports). Breakpoints used across the package: phone `<=600`, iPad portrait `601-999`, iPad landscape `1000-1279`, desktop `>=1280`.

- **Difference** rebuilt. The h2 is three beats ("LinkedIn is for work." / "Instagram and X are for an audience." / "Our Family Socials is for [family].") arriving in turn; the boxed word alternates family / close friends every 2.8s while on screen, and the people beside it follow (household centre; Nana Ruth and Grandpa Joe with "family", Priya and Sam with "close friends"). Static form (prerender, reduced motion, screen readers): "family and close friends", all five cut-outs. The old SPEC head "Social media is built for an audience..." is no longer on the page (ROUND3 replaces it with the beats); the positioning line's end survives as the sub line. Three claims are now full-width strips with numeral and noun at the same size: `0 ads`, `5 ways to share` (chips in the standing order from `ui/AudienceSwitch` `AUDIENCES`), `In date order`. The post/story toggle became a side-by-side comparison under its own head ("A post is one photo and a line. A story is the whole [trip]."), story frame larger, Ruth reading beside it. The six-row table is a 3/2/1-column grid with display-type keys at 20-24px.
- **How**: pinned on iPad and desktop only (`usePinnedMode(600)`); phones get the stacked stations on a dashed rail (every line at 17px). Each station has a family cut-out doing the step (Maya with phone, Grandpa Joe waving, Maya talking, Ruth reading). Step 1's readouts became three big lines ("30 days free / 5 stories to publish / No card"); step 3's dark `ui-quickadd-modes` capture is replaced by three light way-cards linking to `#lp-create`, `#lp-import`, `#lp-create-write`; steps 2 and 4 keep their light captures, cropped, with big sticker callouts ("Close Family: one tick each", "A group of your own", "10 reactions", "Replies 3 levels deep"). Node labels are 16px display type; nodes are 44px targets.
- **Create**: first screen is the head, the lede at 20-22px, and the ladder (just photos, a few words, a voice note, a few questions) at display size beside `p-maya-talk`. The tabbed sticky device is gone: the three real Quick Add screens are three numbered tiles, each cropped (`CROP` in `Create.jsx`) to the part that proves the step. The Quick Add window is hard-coded dark in the app (`QuickAddModal.module.css:18`), so these stay dark; they are framed in white and kept tile-sized so the band reads bright. Modes and "what comes back" sit side by side below, then the limits row (values in display type), then "Or write it yourself" (`id="lp-create-write"`).
- **Import**: each state card leads with one display line (`say` in content: "Drop in up to 300 photos.", "Lined up by when they were taken.", "Split where the time or the place jumps.", "Days away become one trip.", "Out come the albums.") above the unchanged rules; rules 18px desktop, 16px phone; legend and stage label 13px; state chips 44px tall. iPad portrait now stacks canvas over card. On phones the headline steps aside (visually hidden, still in the tree) once the pile has been seen, to give the card room. The captures band is 4fr/7fr with `g-kids-biscuit` beside the albums capture.
- `shared.js`: `usePinnedMode(minWidth)` (default 0, behavior unchanged for Import).
- Shots: `frontend/shots/explain3-{m,tp,tl,d}/sheet.jpg`, reduced motion `explain3-rm-{m,d}`. Shot with a scratch Playwright script against an explain-only dev entry, because `/?only=explain` imports `Page.jsx` and broke whenever a sibling package was mid-edit (worth fixing in F0: `entry-client.jsx` could import `Page.jsx` only in the non-`only` branch).
- Follow-up fixes: the boxed word cross-fades between two stacked words (one is always at least 2/3 opaque) and the box width eases to the incoming word; on phones every person fits inside 390 (group scaled to 82%/64%, sides brought in); the audience chips land faster (300ms + 70ms each), so all five are solid at rest.
- Owner note on Smart Import ("drop in the camera roll" may not make sense): visible copy no longer says "camera roll" or "drop in" for photos. Heads: How "From the photos on your phone to family in [four] steps.", step 3 "Turn your photos into the story.", Import "Add a whole bunch of photos from your phone. Out come the vacations, the birthdays, the [weekends]."; "Add a big batch"; capture caption "Choose the photos.". The canvas has a new first state, **Pick** (six states now, `STATES = 6` in `importScene.js`, stage 430svh): an illustrated phone photo grid (not any OS's screen) where ticks land in turn on every photo of the sample roll (every fifth cell stays unpicked), the grid scrolls, the count climbs to `IMPORT_PICKED` (computed in `explain.sample.js` from the sample roll, 58), "Add 58 photos" is pressed, and the picked photos lift out of the phone into the pile. On a phone canvas the canvas is the phone. The Pick card: "Pick a whole bunch." with the up-to-`importMax` and read-on-device rules (moved from the pile card; the pile card now says "In they go, all in one pile."). Flow mode (prerender, no script, reduced motion) renders the picker as HTML (`Picker` in `Import.jsx`): 24 cells, all photos ticked, the count at its final value. `HOLD(i)` is now `(i + 0.6) / STATES` for every state. The phone headline steps aside from state 2 (In order) on. Sheets: `frontend/shots/explain3-imp-{m,tp,tl,d}/sheet.jpg`.
