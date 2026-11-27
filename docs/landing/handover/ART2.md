# ART, round two: the recast household, a wedding, the Tetons, Maui

Read `docs/landing/ROUND2.md` first (the owner's review and the new sample family and stories). Your pipeline, rules and checks from `ART.md` all still apply. Same ownership as before: `landing-art/**`, `frontend/public/landing/img/**`, your entries in `frontend/src/landing/art/manifest.json` (never touch `kind: "ui"` entries), and nothing else.

## What changed

The household was recast so it reads plainly as one family. `landing-art/ref/cast-a.png` is the **new** sheet A (the old one is `cast-a-v1.png`; do not use it). `landing-art/prompts/_cast.md` is updated to match. Tom, Nana Ruth and Biscuit are the same as before. Maya, Ivy, Leo and Grandpa Joe are new people. Sheet B is unchanged, except that Uncle Marcus is now Kate's husband.

The family is American, and the stories changed: see the table in ROUND2.md.

**Keep ids stable** wherever an image is a new version of an old one, so the page picks it up from the manifest with no code change. Delete the superseded files from `public/landing/img` when you reprocess.

## Keep as they are (do not regenerate)

`p-tom-medal`, `p-ruth-wave`, `p-ruth-dish`, `p-ruth-gift`, `p-ruth-sunhat`, `p-ruth-tablet`, `p-biscuit`, every sheet-B person (`p-kate-*`, `p-marcus-*`, `p-finn-nod`, `p-priya-wave`, `p-sam-*`, `p-deb-wave`), the four kitchens, every `o-*` object and every `prop-*`. Also `photo-kitchen-before` (nobody in it), `photo-trip-kate`, `photo-trip-marcus`, `photo-trip-ruth`.

## Regenerate under the same id (same shot description as `ART.md`, new family)

People and groups: `g-family-hero`, `p-maya-phone`, `p-maya-talk`, `p-maya-tada`, `p-maya-cheer`, `g-family-hike`, `p-ivy-cheer`, `p-leo-cheer`, `p-ivy-cake`, `p-leo-horn`, `g-kids-beach`, `g-kids-rocket`, `p-leo-school`, `p-ivy-trophy`, `g-kids-biscuit`, `p-joe-wave`, `p-joe-suitcase`, `p-joe-crown`, `p-joe-phone`.

For `g-family-hero` this time: Maya dead centre holding the phone up, Tom beside her, the children in front, all four close together as one tight group, Biscuit at their feet. The owner wants people close.

Photos, same scenes with the new family: `photo-kitchen-sledge`, `-camping`, `-tiling`, `-paint`, `-done`; all seven `photo-race-*` (an American city marathon; no readable signage); all six `photo-year-*`; `photo-trip-joe` (now Grandpa Joe outside a painted pub front on a harbor street in the west of Ireland; no readable lettering).

Plates: `plate-year-d` and `plate-year-m`, same scene.

## The Maine coast set (replaces the old coast photos; same campervan)

PHOTO, 4:3. `photo-coast-cliff` (regenerate the approved look-test scene with the new family: the four on a grassy clifftop path, Leo on Tom's shoulders, Ivy pointing out to sea, a white lighthouse far behind) · `photo-coast-harbour` (the family on a harbor wall with ice-cream cones, lobster boats and stacked lobster traps behind) · `photo-coast-summit` (the family on bare pink granite at a mountain summit above an island-dotted bay, wind in their hair; this replaces `photo-coast-mine`, so drop that id) · `photo-coast-beach` (Leo and Biscuit running at the sea's edge on a wide sandy beach) · `photo-coast-van` (the cream-and-red campervan on a clifftop pitch, washing line, camp chairs) · `photo-coast-pond` (the family skimming stones at a still mountain pond with two rounded hills behind; this replaces `photo-coast-theatre`, so drop that id).

## New: Kate and Marcus get married

A May wedding at a barn venue in the country. Kate in a simple ivory wedding dress with her auburn hair up; Marcus in a mid-blue suit, no tie. The household dressed up: Maya in a green wrap dress, Tom in a tan linen suit, Ivy as flower girl in a white dress with a flower crown, Leo in a waistcoat and bow tie. Nana Ruth in a navy dress and a small hat; Grandpa Joe in a grey suit; Finn in a suit that is slightly too big.

Cut-outs: `g-wedding-couple` (Kate and Marcus arm in arm, laughing, her bouquet raised) · `g-family-wedding` (Maya, Tom, Ivy with a petal basket, Leo holding a ring cushion, dressed up, all looking at the camera) · `p-ruth-hanky` (Nana Ruth dabbing her eye with a handkerchief, smiling) · `p-joe-toast` (Grandpa Joe raising a glass) · `p-finn-suit` (Finn, hands in pockets, half a smile).
Objects: `o-wedding-arch` (a wooden arch dressed with white and green flowers) · `o-wedding-cake` (a three-tier white cake with fresh flowers on a stand).
Props, square: `prop-bouquet`, `prop-confetti` (a paper cone of dried petals), `prop-flutes` (two champagne flutes), `prop-rings` (two rings on a small cushion).
Photos, 4:3: `photo-wedding-ready` (Kate having her hair pinned, Ivy watching in her flower crown) · `photo-wedding-aisle` (Ivy scattering petals down a grass aisle, guests turning) · `photo-wedding-vows` (Kate and Marcus under the flower arch, hands joined) · `photo-wedding-confetti` (the couple walking through thrown petals) · `photo-wedding-family` (the whole family lined up in front of the barn) · `photo-wedding-speech` (Tom mid-speech with a microphone, Kate laughing with her hand over her face; also used as the video poster frame) · `photo-wedding-dance` (Grandpa Joe dancing with Ivy standing on his shoes) · `photo-wedding-sparklers` (the couple leaving through a tunnel of sparklers at blue hour, bright and sharp).

## New: Seven days in the Tetons (thirty photos; the showcase story)

The household on a June road trip in Grand Teton National Park, in walking clothes in their signature colors (Maya mustard, Tom denim blue, Ivy red, Leo green), day packs, sun hats. Real places, so take care with what each looks like: the jagged Teton range rising straight from a sagebrush valley, snow in the high gullies, the Snake River, clear cold lakes. No park signage with lettering. Biscuit is not on this trip.

Cut-outs: `g-family-tetons` (the four standing together at a viewpoint, Ivy with binoculars, Leo in an oversized sun hat, Tom with a map folded in his hand, Maya pointing) · `o-teton-range` (the Teton range as a wide photoreal cut-out: jagged grey peaks with snow, dark pine at the base, a strip of sagebrush flat in front; landscape 3:1 if the tool allows, else 3:2) · `o-suv-roofbox` (a dusty dark-green family station wagon with a roof box, three-quarter view) · `o-canoe` (a red canoe with two paddles, side on) · `o-moose` (a bull moose standing, side on) · `o-cabin` (a small log cabin with a porch and two chairs).
Props, square: `prop-hiking-boots`, `prop-enamel-mug`, `prop-smores` (a marshmallow on a toasting stick over a graham cracker and chocolate), `prop-trail-map` (a folded paper map with no readable text), `prop-pine-cone`, `prop-lantern`.

Photos, 4:3, ids `photo-tetons-01` to `photo-tetons-30`, in trip order. Most are scenery or the family seen small in a big landscape; about ten show faces clearly.

| # | Day, place | Shot |
|---|---|---|
| 01 | Day 1, Jackson Town Square | the four under an arch made of elk antlers at the corner of a small-town square |
| 02 | Day 1, Jackson | Leo asleep in the car seat, sun hat over his face, the mountains in the window |
| 03 | Day 1, Jackson | burgers and milkshakes at a wooden diner table, Ivy mid-laugh |
| 04 | Day 2, Mormon Row | a weathered wooden barn at sunrise with the whole Teton range behind it, nobody in shot |
| 05 | Day 2, Mormon Row | Tom and Ivy sitting on a rail fence watching the light on the peaks, seen from behind |
| 06 | Day 2, Schwabacher Landing | the peaks mirrored in a still beaver pond |
| 07 | Day 2, Schwabacher Landing | Leo crouched at the water's edge pointing at a beaver dam |
| 08 | Day 3, Jenny Lake | the family on the open deck of a small shuttle boat crossing a blue lake, peaks close above |
| 09 | Day 3, Hidden Falls | a tall white waterfall through pines, Maya and Ivy small at the viewing rocks |
| 10 | Day 3, Inspiration Point | the four on a rock ledge high above the lake, arms up |
| 11 | Day 3, Jenny Lake | Leo's small hiking boots dangling off a dock over clear water |
| 12 | Day 4, Taggart Lake trail | the family walking a path through aspens and wildflowers toward the peaks |
| 13 | Day 4, Taggart Lake | a clear lake with boulders and a perfect reflection of the mountains |
| 14 | Day 4, Taggart Lake | a picnic on a flat rock: sandwiches, apples, Ivy drawing in a notebook |
| 15 | Day 4, Moose | a small log chapel with a window framing the mountains |
| 16 | Day 5, Snake River | the family in life jackets on a large rubber raft, a guide at the oars, peaks behind |
| 17 | Day 5, Snake River | a bald eagle on a dead tree above the river |
| 18 | Day 5, Snake River | Ivy trailing her hand in the water, grinning at the camera |
| 19 | Day 5, Oxbow Bend | a bull moose standing in the shallows of a wide river bend |
| 20 | Day 5, Oxbow Bend | the family watching the moose from the bank through binoculars, seen from behind |
| 21 | Day 6, Signal Mountain | a wide summit view over the valley, lake and range |
| 22 | Day 6, Signal Mountain | Maya and Tom, a selfie-style shot, the valley behind |
| 23 | Day 6, Colter Bay | the four paddling a red canoe on a big lake, seen from another boat |
| 24 | Day 6, Colter Bay | Leo holding up a very small fish, delighted |
| 25 | Day 6, Colter Bay | toasting marshmallows at a campfire by a log cabin, early evening light but bright and sharp |
| 26 | Day 7, String Lake | Ivy and Leo wading in shallow clear water over pebbles |
| 27 | Day 7, String Lake | Tom mid-jump off a rock into the lake |
| 28 | Day 7, Teton Village | the view down from a cable-car cabin window onto the valley |
| 29 | Day 7, Teton Village | waffles at a table on a mountaintop deck |
| 30 | Day 7, Snake River Overlook | the classic view: the river's S-bend below the full range, the family small at the railing |

Run these as five batches of six so one failure costs little.

## New: Spring break in Maui

Photos, 4:3: `photo-maui-beach` (the family on a long golden beach with palms, Leo building a sand volcano) · `photo-maui-snorkel` (Ivy and Tom in snorkel masks at the surface of clear turquoise water) · `photo-maui-shave-ice` (the kids with rainbow shave ice) · `photo-maui-sunrise` (the four wrapped in blankets above a sea of cloud on a volcanic summit, bright early light).

## Covers

Derive `cover-*` crops (16:10, 1200 wide) for all eight stories: `cover-coast` (from `photo-coast-cliff`), `cover-tetons` (from `photo-tetons-30`), `cover-maui` (from `photo-maui-beach`), `cover-wedding` (from `photo-wedding-confetti`), `cover-kitchen`, `cover-marathon`, `cover-birthday`, `cover-joe70`. Crop so no head is cut.

## The Tetons upload kit (new deliverable)

The owner will upload this story into the live app himself, and the app builds a journey map from the GPS in each photo. Make `landing-art/kits/tetons/` containing the thirty photos as JPEG (long edge 2000, quality 88), named `tetons-01.jpg` to `tetons-30.jpg`, each with real EXIF written into it: `DateTimeOriginal` (a plausible local time on the right day, 14 to 20 June 2026, in trip order) and `GPSLatitude`, `GPSLongitude` and their refs for the place in the table, using the coordinates in ROUND2.md (Hidden Falls and Inspiration Point have their own; Moose is 43.6596, -110.7133; Snake River Overlook is 43.7540, -110.6235; jitter each photo by a few tens of meters so stops do not stack). Use `exiftool` if it is installed, otherwise the `piexifjs` or `exifr`/`piexif` route in Node or Python; verify by reading the tags back from three files. Add `README.md` there listing each file with its place, date, time and coordinates. Add `landing-art/kits/` to nothing in `.gitignore`: it is committed.

## Order

1. Photos first again, since captures wait on them: Maine, wedding, the five Tetons batches, Maui, then the regenerated kitchen, race and year sets. Process, write the manifest, and message "main" that photos are ready. Keep going.
2. People and groups, the wedding and Tetons cut-outs and objects, props, plates.
3. Sheets on all seven washes (add `sun` `#FFD43B` and `violet` `#A98BFF`), look at every image, fix-ups, final process, covers, the kit.

The same checks as before, plus one: put the new household beside each other across sets on a consistency sheet (one crop of each person from six different images) and reject drift. Report as before, with sheet paths and Codex usage before and after.
