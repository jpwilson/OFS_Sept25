# Landing round four: the owner's review of 26 November 2026 (afternoon)

Read after `SPEC.md`, `ROUND2.md` and `ROUND3.md`. Where this file differs from them, this file wins.

His verdict: "So far I'm really liking it." Then a firm correction to the tone of the lower sections, which this round fixes everywhere.

## 1. The voice rule (applies to every page and every future change)

His words: "Saying where others are better is the worst thing in the world... We don't talk like that." "You don't see on Tesla's website: 'this is why you should buy other cars.'" "'What it does not do' is terrible... These are all things we plan to improve." "You're trying to help us build a business and make people happy."

So:
- **Marketing never volunteers a limitation, a caveat or a competitor's strength.** No "what it does not do", no "where the others are better", no "limits in plain sight", no "worth knowing", no "Beta" tags, no "trimmed to", no "not a backup", no "there is no app".
- **Say what it does, in the positive, and say it warmly.** "Fun, honest and open" in his words: confident, never apologetic.
- **Everything stated must still be true.** A capability is described as it works today. Details a customer needs before buying stay where customers look for them: the plan cards (what each plan includes) and the FAQ answers, written plainly and positively.
- **No "sample family", "sample story", "made-up" or "AI-generated illustration" labels on the page.** One short line in the footer covers it (section 5).
- The audience wording rule still holds: say who can **open** a story.

## 2. "What it does not do" is removed. In its place: "Why families love it"

Section id `lp-love`, in the slot `lp-limits` had. Kicker `WHY FAMILIES LOVE IT`, head "Why families [love] it."

Cards in the colours he picked out (tide, fizz, zest, repeating), each with a large candid photograph, a short display line and one or two sentences. The six reasons, taken from the reasons he gave:

| # | Display line | Sentence | Photo id |
|---|---|---|---|
| 1 | Grandparents see the everyday. | Dinner out, the school play, an ordinary Tuesday: your parents see what the grandkids are up to, the day it happens. | `photo-love-grandparents` |
| 2 | You decide who opens it. | Every story goes to the people you pick: just you, close family, your followers, a group, or anyone with the link. | `photo-love-control` |
| 3 | Far apart, still close. | Family spread across the country keeps up with each other again, without a group chat and without a scroll machine. | `photo-love-far` |
| 4 | Easy to make. Always looks great. | Add your photos, say a few words, and the story is written and laid out for you. | `photo-love-easy` |
| 5 | Scroll back through every memory. | Every trip, birthday and first day, in order, on a timeline and a map you can come back to for years. | `photo-love-timeline` |
| 6 | Turn a story into a photo book. | Your favourite stories, printed and on the coffee table. | `photo-love-book` |

Card 6 describes photo books, which are being built now (see `docs/app/` when its plan lands). **The page must not go live (production flipped to `story`) with card 6 unless photo books can be ordered.**

**Testimonials.** The owner wants this section to be testimonials. The section is built to hold them: `frontend/src/landing/content/testimonials.js` exports a list, empty for now, of `{ name, role, quote, photo, src }` supplied by the business from real members who agreed to be quoted. When the list has entries, they render as quote cards (photo, first name, a few words about them, their words) leading the section, with the reasons beneath. **Nobody on the build invents a customer, a name, a quote or a customer photo**: a testimonial is only ever a real person's words. Until real ones arrive, the six reason cards carry the section in the company's own voice (no names, no quotation marks).

## 3. The comparison section becomes "Why Our Family Socials"

- Kicker `WHY OUR FAMILY SOCIALS`. Head built from `business.js`: "Why {a million} people are moving to Our Family [Socials]." Under it, also from `business.js`: "Join more than {a million} people sharing their private moments with the people who matter to them."
- Four cards, one per place people come from: "Coming from a private Facebook group?", "Coming from Tinybeans?", "Coming from FamilyAlbum?", "Coming from a private Instagram account?". Each says what you get here, in two or three confident sentences. Nothing about where the other is stronger. Describe other products neutrally and accurately or not at all; never run them down.
- `check-pricing.mjs` no longer requires the cards to match `marketing.js` short answers; it keeps checking prices.
- The comparison pages themselves (`/alternatives`, `/compare/*`, in `src/content/marketing.js`) are rewritten in the same voice: they open with why Our Family Socials, drop every "Choose X if…" lead, and carry the join line. These are live pages, so this copy goes live when the branch is merged (it is not behind the landing gate).

## 4. Questions

Head is "FAQ". Answers are short, positive and true. "Is there an app?": "Yes. Add Our Family Socials to your phone's home screen today, and our iPhone app is on the way."

## 5. Footer

- "© 2026 Our Family Socials. All rights reserved."
- Columns, linking only to pages that exist: **Product** (Features `/features`, Pricing `/pricing`, FAQ `/faq`), **Compare** (Why Our Family Socials `/alternatives`, How to share kids' photos privately `/compare/how-to-share-photos-privately`), **Company** (About `/about`, Blog `/blog`, Contact `/contact`), **Legal** (Privacy Policy `/privacy`, Terms of Service `/terms`), **Account** (Log in, Start free). The word "Alternatives" does not appear; the individual "vs" links leave the footer (they are reached from the compare page).
- The long note about AI-generated illustrations becomes one short line: "Photos on this page are illustrative."

## 6. Elsewhere on the page

- Remove every "SAMPLE FAMILY", "SAMPLE STORY", "MADE-UP", "AI-GENERATED ILLUSTRATION" tag and the footnote under the hero. Captions such as "REAL INTERFACE. SAMPLE FAMILY." become "The real app." or go where they add nothing.
- Remove limit-led copy in the film, explain and proof packages: the "Beta" readout, "trimmed in the editor", the AI Create "limits, in plain sight" row, the proof section's "Worth knowing" cards, "No location in a photo? Add the place by hand." Say the capability instead ("Video clips right in the story", "Add a place to any photo").
- Smart Import and the rest keep everything the owner has praised.

## 7. Also asked for in this review (tracked outside the landing page)

- The native iOS app: start now.
- A sign-in and sign-up that is exciting and works on web, mobile web and iOS, with Google.
- Photo books as a real feature, through a US print partner.
- A new logo: six options are in `landing-art/logo/options.png`, awaiting his pick.
