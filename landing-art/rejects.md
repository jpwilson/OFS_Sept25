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
