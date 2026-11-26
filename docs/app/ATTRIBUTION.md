# Map attribution and licences (Daylight)

What the Daylight maps use, under which terms, and what the map must print. PLAN-DAYLIGHT 3.7. The attribution control is always present, bottom-right: expanded on desktop, compact (an info button) on phones.

| Part | Licence or terms | Printed on the map |
|---|---|---|
| MapLibre GL JS 6.19.0 (`maplibre-gl`, pinned exactly) | BSD-3-Clause | nothing required on the map |
| OpenFreeMap public instance, vector tiles and glyphs (`tiles.openfreemap.org`) | Service: free, no key, no SLA, may stop without notice (https://openfreemap.org/tos/). Code MIT | "OpenFreeMap" |
| OpenMapTiles schema | BSD-3 (code), CC-BY 4.0 (schema and styles) | "© OpenMapTiles" |
| OpenStreetMap data | ODbL 1.0 | "Data from OpenStreetMap" (linked to https://www.openstreetmap.org/copyright) |
| Mapterhorn terrain (`tiles.mapterhorn.com`, Terrarium, 512px WebP) | Code BSD-3; data open (Copernicus GLO-30 globally; USGS 3DEP, public domain, in the United States). No stated terms for the hosted endpoint: treat as best effort | "© Mapterhorn" (linked to https://mapterhorn.com/attribution) whenever terrain or hillshade is on |
| Our style (`frontend/src/daylight/map/style.js`) | Ours, generated from the Daylight tokens | nothing |

The strings live in `frontend/src/daylight/map/sources.js` and reach the map through each source's `attribution`, so the control shows exactly the sources a map has loaded.

Dropped from Daylight: the Esri satellite layer (proprietary imagery with no key, terms unclear for a commercial app), `tile.openstreetmap.org` raster tiles (no SLA for commercial use), OpenTopoMap. The classic look still uses them until it is retired.

The static route sketch (`RouteSketch.jsx`) draws stops on plain paper from the story's own coordinates. It uses no map data and needs no attribution.

If either public service changes: both publish PMTiles; move to self-hosted archives on the existing R2 bucket by changing `sources.js` and adding the `pmtiles` protocol (4.5.0, BSD-3).
