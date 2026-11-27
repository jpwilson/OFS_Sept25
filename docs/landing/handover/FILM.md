# FILM handover: the scroll moment

You own `frontend/src/landing/film/**` and `frontend/src/landing/content/film.js`. Export `Film` from `film/index.js`. Read `docs/landing/SPEC.md` in full first. Then read how the reference film was built, because you are porting its craft, not its code line for line: `/Users/jpwilson/Documents/Projects/otherwise/docs/handover/FILM.md`, `src/film/{timeline,layout,engine,parts,index}.ts(x)`, and look at `shots/film-d/sheet.jpg` and `shots/film-m/sheet.jpg`. Look at every image you have before placing it: the contact sheets in `landing-art/sheets/` and the manifest `src/landing/art/manifest.json`.

**The moment in one sentence:** scrolling plays one family's year; each story builds itself around the family from their photos, a couple of minutes of talk and the places in the pictures, and then the relatives chosen for that story rise up to read it.

This is the first 18 screens and the thing the owner judges in one glance. He called the reference the best landing page he had seen and asked for the same energy, pushed further: one subject centre-screen, a full-bleed wash that changes per chapter, a giant ghost word behind, small exact instruments, people and things arriving with weight, something to grab. Bright, never dark.

## Structure: poster-first (this differs from the reference on purpose)

The film is a list of **scenes**, one per beat: HERO, TELL, READ, MAP, YEAR, FINALE. Each scene is a real `<section>` (`data-scene`, its own `data-wash`) containing its ghost word, actors, copy block, readouts and audience chip as real DOM. Each actor's **hold** position is given by CSS variables written at render from `film/layout.js` (a desktop set and a phone set; CSS picks with `@media (max-aspect-ratio: 9/10)`). With no script at all, CSS draws every scene as a finished full-screen poster, one after another down the page. That is what crawlers, reduced-motion visitors and the first paint get, and it must already look good.

Stage unit: `--u` so that 100u is `min(100svh, 62.5vw)` on desktop and `100svh` on phone; x in u from the centre line, lift in u above the floor line, sizes in "adult heights" so one number rescales a scene. Feet stand on the floor line using `feet` and `ax` from the manifest.

With script and motion allowed, `Film` switches to **pinned** mode: the wrapper becomes about 1,700svh tall with one sticky 100svh viewport; scenes are stacked in it; the engine reads `stageProgress` in `onFrame` and writes transforms, opacity and clip-paths to elements found by `data-f`. Each wash floods in as a growing circle (`clip-path: circle()`) centred behind the subject's feet. Every actor's animated state is its hold position plus an offset that goes to zero at the hold, so a scene at its hold is pixel-identical to its poster. Scenes outside their window are `visibility: hidden`. Under `prefers-reduced-motion` stay in poster mode. If the engine throws, fall back to poster mode.

Arrivals have weight: people rise from below the floor line (clipped at the floor) with overshoot, staggered, at two or three depths; things in the air drop and rebound once or drift in with parallax; prints fan and dock; stickers slap on with a pop. A little pointer parallax on desktop, off under `(hover: none)` and reduced motion. Every scene has a hold of at least 50svh where nothing is in flight and the copy can be read.

## Beats (lengths are a starting point; tune them)

| Beat | svh | Wash, ghost | Centre | Audience chip |
|---|---|---|---|---|
| HERO | 0-150 | `tide`; ghost shows the chosen setting's name | `g-family-hero` (phone: `p-maya-phone`) | the switch itself |
| 01 TELL | 150-480 | `fizz`; "tell" | `p-maya-talk` | Followers |
| 02 READ | 480-770 | `zest`; "read" | `p-tom-medal` | Custom Group · Run club |
| 03 MAP | 770-1110 | `azure`; "map" then "world" | `g-family-hike` | Followers |
| 04 YEAR | 1110-1370 | `lime`; "year" | `p-ivy-cake` and `p-leo-horn` | Close Family |
| FINALE | 1370-1700 | `tide` then `paper`; "ours" | everyone | all five, tagged |

**HERO.** At rest: the H1 (eyebrow span and display span, SPEC's fixed lines), the sub, two buttons, the mono note, the family centre, the crowd of eight around them at two depths, and the `AudienceSwitch` (from `ui/`) with its label `WHO CAN OPEN THIS STORY`. A `Shot` of the coast story's real feed card (`ui-card-coast`) sits near Maya's raised phone, joined to it by a thin leader line. A readout `CAN OPEN IT` shows: Private "just you"; Custom Group the Run club count; Close Family its count; Followers its count; Public "anyone with the link". Counts come from `content/cast.js`. Who stands for each setting: Private nobody but the household; Custom Group Sam, Priya, Deb; Close Family Ruth, Joe, Kate, Marcus; Followers all eight; Public all eight plus flat grey silhouettes at the edges (CSS masks of existing cut-outs, tagged `ANYONE WITH THE LINK`).

The switch must work before hydration: the crowd's visibility is driven by CSS from the checked radio (`:has()`), so the poster is already interactive; after hydration the engine adds the rise and drop. On load, once, it plays Private, then Close Family, then Followers and rests on Followers (skip under reduced motion or if the visitor has scrolled). Dragging or clicking it at any time works. Rest state is the full bright crowd. Judge the first screen at rest: it is the page's thumbnail.

From about 70svh the crowd steps back, the switch tucks into a small chip, and `fizz` floods.

**01 TELL: "Six weeks without a kitchen".** Maya centre, talking into her phone. In order: (1) six photo prints (`photo-kitchen-*`) fan in from the left, one per about 9svh, with a counter `PHOTOS 01` to `06`; (2) a waveform and a timer run with scroll to a sample length, tagged `SAMPLE VOICE NOTE`, while a few transcript words stream; (3) a story page assembles to the right as designed fragments, not a screenshot: title, three section headings, prints docking into the text each with a caption, a category chip `Projects` and a place chip; sample story text is set in Literata; (4) behind Maya the kitchen finishes itself in one fixed spot from the four registered stages (`r-kitchen-before`, `-gutted`, `-fitted`, `-done`), each wiping up over the last (`clip-path: inset()` rising from the floor) in step with the section headings; (5) a sticker lands: `Drafted by AI. Yours to edit.`; (6) `p-ruth-dish` and `p-kate-wave` rise to read it. Props: `prop-roller`, `prop-swatches`, `prop-paint-pots`, `prop-mic`. Readouts: `AI CREATE · BETA`; `WAYS IN` with the three mode names; `AI ACTIONS A DAY` with its fact and the note `on Pro or the trial`.

**02 READ: "Dad's first marathon".** Tom centre in his foil blanket. (1) `o-finish-arch` slides in behind him and `o-barrier` at the side; (2) six prints (`photo-race-*`) assemble into a gallery wall, each with a caption label; (3) a video tile (`photo-race-video` with a play mark and a ring that fills with scroll); (4) the real lightbox capture `ui-lightbox` lands as a `Shot`; (5) the cheer squad pops in: `p-ivy-cheer`, `p-leo-cheer`, `p-maya-cheer`, `p-sam-medal`; then reaction badges and two comment cards arrive from named family, as designed fragments. Props: `prop-medal`, `prop-shoe`, `prop-banana`, `prop-cowbell`. Readouts: photos per story (Pro) with its fact; clip length with its fact; reactions with its fact; replies with its fact.

**03 MAP: "A week on the coast path".** Beat A, the route: the family walking, centre. `o-campervan` rolls in. A dashed route draws along the floor through a start flag and five numbered pins (copy the app's pin style: numbered circles, dashed line); each pin pops its print (`photo-coast-*`) and a mono coordinate tag. `o-lighthouse`, `o-waymarker`. Then the real journey-map capture `ui-story-journey` lands. Hold. Beat B, the world: the scene eases back to about 0.6 scale, the route collapses into one pin, a flat dotted world map (inline SVG, drawn, clearly flat; never a globe) spreads across the wall, the ghost word becomes "world", and four far pins drop with a relative rising small beside each (`p-joe-suitcase`, `p-kate-pack`, `p-marcus-camera`, `p-ruth-sunhat`) and a cluster bubble with a count. Props: `prop-ice-cream`, `prop-binoculars`, `prop-flask`. Readouts: `GPS · READ FROM THE PHOTO, ON YOUR DEVICE`; map layers with its fact and names; `ONE PIN PER STORY · NEARBY PINS GROUP`.

**04 YEAR.** The kids centre. (1) a row of the eight category tabs drops in with their real names; (2) scroll steps through Birthdays, Vacations, Projects, Milestones, about 30svh each: the kids' cut-outs swap (`p-ivy-cake` and `p-leo-horn`; `g-kids-beach`; `g-kids-rocket`; `p-leo-school` and `p-ivy-trophy`), props swap, and matching story cards (`ui-card-*`) deal in; swaps are a quick scale-pop and wipe, never a cross-dissolve of two bodies; (3) a view toggle flicks Feed, Calendar, Map, Timeline with a real capture for each (`ui-feed-m`, `ui-calendar`, `ui-worldmap`, `ui-timeline`) inside a `Device`; (4) `p-joe-crown` and `p-ruth-gift` rise. Props: `prop-balloons`, `prop-present`, `prop-party-hat`, `prop-bucket-spade`, `prop-trophy`, `prop-school-bag`. Readouts: views with its fact; categories with their facts; `ORDER · BY DATE · NOTHING RANKED`.

**FINALE.** (1) everyone and every object flies in from exploded positions into one group portrait on `tide`; (2) thin leader lines tag each story with its audience; (3) the `AudienceSwitch` returns and works on the whole portrait; (4) the portrait shrinks into a feed card and the real feed capture `ui-feed-d` (`ui-feed-m` on phone) opens from it as the wash drains to `paper`; a small rail of captures follows; (5) the plate `plate-year-d` (`-m` on portrait) opens to full bleed with the finale head, line and two buttons.

A month counter (mono, top right) runs JANUARY to DECEMBER across the film. A chapter rail of five chips sits bottom centre (TELL, READ, MAP, YEAR, and "the app"); clicking one scrolls to that hold; the active one is raised.

## Copy

All text in `content/film.js` as plain data. Use SPEC's fixed lines for eyebrows, heads, hero and finale. Write one sentence of body per chapter in SPEC's voice, using only SPEC's "true statements". Every number comes from `fact()`. Sample content (captions, comment text, names, the sample timer) is clearly sample: the slate top left reads `SAMPLE STORY 0N` with the story title. Do not write "AI wrote this in N seconds" or any time.

## Phone (390 x 844; also used for portrait tablets)

Its own slot table. Copy block in the top 30svh, head 34-42px. Subject about 46svh tall on the centre line, objects behind at about 0.6 scale and lifted. At most three audience figures and two props, and props only between the copy block and the subject's shoulders. Readouts as a two-up row above the rail; a third moves out. In the hero the switch is a full-width five-segment row above the stacked buttons and the rail is hidden. No sideways scroll.

## Quality bar and checks

- Take 24 evenly spaced checkpoints of `#lp-film` at 1440x900 and 20 at 390x844 with `scripts/landing/shots.mjs` and look at the sheets. Each must be a clearly different picture; each hold must read as a finished poster: nothing over the copy, nobody's head under the nav (top 80px clear), shadows under feet, the ghost word visible behind the subject, text readable on every wash.
- The hero at rest, and all five switch positions, on both sizes.
- A poster-mode sheet (`--reduced`) and a script-off sheet from the built output (`--nojs`): every scene a complete poster.
- 768x1024 and 1920x1080 once each.
- 60fps: transform, opacity and clip-path only; `will-change` only inside a scene's window; no layout reads in the frame loop beyond `stageProgress`. Preload only what the hero needs; decode the next scene's images one scene ahead.
- Server-render safe: no browser globals in render. The switch works before hydration.

Art or captures may be missing when you start. `Cutout`, `Print` and `Shot` render labelled placeholders for missing ids, so build against the ids and re-shoot when the files land. Never invent an id; if you need an image that is not in `docs/landing/handover/ART.md` or `CAPTURE.md`, ask the director.

The director will review after the hero and chapter 01 are standing. Send a message to "main" with the two sheet paths at that point, then continue with the rest while you wait.

Report when done: what you built, sheet paths, what you tuned away from this brief and why, and what still looks weak. Be honest about weak spots; the director looks at every sheet.
