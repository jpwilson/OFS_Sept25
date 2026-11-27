# ART handover: generate, check and process every image

You own `landing-art/**`, `frontend/public/landing/img/**` and `frontend/src/landing/art/manifest.json`. Read `docs/landing/SPEC.md` first (look, cast, honesty rules). Do not edit anything else. Do not run git commands that change state.

## What already exists (look at these before anything else)

- `landing-art/prompts/_preamble.md`: the house look (studio look for cut-outs, snapshot look for photos, cut-out rules). Prepend it to every batch.
- `landing-art/prompts/_cast.md`: the thirteen people and the dog, with outfits. Prepend it to every batch that shows people.
- `landing-art/ref/cast-a.png` and `cast-b.png`: the two character sheets. Attach both (`-i`) to every batch that shows people.
- `landing-art/raw/look_*.png`: the look test. `look_photo_coast.png` is approved and becomes `photo-coast-cliff`. `look_kitchen_done.png` is approved and becomes `r-kitchen-done`. `look_cutout_family.png` is NOT used: the dog came out as the wrong breed, so `g-family-hero` is redone.
- The reference pipeline to port: `/Users/jpwilson/Documents/Projects/otherwise/art/process.mjs` and `art/sheets.mjs`, and its prompt files in `art/prompts/` (copy their structure).

## How to generate

From `landing-art/raw/`, one Codex session per batch:

```
cat ../prompts/_preamble.md ../prompts/_cast.md ../prompts/<batch>.md | ai codex main exec --skip-git-repo-check -s workspace-write -i ../ref/cast-a.png -i ../ref/cast-b.png -o _<batch>.last.txt - > _<batch>.log 2>&1
```

Leave out `_cast.md` and the two `-i` flags for batches with no people. For the kitchen batch attach `-i look_kitchen_done.png` instead. Run up to eight sessions at once as background commands; each image takes about a minute. Check `ai status codex` before you start and after; if the account drops below 15% left, stop and report. Follow `ai guide`: never log in, never switch to a pay-per-use key, never spend credits.

Write each batch file in the structure of the reference prompts: a one-line header saying the format (for example "all portrait 2:3, all CUT-OUT, all full body from the top of the hair to the soles of the shoes"), then numbered shots, each with its exact file name and one or two sentences. Rules that held up in the look test: name people in capitals and say what each is doing; say "Use sheet A and sheet B as the reference so these are the same people"; for the dog always say "small scruffy sandy terrier, knee-high, exactly as on sheet A"; no clothing in a wash colour (`#19CFC7` teal, `#FF62C4` pink, `#FF8A1F` orange, `#3AA8FF` blue, `#C6F135` lime) on cut-outs, or they vanish on that wash; no text, logos or brand marks anywhere; children are fully and ordinarily dressed in every image.

## The list (ids are final; file name is `<id>.png`)

**People and groups, CUT-OUT, full body.** Single people portrait 2:3, groups landscape 3:2.

| id | Shot |
|---|---|
| `g-family-hero` | MAYA, TOM, IVY, LEO close together, all looking at the camera: Maya in the middle holding a phone up in one hand, Tom's hand on Leo's shoulder, Ivy with both arms up, Leo mid-jump. BISCUIT at their feet looking up. Sheet outfits |
| `p-maya-phone` | MAYA alone, holding a phone up toward the camera in one hand, big smile. Sheet outfit |
| `p-biscuit` | BISCUIT alone, sitting, head tilted |
| `p-ruth-wave`, `p-joe-wave`, `p-kate-wave`, `p-marcus-wave`, `p-finn-nod`, `p-priya-wave`, `p-sam-wave`, `p-deb-wave` | Each alone, standing, greeting the camera (a wave; Finn a small nod with one hand half raised). Sheet outfits. Vary the gesture so no two match |
| `p-maya-talk` | MAYA speaking a voice note into the phone held near her mouth, other hand gesturing, mid-sentence, animated. White tee, indigo dungarees with a few paint flecks, mustard headscarf |
| `p-maya-tada` | MAYA, same outfit as `p-maya-talk`, both arms flung wide, delighted |
| `p-ruth-dish` | NANA RUTH carrying a casserole dish in oven gloves, pleased with herself |
| `p-tom-medal` | TOM just after a marathon: running vest and shorts in white and navy, race bib with no readable number, finisher's medal, foil blanket over his shoulders, exhausted grin, thumbs up |
| `p-ivy-cheer`, `p-leo-cheer`, `p-maya-cheer` | Each cheering wildly as if at a race barrier: Ivy with a hand-drawn sign with no text (just a big drawn star), Leo with a cowbell, Maya with both fists up |
| `p-sam-medal` | SAM in running kit with his own medal, arm raised |
| `g-family-hike` | MAYA, TOM, IVY, LEO walking toward the camera with small backpacks, Leo on Tom's shoulders, Ivy pointing off to one side, laughing. Summer walking clothes in their signature colours |
| `p-joe-suitcase` | GRANDPA JOE in a linen shirt and panama hat, hand on a small wheeled suitcase |
| `p-kate-pack` | AUNT KATE with a big hiking rucksack and walking poles |
| `p-marcus-camera` | UNCLE MARCUS with a camera on a strap, lining up a photo |
| `p-ruth-sunhat` | NANA RUTH in a wide sunhat and sandals, holding an ice-cream |
| `p-ivy-cake` | IVY in a party dress in red, carrying a birthday cake with nine lit candles, careful and proud |
| `p-leo-horn` | LEO in a paper party hat, blowing a party horn |
| `g-kids-beach` | IVY and LEO in shorts and tees with a bucket and spade, sandy knees |
| `g-kids-rocket` | IVY and LEO in a rocket made from a cardboard box, colander helmets |
| `p-leo-school` | LEO on his first day of school: too-big uniform jumper in grey, book bag, nervous grin |
| `p-ivy-trophy` | IVY in a tracksuit with wet hair, holding up a small swimming trophy |
| `p-joe-crown` | GRANDPA JOE in a paper party crown, clapping |
| `p-ruth-gift` | NANA RUTH holding out a wrapped present |
| `p-ruth-tablet` | NANA RUTH reading a tablet, hand to her chest, moved |
| `p-joe-phone` | GRANDPA JOE laughing at something on his phone |
| `g-kids-biscuit` | IVY and LEO kneeling, hugging BISCUIT |

**Objects, CUT-OUT, landscape 3:2.**

| id | Shot |
|---|---|
| `r-kitchen-done` | Already made: copy `look_kitchen_done.png` |
| `r-kitchen-fitted`, `r-kitchen-gutted`, `r-kitchen-before` | Edits of `r-kitchen-done` so the room, plinth and camera stay exactly registered. Fitted: cabinets in but unpainted primer grey, no worktops, bare plaster walls, wires hanging where the lamp will go, dust sheets. Gutted: bare brick and studs, exposed pipes, concrete floor, a wheelbarrow of rubble, no cabinets at all. Before: the same room with tired 1990s orange-pine cabinets, beige tiles, a strip light, cluttered worktops |
| `o-finish-arch` | A plain inflatable race finish arch in white and navy, no lettering |
| `o-barrier` | A length of metal crowd barrier with coloured bunting, no lettering |
| `o-campervan` | A cream-and-red vintage campervan, side-on three-quarter view, surfboard on the roof |
| `o-lighthouse` | A small white lighthouse on a rocky outcrop with a tuft of grass |
| `o-waymarker` | A wooden coast-path signpost with blank arms |

**Props, CUT-OUT, square 1:1, one object each, shot like a product photo.**

`prop-roller` (paint roller with sage-green paint), `prop-swatches` (a fan of paint swatch cards), `prop-tiles` (a small stack of patterned tiles), `prop-pizza-box` (plain, closed), `prop-medal` (finisher's medal on a ribbon, no text), `prop-shoe` (one white-and-navy running shoe), `prop-banana`, `prop-cowbell`, `prop-ice-cream` (cone, two scoops), `prop-binoculars`, `prop-bucket-spade`, `prop-flask` (a camping flask), `prop-balloons` (three balloons in red, yellow and white), `prop-present` (wrapped, ribbon), `prop-party-hat`, `prop-suitcase` (small, vintage, travel-worn), `prop-paint-pots` (two tins, one open), `prop-trophy` (small gold cup), `prop-school-bag`, `prop-pumpkin` (carved, friendly), `prop-print-stack` (a loose stack of white-bordered photo prints, top one face-down), `prop-mic` (a small handheld microphone).

**Photos, PHOTO, landscape 4:3, opaque, snapshot look.** These are the sample stories' own pictures. They appear as prints in the film and as content inside the real interface, so they must look like one family's camera roll.

| Set | ids and shots |
|---|---|
| Kitchen (February) | `photo-kitchen-before` (the tired orange-pine kitchen, nobody in it) · `photo-kitchen-sledge` (TOM in goggles mid-swing at a cabinet, dust) · `photo-kitchen-camping` (the family eating pizza on the living-room floor around a camping stove and a kettle) · `photo-kitchen-tiling` (MAYA kneeling, laying patterned floor tiles) · `photo-kitchen-paint` (IVY and LEO painting a cabinet door sage green, paint on Leo's nose) · `photo-kitchen-done` (the finished sage-green kitchen, the family at the island with pancakes) |
| Race (April) | `photo-race-start` (TOM and SAM among runners at a start line, early morning but bright, no readable signage) · `photo-race-mile20` (TOM mid-race, pained, grabbing a water cup) · `photo-race-kids` (IVY and LEO at a barrier with a sign showing only a big drawn star, NANA RUTH behind them) · `photo-race-finish` (TOM crossing the line, arms up) · `photo-race-hug` (MAYA hugging TOM in his foil blanket) · `photo-race-chips` (the family and SAM at a cafe table with chips, medals on) · `photo-race-video` (a horizontal frame as if from a phone video: TOM running toward the camera on the final straight, crowd either side) |
| Coast (August) | `photo-coast-cliff` (already made: copy `look_photo_coast.png`) · `photo-coast-harbour` (the family on a harbour wall with ice-creams, fishing boats behind) · `photo-coast-mine` (IVY looking up at a ruined stone engine house on a clifftop) · `photo-coast-beach` (LEO and BISCUIT running at the sea's edge on a wide sandy beach) · `photo-coast-van` (the cream-and-red campervan parked on a clifftop pitch, washing line, camp chairs) · `photo-coast-theatre` (the family sitting on the stone seats of an open-air clifftop theatre above the sea) |
| Year | `photo-year-birthday` (IVY blowing out nine candles, family around the table, GRANDPA JOE in a paper crown) · `photo-year-school` (LEO at the front door in a too-big grey jumper with a book bag) · `photo-year-rocket` (IVY and LEO in the cardboard rocket in the garden) · `photo-year-gala` (IVY on a poolside with a small trophy, towel round her shoulders) · `photo-year-halloween` (a carved pumpkin on the doorstep, LEO as a dinosaur) · `photo-year-joe70` (GRANDPA JOE at the head of a long garden table at his seventieth, everyone raising glasses) |
| Relatives' own stories (for the world map) | `photo-trip-joe` (GRANDPA JOE on a hotel terrace above a bright Mediterranean harbour) · `photo-trip-kate` (AUNT KATE and FINN at a mountain summit cairn) · `photo-trip-marcus` (UNCLE MARCUS in a neon-lit city street at dusk-blue hour but bright and sharp, street food in hand) · `photo-trip-ruth` (NANA RUTH on a ferry deck with a headscarf, island behind) |

**Plates, PLATE, opaque.** `plate-year-d` (landscape 3:2) and `plate-year-m` (portrait 2:3): the whole cast of thirteen and Biscuit in a summer garden at Grandpa Joe's seventieth, long table, bunting with no lettering, everyone turned to the camera, bright midday. Make the landscape first and the portrait as a recomposition of the same scene.

## Checking (do this by eye, every image)

Port `sheets.mjs` and build contact sheets of the cut-outs on each of the five wash colours and of the photos on white. Read each sheet image yourself. Reject and regenerate (in a small fix-up batch) anything with: wrong number of fingers or fused hands; a cropped head, foot or hand; a pale or dark halo around the cut-out; a face that is not the person on the sheet; the wrong dog; any text, logo or watermark; a child not ordinarily dressed. Check the four kitchens overlay exactly (make an overlay sheet at 50% opacity). Keep a short reject log.

## Processing

Port `process.mjs` to `landing-art/process.mjs` (its own `package.json` with `sharp`; do not add sharp to `frontend/`). Output to `frontend/public/landing/img/<id>.<hash8>.webp` plus a phone size `<id>.<hash8>.m.webp` (long edge 760 for people and props, 900 for photos). Desktop long edges: people 1400, groups 1800, objects 1800, props 700, photos 1600, plates 2400. Trim cut-outs to their alpha box with a 2% margin; crop the four kitchens to one shared union box. Write `frontend/src/landing/art/manifest.json`: an object keyed by id with `src`, `srcM` (paths from the site root, `/landing/img/...`), `w`, `h`, `kind` (`person`, `group`, `object`, `prop`, `photo`, `plate`), `alpha`, and for people and groups `feet` (y of the lowest opaque row, 0..1), `headTop` (y of the highest, 0..1) and `ax` (x of the centre of the feet, 0..1), measured from the alpha as the reference does. Also derive `cover-<story>` crops (16:10, 1200 wide) for the five sample stories from `photo-kitchen-done`, `photo-race-finish`, `photo-coast-cliff`, `photo-year-birthday`, `photo-year-joe70`, with kind `photo`.

Add `landing-art/raw/` to the repo's `.gitignore` (raws are about 2MB each). Commit nothing yourself.

## Order

1. Photos first (four batches), because the interface captures depend on them. Process and write the manifest as soon as they pass, then tell the director the photos are ready before continuing.
2. People (five batches), objects and kitchens, props (two batches), plates.
3. Sheets, rejects, fix-ups, final process.

Report: counts made, rejected and redone; the sheet paths; the manifest path; total bytes in `public/landing/img`; Codex usage before and after; anything that still looks weak, named by id.
