# Landing round three: the owner's review of 26 November 2026

Read after `SPEC.md` and `ROUND2.md`. Where this file differs from them, this file wins. The owner's verdict on round two: "I really do love them. I just think that we could get it across a bit better... Don't change any of the main essence of it."

## 1. Cast

- **Uncle Marcus is recast** (done): white, 44, dark-blond hair greying at the temples, tortoiseshell glasses. Sheet B is `landing-art/ref/cast-b.png`. Every image id is unchanged.
- **Anything that reads as "the family" shows the family only:** the household, Nana Ruth, Grandpa Joe, Aunt Kate, Uncle Marcus, Finn and Biscuit. The friends (Priya, Sam, Deb) stay in the friends' places: the race chapter, the Followers and Custom Group audiences, comments. They are not in the family group photo.
- Ivy is 8 for most of the sample year (she turns nine in November) and Leo is 5.

## 2. The film

| Chapter | Change |
|---|---|
| 01 Maine coast | Headline becomes **"Record every family [event]."** (it was "Record every [vacation]."; chapter 02 already says vacation). Maya no longer wears a backpack here: `g-family-hike` is re-issued under the same id. |
| 02 Tetons | Unchanged: "Interactive vacation [memories]." This is the only chapter where the family wears backpacks. |
| 03 The world | Headline becomes **"Every trip. Every event. On your family's timeline and [map]."** The owner's words were "Every trip. Every event on your family's timeline map"; "and" is there because Timeline and Map are two views in the app today. The sub line should say both: every story with a place is a pin on the map, and the same stories run in date order on the timeline. The Tetons hikers must not appear again: the group here is the new cut-out **`g-family-beach`** (the four of them on the beach in Maui with a surfboard, snorkels and a boogie board; no backpacks). |
| 07 The year | Becomes **through the years**. See below. Headline unchanged: "Every year's most memorable [moments]." |
| Close | `plate-year-d` and `plate-year-m` are re-issued under the same ids as a candid photograph of the family only (see 1). |

### Chapter 07: the same two kids, growing up as you scroll

The owner: "As you scroll it should show them through the years... the same with the boy next to her so you can see it's the same kids over the years. The photos next to them, I like, are the photos of them that year."

Five stages. Each stage is one matched pair cut-out (Ivy on the left, Leo on the right, standing side by side, facing the camera, full length, same framing and floor line in all five so one replaces the next in place) and two photographs from that year.

| Stage | Ivy | Leo | Pair cut-out | That year's photos (id: title) |
|---|---|---|---|---|
| 1 | 8 | 5 | `g-years-1` | existing: `photo-year-birthday` (Ivy turns nine), `photo-year-school` (First day of school) |
| 2 | 10 | 7 | `g-years-2` | `photo-years-2a`: Ivy's science fair · `photo-years-2b`: Leo rides without training wheels |
| 3 | 13 | 10 | `g-years-3` | `photo-years-3a`: Ivy's first band concert · `photo-years-3b`: Leo's team wins the league |
| 4 | 15 | 12 | `g-years-4` | `photo-years-4a`: Ivy gets her learner's permit · `photo-years-4b`: Leo and Grandpa Joe go fishing |
| 5 | 20 | 17 | `g-years-5` | `photo-years-5a`: Ivy, home from college for Thanksgiving · `photo-years-5b`: Leo graduates high school |

Rules:
- Label stages by **age** ("Ivy at 10 · Leo at 7"), never by calendar year: these are illustrations of a sample family and the page must not suggest the product has years of history.
- One pair is visible at a hold. The change from one stage to the next completes; no two versions of a child are on screen at rest (the rule from the Otherwise page: nothing that duplicates a subject persists at a hold).
- The children grow: the pair scales with age from the same floor line. A pencil-marked height chart is a welcome prop if it earns its place.
- The photo stack beside them changes with the stage and the category chips follow (Birthdays, Milestones, Daily Life, Holidays).
- Until the new art is in the manifest, build with `g-kids-beach` as a stand-in for missing stages; look ids up through the manifest and guard for absence.

## 3. The sections below the film

The owner on "Why it is different": "It's like 60% of the way there but I need it at 99% or 100%." And of all the lower sections: "I really do love them. I just think that we could get it across a bit better."

Director's assessment, from the round-two sheets: every fact is right and the owner is glad it is all there, but the sections speak like documentation where the film speaks like a poster. The claim is often carried by a 10px mono label or a small paragraph, the interface captures are too small to read, and several are dark.

The standard for round three, for every section:
1. **Five-second test.** The first screen of a section states its one claim in display type and proves it with one visual. A stranger glancing at it can say what it claims. Details follow below or open on demand; nothing is deleted.
2. **No claim rests on a small label.** A big numeral always sits beside its noun at a comparable size ("0 ads", never a "0" with a small "ADS" tag).
3. **Reading sizes:** body at least 18px on desktop and 16px on a phone; nothing that carries meaning under 13px.
4. **Captures earn their size:** large enough to read, or cropped to the part that proves the point. Prefer a light capture to a dark one wherever a light one tells the same story (the owner reads dark as worse).
5. **People.** The cut-outs are what he loves. Each section's lead visual should have the family doing something that makes the claim.
6. Keep the voice, the facts discipline (`fact(id)`), and "who can open", never "see".

"Why it is different" specifically:
- The statement is made as **three separate beats**, each its own large line arriving in turn: "LinkedIn is for work." / "Instagram and X are for an audience." / "Our Family Socials is for [family]." The boxed word alternates between **family** and **close friends** on a slow pulse (static "family and close friends" for reduced motion and for the prerender).
- The three cards become three complete claims: **"0 ads"** (with one plain line: there are no ads and no sponsored posts; the people who publish stories pay for it), **"5 ways to share"** (the five audiences in the standing order), **"0 ranking"** or "In date order" (nothing is ranked; your family's stories are listed by date). Check each against `content/facts.js` before writing it.

## 4. Phone, iPad and desktop

"Make sure that this is responsive so it looks amazing on a phone as well as an iPad." Every package now designs and shoots **four** viewports and sheets them all: phone 390x844, iPad portrait 820x1180, iPad landscape 1180x820, desktop 1440x900. The iPad layouts are designed, not a stretched phone or a squeezed desktop. Touch targets at least 44px on phone and iPad.

## 5. The vision layer (pitch only, never the live site)

The owner is preparing a pitch: what this page looks like once the company has a million members. He asked for lines such as "Join tens of thousands of others who share with their family and friends all across the world" and "We've just celebrated our millionth member, who's chosen to keep their life private from the world but share it with their close family and friends."

Those figures are projections. They may appear in a pitch build and never on the public site while they are untrue. So:

- A build flag, **`__LANDING_VISION__`**. It is on when `VITE_LANDING_VISION=1`, or when `frontend/landing.config.json` has `"vision": {"preview": true}` and the build is a Vercel preview. `scripts/landing/variant.mjs` resolves it and **throws if it would be on for a production build**; the script does not accept a production value from config at all. Making any of this public later is a deliberate code change, made when the numbers are real and go through `fact()`.
- With the flag off the page is exactly as it is without this layer: no markup, and none of the vision copy in the bundle (import it behind the flag so it is dropped).
- With the flag on, the page gains: a milestone band after the film ("We just welcomed our millionth member. Like everyone before them, they chose to keep their life private from the world and share it with the people closest to them."); a line by the final call to action ("Join more than a million people sharing with family and close friends, privately and ad-free."); and a small fixed tag, always visible, reading **"VISION MOCK-UP · PROJECTED FIGURES"**, with the same sentence in the footer note.
- The copy lives in `src/landing/content/vision.js`, each figure marked `projected: true`. `check-facts.mjs` skips that one file by name, with a comment saying why.
- No invented quotes, names, press logos, ratings or awards in either mode.

## 6. Held for the owner's choice

He asked for suggestions, not changes, on **other things families share** (baptism, graduations, a school science project) and liked the idea of showing many of them near the bottom. A list is being drawn up for him to choose from; nothing is built until he picks.
