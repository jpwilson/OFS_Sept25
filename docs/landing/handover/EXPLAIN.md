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
