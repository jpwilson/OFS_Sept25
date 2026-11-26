# Round two: the owner's review, and what changes

Read `SPEC.md` first. This file records the owner's review of the first build (2026-11-26) and the changes that follow from it. **Where this file and SPEC.md differ, this file wins.** Everything in SPEC.md that is not mentioned here still holds, above all the honesty rules.

## What the owner said

He likes it a great deal ("I really, really like it") and wants it pushed further. His points, in his words where it matters:

1. The hero: "I love the scroll that adds people, but it needs to be closer." "I would bring them in slowly so it shows, and you more clearly see the private group merge to Close Family." "Just as the people transition in for Close Family, the wording should change from Private to Close Family. That wording should move in so people can see that change. They don't just see people popping in as they scroll."
2. Private: "it should somehow be a bit more clear that this is just online photo albums of all your family memories, just for you."
3. Order of the audiences: Private, then Close Family, then friends and followers together, then Custom Group, then Public.
4. The sample family should read plainly as one family. The household becomes a white family; in-laws and friends stay varied. He loves the dog.
5. Chapter order: "The kitchen reno and the sports must come after family vacation and then a wedding." "There should be two or three vacations." The coast scene "should come first".
6. Punchlines: lead with the occasion, not the mechanism. "It should also say 'Record all your vacations' or 'interactive vacation memories'." For the kitchen: "Doing a kitchen reno, document the process for yourself and family and friends." Instead of "A year you can actually find": "Every year's most memorable moments." "Think about the target audience. It's going to be people that are having these memories and vacations."
7. Creating: "people can just do photos, or they can give you a voice note summary of the holiday as well. You can ask them questions to make it even better, but you make it immediately with just photos, or with photos and some text, or photos and a voice note."
8. "Make sure that the mobile web view is just as amazing and the experience is just as good."
9. What he responds to most (confirmed from his own screen recording of the reference): people popping in around a centre subject, and a first screen that rests bright.

One thing he asked for that we will not do: implying a customer count. No user numbers, no "trusted by", no invented quotes. The page earns trust by being specific, polished and true.

## Voice, restated

Write for someone who has just come back from a trip, or is planning a wedding, or is halfway through a renovation. Every headline names the moment or the memory; the sentence under it says how the product does it. American English throughout ("mom", "color", "vacation", "favorite"). Still plain, warm and specific; still no hype words, no exclamation marks, no "not X, but Y", no em-dash asides, and every number through `fact()`.

## The sample family (replaces SPEC's section)

They are American. Household: **Maya** 38 (the mom), **Tom** 40, **Ivy** 9, **Leo** 5, **Biscuit** the terrier. Grandparents: **Nana Ruth** 68 (Tom's mother), **Grandpa Joe** 71 (Maya's father). **Aunt Kate** 43 (Tom's sister), **Uncle Marcus** 35 (Kate's husband), **Finn** 14 (Kate's son). Friends: **Priya** 37, **Sam** 41, **Deb** 56. The new character sheet is `landing-art/ref/cast-a.png`; sheet B is unchanged.

Followers are the eight non-household people. Close Family is Ruth, Joe, Kate, Marcus. The Custom Group "Run club" is Sam, Priya, Deb. Counts stay computed from `content/cast.js`; update its notes (Marcus is Kate's husband).

Sample stories, in page order:

| Story | Month | Category | Audience | By |
|---|---|---|---|---|
| A week on the Maine coast | August | Vacations | Followers | Maya |
| Seven days in the Tetons | June | Vacations | Followers | Tom |
| Spring break in Maui | March | Vacations | Followers | Maya |
| Kate and Marcus get married | May | Wedding (their own category) | Followers | Maya |
| Six weeks without a kitchen | February | Projects | Followers | Maya |
| Dad's first marathon | October | Milestones | Custom Group: Run club | Tom |
| Ivy turns nine | November | Birthdays | Close Family | Maya |
| Grandpa Joe at seventy | December | Family Gatherings | Followers | Tom |

Relatives' own stories for the world map: Nana Ruth, an Alaska cruise (Juneau); Grandpa Joe, Galway, Ireland; Kate and Marcus, their honeymoon on the Amalfi coast.

Stops, with real coordinates (also the fixture data):
- **Maine coast:** Portland Head Light 43.6231, -70.2079 · Camden harbor 44.2098, -69.0648 · Bar Harbor 44.3876, -68.2039 · Cadillac Mountain 44.3527, -68.2251 · Jordan Pond 44.3200, -68.2540 · Bass Harbor Head Light 44.2220, -68.3373.
- **Tetons:** Jackson Town Square 43.4799, -110.7624 · Mormon Row 43.6608, -110.6653 · Schwabacher Landing 43.7109, -110.6719 · Jenny Lake 43.7510, -110.7228 · Hidden Falls 43.7654, -110.7447 · Inspiration Point 43.7663, -110.7430 · Taggart Lake 43.7069, -110.7541 · Snake River float (Deadman's Bar) 43.7598, -110.6234 · Oxbow Bend 43.8660, -110.5490 · Signal Mountain 43.8504, -110.5713 · Colter Bay 43.9020, -110.6413 · String Lake 43.7870, -110.7290 · Teton Village tram 43.5875, -110.8279.
- **Maui:** Ka'anapali Beach 20.9260, -156.6950.
- **Wedding:** a barn venue in the Hudson Valley, 41.7004, -73.9210 (sample).

## Washes (adds two)

| Wash | `--l-wash` | `--l-wash-deep` | Used by |
|---|---|---|---|
| `tide` | `#19CFC7` | `#0FB8B1` | Hero, family portrait |
| `azure` | `#3AA8FF` | `#1F93F0` | 01 Maine coast, 03 the world |
| `lime` | `#C6F135` | `#AEDB1C` | 02 Tetons |
| `fizz` | `#FF62C4` | `#F247AF` | 04 Wedding |
| `zest` | `#FF8A1F` | `#F27405` | 05 Kitchen |
| `violet` | `#A98BFF` | `#8F6CF5` | 06 Marathon |
| `sun` | `#FFD43B` | `#F2C21C` | 07 The year |
| `paper` | `#F4F7FB` | `#E3E9F2` | The app, quiet bands |

Text is ink on all of them. The foundation adds `sun` and `violet` to `styles/tokens.css` and `WASHES`.

## The film, round two

**Hero (tide).** The page now opens on **Private**: the household alone, large and close, the word `private` behind them, and a line that makes Private mean something: `Private · Your family's own albums and memories, kept just for you.` Scrolling walks through the audiences, one hold each, in this order: **Private, Close Family, Followers, Custom Group, Public**. At each step:
- the people who gain access rise in slowly (about twice as long as now) and stand **close** to the household: shoulder to shoulder at near full scale, a second row tucked just behind, no gaps and no shrinking line-up;
- the big word changes with visible movement: the old word slides out as the new one slides in, in step with the people, so a visitor reads "private" becoming "close family" while the grandparents arrive;
- the readout names who can open it and the count, from `cast.js`;
- Custom Group shows the Run club stepping forward while the others step back, not vanish;
- Public keeps everyone and adds the grey silhouettes tagged `ANYONE WITH THE LINK`.
The switch shows the same five options in the same order, follows the scroll, and clicking an option glides to that step. The Followers option keeps the app's name `Followers` with the small note `friends and family who follow you`. The head, sub, buttons and note stay. Each step holds for at least 45svh. No intro auto-play is needed now that scrolling tells it; under reduced motion and with script off the hero poster rests on Followers with the switch working, as today.

**Chapters, in this order** (each keeps its scene grammar from round one unless noted):

| # | Scene | Wash, ghost | Eyebrow | Head | Body | Built from |
|---|---|---|---|---|---|---|
| 01 | Maine coast | `azure`, "trips" | `STORY · AUGUST · VACATIONS` | Record every [vacation]. | Your photos already know where. The place and time are read from each one, and every stop lands on the trip's own map. | the round-one MAP scene, with the Maine stops |
| 02 | Tetons | `lime`, "tetons" | `STORY · JUNE · VACATIONS` | Interactive vacation [memories]. | Seven days, thirteen stops, one map you can follow day by day. Tap a stop and you are back at the lake. | new scene (below) |
| 03 | The world | `azure`, "world" | `THE MAP VIEW` | Every trip, on your family's [map]. | One pin per story, grouped where they crowd, all the way out to the whole world. | the round-one world scene, with pins at Maine, the Tetons, Maui, Juneau, Galway and Amalfi |
| 04 | Wedding | `fizz`, "wedding" | `STORY · MAY · WEDDING` | The whole wedding, in one [place]. | Every photo with its caption, the speeches on video, and the family's replies underneath. | the round-one READ scene, recast (below) |
| 05 | Kitchen | `zest`, "home" | `STORY · FEBRUARY · PROJECTS` | Doing a kitchen reno? Document every [step]. | For yourself, and for the family and friends following along. Add the photos and talk it through, and the story writes itself up. | the round-one TELL scene, unchanged in action, on the new wash |
| 06 | Marathon | `violet`, "race" | `STORY · OCTOBER · MILESTONES` | Race day, from the start line to the [finish]. | Photos, clips of the last mile, and exactly the right crowd. This one went to the Run club. | the marathon cast and props from round one, re-staged around the audience chip |
| 07 | The year | `sun`, "year" | `EVERY YEAR` | Every year's most memorable [moments]. | Birthdays, holidays, first days and big wins, filed by date, person and category so you can find any of them again. | the round-one YEAR scene |
| 08 | Portrait | `tide`, "ours" | `ONE YEAR · ONE FAMILY` | Every story has its own [audience]. | as now | as now |
| 09 | The app | `paper`, "feed" | `THE APP` | And this is what they [open]. | as now | as now, with more energy (below) |
| 10 | Close | plate | | One place for every [memory]. | Free to view, forever. Free to try for the trial's days. Then the monthly price, billed yearly, to keep writing (all from facts). | as now |

"Seven days" and "thirteen stops" are sample numbers: they live in `film.sample.js` and the slate says `SAMPLE STORY`.

**02 Tetons, the new scene.** The family in hiking gear centre (`g-family-tetons`); behind them the mountain range rises (`o-teton-range`); the family car with a roof box rolls in (`o-suv-roofbox`); a canoe, a moose at the tree line, a cabin. Along the floor a route with thirteen numbered stops grouped into seven day-chips (`DAY 1` to `DAY 7`): as you scroll, the day chip advances, that day's stops light and its prints pop (`photo-tetons-*`), so the chapter plays the trip day by day. The real journey-map capture of this story (`ui-story-tetons-journey`) lands at the hold. Readouts: days and stops (sample); `TAP A STOP · ITS PHOTO, PLACE AND TIME` (verified: a tap opens a card with that stop's photo, number, place, date and time; it does not scroll the story, so never say it does); map layers from its fact. Grandparents rise to read it.

**04 Wedding.** Kate and Marcus centre (`g-wedding-couple`) under a flower arch (`o-wedding-arch`); the gallery wall assembles from `photo-wedding-*` with captions; a video tile of the speeches fills its ring; the real lightbox capture lands; the family arrives dressed up (`g-family-wedding`, `p-ruth-hanky`, `p-joe-toast`, `p-finn-suit`); reaction badges and two comment cards. Props: cake, bouquet, confetti, champagne flutes. Readouts as READ had: photos per story, clip length, reactions, replies.

**05 Kitchen.** Add one more beat to the creation story, because the owner asked for it: three small chips land in turn beside the voice note, `JUST PHOTOS`, `PHOTOS + A FEW WORDS`, `PHOTOS + A VOICE NOTE`, and then `IT CAN ASK YOU QUESTIONS`. True statement behind it: AI Create needs photos or a description, so photos alone are enough; typed or spoken words are optional; AI Interview asks follow-up questions.

**09 The app.** It was the quietest screen. Give it weight: the feed capture large and tilted in a keylined frame, the other captures fanning out behind it one by one, the floor in tide not paper, two or three readers at the sides at full scale.

Drop the January-to-December counter (the chapters are no longer in month order); a small `01 / 07` chapter counter replaces it. Rail chips: `TRIPS`, `WEDDING`, `HOME`, `RACE`, `YEAR`, `THE APP`.

Rules carried over from the reference build's own post-mortem: no scroll-driven oscillation faster than one cycle per 25svh, with smooth curves; a speed trail or echo is for the move only, and nothing that duplicates a subject may persist at a hold. To catch stutter without video, step the scroll in 2svh increments in Playwright, record each actor's rect and opacity, and count direction changes and the largest per-step jump (see `/Users/jpwilson/Documents/Projects/otherwise/shots/runner-check.mjs`).

**Phone is held to the same bar.** Every chapter keeps its real capture and its key motion on a 390-wide screen: nothing is dropped for room; it is re-staged. The hero's step-through, the Tetons day-by-day, the wedding gallery, and the app scene must each be as good on a phone as on a desktop. Judge every hold on phone sheets.

## Section headlines, round two

| Section | Head |
|---|---|
| Difference | Social media is built for an audience. This is built for your [family]. (unchanged) |
| How | From camera roll to family in [four] steps. (unchanged) |
| Create | Just photos. Or add a few words. Or just [talk]. |
| Import | Drop in the camera roll. Out come the vacations, the birthdays, the [weekends]. |
| Anatomy | Everything a great trip [deserves]. |
| Places | Every vacation, every stop, on one [map]. |
| Views | Every memory, four ways to [find] it. |
| Audience | Grandma gets the birthday. The run club gets the [race]. (eyebrow: `EXACTLY WHO CAN OPEN WHAT`) |
| Family | It knows who is [who]. (unchanged) |
| Limits, Compare, Plans, Questions | unchanged |
| Start | Start with your last [vacation]. |

Create's body now says: it makes the story straight away from the photos alone; a few typed lines or a voice note make it better; and AI Interview asks a few questions to make it better still. The three mode cards stay.

Anatomy, Places and Views switch their sample to the Maine coast story and its stops; Views shows the eight story cards.

## Added true statement

- AI Create needs photos or a description, not both: photos alone are enough. A typed description and a voice note are each optional. (`frontend/src/components/QuickAddModal.jsx:395,419`; `backend/app/api/ai_creator.py:188-191`)

## Who does what

- **Art:** the new household, the wedding, the Tetons (thirty photos) and Maui; see `handover/ART2.md`.
- **Captures:** new fixtures for the eight stories and re-shoot everything; see `handover/CAPTURE2.md`.
- **Film:** as above.
- **Sections:** the headline and copy pass above, the Maine sample, and re-shooting with the new art.
- **Foundation:** the two washes, and `AudienceSwitch` in the new order with a `size` option.
