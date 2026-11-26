# CLOSE handover: nav, limits, comparison, plans, questions, sign-up, footer

You own `frontend/src/landing/close/**`, `frontend/src/landing/content/close.js` (plus `close.sample.js` and `close.facts.js` if needed) and `frontend/scripts/landing/check-pricing.mjs`. Export `Nav`, `Limits`, `Compare`, `Plans`, `Questions`, `Start`, `Footer` from `close/index.js`. Read `docs/landing/SPEC.md` in full first, then look at how the reference closes (`/Users/jpwilson/Documents/Projects/otherwise/shots/art-d/sheet.jpg`, code in `/Users/jpwilson/Documents/Projects/otherwise/src/close/`).

Your part is where a visitor decides. It has to be the most trustworthy part of the page: exact prices, plain limits, an honest comparison. The last builder of a page like this invented a refund policy and a student discount for the pricing FAQ. Do not invent any policy, price, discount, guarantee or number; if it is not in SPEC, it is not on the page.

## 0. `Nav`

A solid white keylined pill, fixed at the top, readable over every wash (no blend modes, no glass). Wordmark: `Our Family Socials` in the display face with `Family` on a sticker, preceded by a mark of three overlapping dots (tide, zest, fizz). Links scroll with `scrollToId`: How it works (`lp-how`), What's in a story (`lp-anatomy`), Plans (`lp-plans`). Then `Log in` (plain link to `ROUTES.login`) and `Start free` (button to `ROUTES.signup`). Phone: wordmark shortens to `OFS` on a sticker plus `Start free`, with a menu button opening a full-width sheet that has a visible close control and locks scroll while open. The nav hides on scroll down and returns on scroll up, except inside the first screen. Call `track('landing_cta', { where })` on each start button.

## 11. `Limits` (`lp-limits`, tone white)

One idea: say what it does not do, before anyone has to ask.

Large head, then eight plain statements as a numbered list with generous type, each one line of statement and one line of consequence:
1. It is a web app you add to your home screen. There is no app-store app.
2. It is not a backup. Photos are stored resized, so keep your originals.
3. Video clips run up to the seconds in their fact.
4. AI Create is beta and limited to the daily number in its fact. Read the draft before you publish.
5. AI-made stories are published to Followers. Change the audience by editing the story.
6. Public means public: anyone with the link can open it.
7. Other signed-in members can see a story's card (title, cover, place) unless you set it to Private. Only your chosen audience can open it.
8. Publishing needs Pro after the trial. Reading does not.

No illustration except one small prop (`prop-print-stack`). This band earns trust by being plain.

## 12. `Compare` (`lp-compare`, tone paper)

One idea: where the alternatives are better, said by us.

Four cards: Tinybeans, FamilyAlbum, a private Facebook group, a private Instagram account. Each card's text is the existing "short answer" from that page's object in `frontend/src/content/marketing.js`, copied **exactly** into `content/close.js` (do not paraphrase, do not add claims about those products), with a plain link to its compare page. Add a fifth link card to "How to share photos privately" and one to `/alternatives`. All are plain `<a href>` so they exist in the static HTML. Add a tripwire to `check-pricing.mjs` that fails if any of the four copied strings no longer matches `marketing.js`.

## 13. `Plans` (`lp-plans`, tone paper)

One idea: readers are free; storytellers pay.

Three plan cards with a monthly/annual toggle (default annual), prices from `PRICES` (which reads `frontend/src/content/site.js`); never type a price. Plan names exactly as the app has them: `Free to View`, `Pro`, `Lifetime`.

- **Free to View**: price zero, forever. Open the stories of people you already follow and any Public story. Like, comment and react. No time limit. Button `Start free`.
- **Pro**: the annual price shown per month with "billed annually" and the yearly total, or the monthly price. No cap on the number of stories. Photos and videos per story from its fact. AI Create and Smart Import, with the daily AI number from its fact. Follow new people. Button `Start the free trial`.
- **Lifetime**: the one-off price. Everything in Pro, paid once. Link `See all plan details` to `ROUTES.pricing`.

Under the cards, the trial stated exactly from facts: the days, no card, the number of published stories, and the photos or videos per story during the trial. Then two rules in plain words: after the trial without a plan you can still read, like and comment, but you cannot publish or follow new people; while your plan or trial is not active, other people cannot open your stories until it is active again.

Two arithmetic instruments computed from `PRICES`, shown as arithmetic: twelve monthly payments against the annual price with the saving as a percentage; the lifetime price as years of the annual price to one decimal.

Do not use the pricing page's own bullets or badges: several are wrong (it says free accounts can follow family members, calls the trial a "Pro trial", and marks Pro "Most Popular"). Do not mention any early-bird offer, refund, discount, coupon or family plan.

`check-pricing.mjs` fails if the numbers rendered in the built `dist/index.html` plans section differ from `site.js`.

`p-joe-phone` beside the cards.

## 14. `Questions` (`lp-questions`, tone white)

Ten questions in a visitor's words, as native `<details>` (so they are in the static HTML), with a link to `ROUTES.faq`. Write each answer yourself from SPEC's "true statements" and facts; do not copy answers from `frontend/src/content/faqData.js`, because several of those answers are wrong about the product. Cover: what it is; whether it is really free to read; who can open a story; what Public means; whether relatives need an account (a share link opens one story without one; otherwise yes); how AI Create works and its limits; whether there is an app; what happens to my stories if I stop paying; how the map knows where photos were taken; whether there are ads or a ranked feed. Two or three sentences each.

## 15. `Start` (`lp-start`, wash `tide`)

Head, one line (the trial terms from facts), `Start free` and `Log in`. The plate `plate-year-d` (`plate-year-m` on portrait) fills the band behind a keylined card, or the hero family stands beside it; pick what looks best and say why.

## 16. `Footer`

The wordmark fitted edge to edge by measurement (stacked in three lines on phones), every link the current page has (features, pricing, FAQ, about, alternatives, the five compare pages, privacy, terms, contact, log in; all from `ROUTES`, all plain anchors), the small print from SPEC's fixed lines, and `Our Family Socials` with no year (no dates in render).

## Checks

Look at your own sheets before reporting: each band at 1440x900 and 390x844 (use `/?only=close`), both billing states, the nav over all five washes plus paper and white, the phone menu open, 768 and 1920 once, reduced motion. Keyboard pass. Serve the built `dist` and confirm every link you render returns 200. Run `check-pricing.mjs`.

Report: files, sheet paths, the ten questions with the SPEC statement each answer rests on, the link check result, placeholders, weak spots.
