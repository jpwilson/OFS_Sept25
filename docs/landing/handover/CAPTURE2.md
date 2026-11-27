# CAPTURE, round two: new family, eight stories, re-shoot

Read `docs/landing/ROUND2.md` first. Your method, ownership and checks from `CAPTURE.md` still apply. Keep every capture id stable so the page picks the new files up from the manifest.

## What changed

- The household was recast (new avatars: crop them again from the new `landing-art/ref/cast-a.png`; sheet B is unchanged). Marcus is now Kate's husband. The family is American: home is Madison, Wisconsin. Rewrite the story text in American English.
- Eight household stories, in the order and with the categories and audiences in ROUND2.md's table, plus three relatives' stories (Nana Ruth, Juneau; Grandpa Joe, Galway; Kate and Marcus, the Amalfi coast).
- Art ids: photos keep their ids where the scene is the same; the coast set is now the Maine coast (`photo-coast-summit` and `photo-coast-pond` replace `-mine` and `-theatre`); new sets `photo-wedding-*` (8), `photo-tetons-01` to `-30`, `photo-maui-*` (4); covers `cover-coast`, `cover-tetons`, `cover-maui`, `cover-wedding`, `cover-kitchen`, `cover-marathon`, `cover-birthday`, `cover-joe70`. Read paths from the manifest.

## Stories to write

- **A week on the Maine coast** (Maya): six stops in ROUND2.md with their coordinates; sections The plan, Portland to Camden, Bar Harbor, The top of Cadillac, Jordan Pond, The last lighthouse. 500 to 800 words.
- **Seven days in the Tetons** (Tom): thirty photos in seven day sections (Day 1 to Day 7, each an H1 with a place in its title), every photo captioned, thirteen stops with ROUND2.md's coordinates, each photo carrying its own latitude, longitude and timestamp so the journey map has the full route. 700 to 1,000 words. This is the showcase story: write it best.
- **Spring break in Maui** (Maya), short.
- **Kate and Marcus get married** (Maya): category is a custom one, "Wedding"; sections Getting ready, The aisle, The vows, The speeches, The dancing; one inline video (make it from `photo-wedding-speech` as you made the race clip). 500 to 800 words.
- **Six weeks without a kitchen** (Maya), **Dad's first marathon** (Tom; set in Chicago), **Ivy turns nine** (Maya), **Grandpa Joe at seventy** (Tom): as before, Americanized.

Comments, replies, reactions and tags from the cast on each, as before.

## Captures

Re-shoot all 38 under the same ids, with these changes:
- The story captured as `ui-story-d` and its parts is now the **Maine coast** story, viewed as Nana Ruth.
- `ui-lightbox` and `ui-story-race-m` stay on the marathon story viewed as Sam.
- The feed and views show all eleven stories; card captures: `ui-card-coast`, `ui-card-tetons`, `ui-card-maui`, `ui-card-wedding`, `ui-card-kitchen`, `ui-card-race`, `ui-card-year`, `ui-card-joe70`.
- Add: `ui-story-tetons-journey` (the Tetons journey map with its thirteen numbered stops, Street layer), `ui-story-tetons-m` (the top of the Tetons story on a phone), `ui-story-wedding-gallery` (the wedding gallery grid), `ui-lightbox-wedding` (the lightbox on `photo-wedding-confetti` with its caption and the reaction picker, viewed as Nana Ruth).
- For `ui-quickadd-input` and `ui-quickadd-review`, keep the kitchen photos.
- Set the browser clock so the newest story is in the past, and make sure no visible date falls outside 2026 (the Quick Add date field showed 2027 last time).

One question to answer from the code, because the page will only say it if it is true: on a story page, does tapping a numbered stop on the journey map scroll the page to that part of the story, or tapping a location marker in the text move the map? Say what `EventDetail.jsx` and `EventMap.jsx` actually do, with lines.

You depend on the new photos; the art builder will say when they are in the manifest. Write the fixtures first.
