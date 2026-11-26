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

## Round three (26 November 2026)

### Section uplevel (ROUND3 §3, §4)

Every section now opens on a poster: the claim in display type (52-116px desktop, 64-96px iPad portrait, 46-62px phone) beside one of the family, then the detail. No fact was removed. Body copy is 17-19px desktop, 16-17px phone; every label that carries meaning is at least 13px (the shared `Label` stays 11.5px; each module overrides it with a two-class rule). Breakpoints used by the package: phone `<=640`, iPad portrait `641-1023`, iPad landscape/narrow desktop `1024-1199`, desktop `>=1200`.

- **Limits**: head + lede beside a stage card with `p-ruth-tablet` (the home-screen web app) and `prop-print-stack` (keep your originals). The eight statements became eight cards, each with a short display-type key (`LIMITS.items[].key`, e.g. "No app store", "`${fact('videoSeconds')}`-second clips") above the statement and its consequence. 4 columns desktop, 2 on iPads, 1 on phone.
- **Compare**: head + lede with `p-marcus-camera` on an azure floor. Each short answer is split (`splitShort` in `content/close.js`) into "where they win", set in display type, and "where we fit", at body size: two `<span>`s of one `<p>`, so the page text is still the marketing.js answer exactly. The phone clamp/toggle is gone. 2x2 cards on desktop and iPad portrait.
- **Plans**: the poster is the claim itself: Grandpa Joe (`p-joe-phone`) under a "$0 to read" tag and Maya (`p-maya-talk`) under "$9 a month to write" (both `data-price`, checked). Cards are 3 across on desktop and iPad landscape; on iPad portrait Pro leads full width with Free and Lifetime below; phone stacks. The trial became "Try writing, free." with four big terms (30 days, No card, 5 stories, 50 photos), each with its line.
- **Questions**: bigger head and type, `p-kate-wave` on a lime floor under the side column; on iPads the head and Kate sit side by side above the list.
- **Start**: terms are now 18px bold body text (were 12.5px mono caps). iPad portrait shows the landscape plate full width with the card under it (the card no longer covers Leo or Biscuit); phone uses `plate-year-m` with the card below the note. Plate crop checked with the re-issued candid family photo: no face under the nav, Biscuit whole.
- `check-pricing.mjs` drops inline `<span>` tags before looking for the short answers (because of the split above).

### The band after the film, and `content/business.js`

- `Milestone` (`close/Milestone.jsx`, `#lp-milestone`, sun wash) is mounted unconditionally from `Page.jsx` right after `<Film />`: "1,000,000 members" (numeral and noun both in display type, no count-up), "We just welcomed our [millionth] member.", "Like everyone before them, they chose to keep their life private from the world and share it with the people closest to them.", the household cut-out with balloons. People, prop and caption are design, in `MILESTONE` in `content/close.js`.
- The Start card always shows "Join more than a million people sharing with family and close friends, privately and ad-free." in a sun box (`Start.module.css .join`).
- **`src/landing/content/business.js`** holds the business figures and sentences: `members`, `membersWords`, `membersUnit`, `milestoneHead`, `milestoneLine`, `joinLine` (which fills `{membersWords}`), each with `src: 'supplied by the owner, 2026-11-26'`. They are supplied by the business, not derived from the code, so `check-facts.mjs` skips the file by name. Components read them through `biz(id)`; change a value there and the page changes with no layout edit.
- There is no vision flag or alternate wording any more: `variant.mjs`, both Vite configs and `landing.config.json` are back to their state before that layer.

Band shots: `frontend/shots/band-{m,tp,tl,d}.jpg` (band and final card side by side).

Sheets: `frontend/shots/close3-{m,tp,tl,d}/sheet.jpg` (`/?only=close`). (The older `vision-*` sheets show a removed experiment; ignore them.)
