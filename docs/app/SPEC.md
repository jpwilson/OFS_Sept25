# Daylight: the redesigned app, built beside the live one

"Daylight" is a redesigned version of Our Family Socials' main pages, in the brand the new landing page set, built so the live app is untouched until the owner flips a switch.

## What to read, in this order

1. This file: the decisions.
2. `docs/app/PLAN-DAYLIGHT.md`: the plan this build follows. It is long, specific and carries the `file:line` evidence. **It is the spec**, except where this file overrides it.
3. `docs/app/PLAN-DAYLIGHT-ALT.md`: a second, independent plan that reached the same design. Use it as a second opinion on detail; where the two differ and this file is silent, PLAN-DAYLIGHT.md wins.
4. `docs/landing/SPEC.md` and `docs/landing/ROUND2.md`: the brand (tokens, type, washes, voice, honesty rules) and the sample family.
5. `docs/landing/handover/FOUNDATION.md`: the landing's primitives and the working rules for several builders in one repo.

## What the owner asked for (his words)

- "Make another version of the actual app itself, the main pages. Use the stories that are already there, the photos, and everything we've already got."
- "I think the map is not great. I think the interactive map is not great, and I think the auto version isn't good... Upscale the whole look of that as well, especially the maps. I'm sure there's a lot of open-source map stuff we can use."
- Earlier: "a globe view" where you "see all the events of all your family all over the world".
- "The auto upload: people can just do photos, or they can give you a voice note summary of the holiday as well. You can ask them questions to make it even better, but you make it immediately with just photos, or with photos and some text, or photos and a voice note."
- "Make sure that the mobile web view is just as amazing and the experience is just as good."
- He reads dark or moody as worse. He wants the product to feel like the best in the world at this. After this, work starts on the native iOS app, which will follow the same direction.

## Decisions (these override the plans)

1. **The gate has three values**, from the alternative plan: `frontend/app.config.json` is `{"production":"classic","preview":"daylight"}` and the resolved look is one of `classic` (today's app; no new code in the build), `optin` (both in the build; classic by default; a person turns Daylight on with `?look=daylight` or a switch, remembered locally) or `daylight` (the new look by default, with `?look=classic` as an escape). `VITE_APP_LOOK` overrides. The mechanism is the plan's seam plugin: six imports in `App.jsx` are redirected at build time and no existing file under `frontend/src/` is edited.
2. **A classic build must be byte-identical** to a baseline taken before any Daylight work, checked by script after every integration. This is the first thing the foundation builder sets up and the last thing checked.
3. **The Tetons story already exists.** Use it, do not plan another: "Seven days in the Tetons", by Tom, 14 to 20 June 2026, thirty photos `photo-tetons-01` to `-30` in `frontend/src/landing/art/manifest.json`, an upload kit with real EXIF in `landing-art/kits/tetons/`, stops and coordinates in `docs/landing/ROUND2.md`, and a fixture in `frontend/scripts/landing/fixtures/stories.mjs`. Where a plan's Tetons table differs, the existing story wins. The alternative plan's section 6 audits it and lists corrections; apply those.
4. **The sample family is the one in `docs/landing/ROUND2.md`** (American, home in Madison, Wisconsin; eight household stories and three relatives' stories).
5. **The acceptance test for the creation flow is the kit test:** drop the thirty kit files into the new flow and get one story, seven days, named stops and a drawn route, with no coordinate typed by hand. Today's app cannot do this by any of its four routes (alternative plan, section 0).
6. **Stage 1 is frontend only.** No backend change in this build. Stage 2 backend items in the plans are proposals for the owner, listed in the final report.
7. **Phone is designed first.** Every package shows its phone sheets before its desktop sheets. A bottom tab bar, thumb-reach controls, bottom sheets, safe areas, 390 wide. The owner asked that the mobile web experience be as good as desktop, in those words.
8. **Light only**, as both plans say. Stored theme preferences are left untouched.
9. **The world view defaults to "People I follow and me"**, from the alternative plan, because the feed lists every member's non-private stories.
10. **Nothing invented.** The honesty rules in `docs/landing/SPEC.md` apply to the app's own copy too: no counts of users, no claims the code does not back.
11. **Where the work happens:** a separate checkout, `/Users/jpwilson/Documents/Projects/SGTG/OFS_claude-daylight`, on branch `app/daylight`, so this build cannot disturb the landing builders working in `OFS_claude`. It branches from `landing/rebuild`; the landing's round-two art and fixtures are merged in when they are committed.

## Working rules

As for the landing (`docs/landing/handover/FOUNDATION.md`), in this checkout: edit only your own folder; no `npm run build` while other builders are active (compile to a scratch `--outDir`); no git commands that change state; start dev servers with `--host 127.0.0.1`; stop servers when finished; look at your own screenshots, phone first, before reporting; Node 22 (`export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"`); Playwright from `/Users/jpwilson/Documents/Projects/jpw-ops/node_modules/`. Ports 5330 to 5335.
