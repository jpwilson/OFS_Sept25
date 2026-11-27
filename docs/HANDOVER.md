# Handover: where everything stands (26 November 2026, afternoon)

Written so another session or model can carry on. Read `docs/landing/ROUND4.md` (the owner's voice rule) first, then this.

## The owner's order of work
1. The new landing page, out. 2. The existing web app's new look ("Daylight"), shown to him, then merged switched off by default. Front-end only: no backend, database, Supabase or Vercel changes. iPhone app and photo books are paused with their work saved.

## Landing page (this checkout, branch `landing/rebuild`, PR #8)
- Done and pushed, including round five: "card only" removed, Marcus renamed James, "Grow your family tree." with a drawn tree, "Why millions have moved to Our Family Socials." with a testimonials row under it.
- `frontend/src/landing/content/testimonials.js` is empty on purpose: it takes real members' words only. Do not invent people or quotes.
- Member figures are the owner's, in `content/business.js`.
- Checks before every push: `npm run build`, `npm run seo:check`, `node scripts/landing/check-facts.mjs`, `node scripts/landing/check-pricing.mjs`, then load the built page (`node scripts/serve-dist.mjs <port>`).
- The owner views a built copy at http://127.0.0.1:5340/ (refresh it with the snapshot script in the session scratchpad, or `VITE_LANDING=story npx vite build --outDir <dir>` and `npx vite preview --outDir <dir> --port 5340 --host 127.0.0.1`).
- Open with the owner: logo pick (options in `landing-art/logo/options.png`); whether the yellow band should say "millions" to match the new headline; real testimonials; the photo-book card (books are paused, so remove it before go-live); merging.
- Go-live: he merges PR #7 first (signed-in users get a blank page on the live site until then), then #10, #11, #9, #8; then `production` in `frontend/landing.config.json` becomes `story`. Merging #8 also changes the wording of the live comparison, FAQ, features, pricing and about pages.

## The app's new look (checkout `../OFS_claude-daylight`, branch `app/daylight`, not pushed)
- Built: feed and profile, story page, maps, creation flow. Decisions: `docs/app/SPEC.md`; interfaces: `docs/app/handover/FOUNDATION.md`.
- In progress when this was written: an integration pass (joins the four, fixes shared-layer issues, re-shoots the map sheets, produces walkthrough sheets in `frontend/shots/daylight-walk-m/` and `-d/`), and new sign-in pages (`docs/app/AUTH.md`; the Google button is built but off by default).
- Next: review the walkthrough, show the owner, rebuild the app's family tree to match the landing's drawn tree (`frontend/src/landing/proof/FamilyTree.jsx`), merge `landing/rebuild` in again (James rename, new captures) and rebuild the sample, then open a pull request with production on `optin` so he can try it on his real account with `?look=daylight`.
- Paused: photo books (`docs/app/BOOKS.md`), iPhone app (`../OFS_iOS`, branch `app/daylight`, `docs/PAUSED.md`).

## Working rules
Builders run on Opus; review their output and run the build before reporting. One folder per builder; the shared tree must compile after every write; no `npm run build` while builders are active in a checkout. `gh pr merge` is the owner's to do.
