# Reject log

| id | attempt | why rejected | fix |
|---|---|---|---|
| `g-family-hero` | look test (`look_cutout_family.png`) | Biscuit came out as the wrong breed | dog pinned in `_cast.md`; regenerated in pe1, passes |
| `photo-year-joe70` | v1 (ph4), kept in `raw/_rejects/` | several guests with backs to camera, Joe small; weak as the `cover-joe70` source | fx1: shot along the table, every face to camera |
| `prop-cowbell` | v1 (pr1), kept in `raw/_rejects/` | steel with red handle; did not match the brass bell Leo rings in `p-leo-cheer` and `photo-race-kids` | fx1: brass cowbell |

Process fixes (not regenerations): `cover-coast` anchored north (centre crop cut off Leo's head); `cover-joe70` anchored north.
Checked and passed: hands (zoom sheets), heads/feet (no subject touches the canvas edge except by 2-9 px with nothing cut: g-kids-rocket, p-ruth-tablet, prop-swatches), halos (edges-ink, edges-lime), faces against both sheets, Biscuit in every shot, no text, children ordinarily dressed, kitchens registered (identical plinth extents, alpha IoU 0.98 vs done).

## Round two (2026-11-26)

| id | attempt | why rejected | fix |
|---|---|---|---|
| `photo-maui-beach` | r2 v1, in `raw/_rejects/` | Leo drifted older (read as 7-8, not 5) | r2-fx2: Leo pinned as five; passes |
| `photo-kitchen-sledge` | r2 v1 | Tom poses with the hammer rather than swinging | r2-fx1 mid-swing was refused twice by the generator's safety filter (violence); v1 restored and kept |

Superseded round-one raws are in `raw/_v1/` (the processor falls back to them only for ids with no new raw; none remain). Dropped ids `photo-coast-mine` and `photo-coast-theatre` are in `raw/_dropped/` and gone from the manifest and `img/`.
Consistency: `sheets/consistency-household.jpg`, Maya, Tom, Ivy, Leo and Joe each from sheet A plus six sets; no drift after the Maui fix.

## Round three (Marcus recast)

Sheet B remade as an edit (`ref/cast-b.png`; old in `ref/cast-b-v1.png`). Regenerated under the same ids: g-wedding-couple, photo-wedding-{aisle,vows,confetti,family,speech,dance,sparklers}, p-marcus-wave, p-marcus-camera, photo-trip-amalfi, photo-trip-marcus, photo-year-joe70, plate-year-d, plate-year-m (covers cover-wedding, cover-joe70 re-derived). Superseded raws in `raw/_v2/`. No rejects: all passed first time; no leftover old Marcus in any other set. Strip: `sheets/consistency-marcus.jpg`.

## Round four

Landed: plate-year-d, plate-year-m (candid, family only), g-family-hike and photo-coast-cliff (Maya's backpack edited out; cover-coast re-cut), g-family-beach (new), g-years-1..5 (new, shared crop box), photo-years-2a..5b (new).
Rejected and fixed (v1s in raw/_rejects/*.r4v1.png):
- g-years-2, -3, -4: front-tooth gaps at 10 and 12 (owner's note); fixed as edits, same canvas, same crop box.
- photo-years-2a, -4b: same tooth rule; fixed as edits.
- photo-years-4a: Tom was at the wheel, not Ivy; regenerated with Ivy driving.
- photo-years-5a, -5b: parents showed no grey at about fifty, grandparents not visibly older; fixed as ageing edits.
