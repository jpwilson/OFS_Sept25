// The Daylight map style, generated from the tokens (owner: MAP). PLAN-DAYLIGHT 3.2.
//   buildStyle({globe, terrain, hillshade, lite}) -> MapLibre style JSON
// OpenMapTiles schema from OpenFreeMap, terrain from Mapterhorn. No sprite sheet: the one
// icon (the peak triangle) is drawn in engine.js and added when the style asks for it.
//
// One style for both maps, driven by zoom:
//   zoom 0-4   the "sticker globe": azure water, white land, ink coastline keylines, a few
//              country names. It is a brand object, not an atlas.
//   zoom 5-9   the family's regions: paper land, pale water, state lines, cities.
//   zoom 10+   the journey: hillshade in ink, soft green forest, lakes with a keyline,
//              white roads, dashed trails, peaks with their height in feet.
// Labels are Noto Sans (the only faces on the OpenFreeMap glyph server), ink with a white
// halo. No points of interest: photos are the points of interest.
import { COLOR, WASH } from '../styles/tokens.js'
import { OPENFREEMAP, MAPTERHORN } from './sources.js'

const ink = (a) => `rgba(16,27,59,${a})`
const z = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops]
const zexp = (base, ...stops) => ['interpolate', ['exponential', base], ['zoom'], ...stops]
const name = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']]
const cls = (...c) => (c.length === 1 ? ['==', ['get', 'class'], c[0]] : ['in', ['get', 'class'], ['literal', c]])
const F = OPENFREEMAP.fonts

/** Colours the DOM around the map reuses (the globe's stage and ring, the route). */
export const MAP_COLOR = {
  sea: WASH.azure.base,
  seaPale: '#C2E1FF',
  land: COLOR.white,
  paper: COLOR.paper,
  forest: '#DDF1C6',
  park: WASH.lime.tint,
}

/** The sea: the Map wash on the globe, paling as you come down to a region. */
const SEA = z(2.5, MAP_COLOR.sea, 4.5, '#7CC3FF', 7, MAP_COLOR.seaPale)

export const DEM_SOURCE = 'dem'
export const TERRAIN_SOURCE = 'dem3d'
export const TERRAIN_EXAGGERATION = 1.4

/** The raster-dem source spec (hillshade and 3D terrain use separate sources, as MapLibre recommends). */
export const demSource = () => ({ type: 'raster-dem', url: MAPTERHORN.tilejson, encoding: MAPTERHORN.encoding, tileSize: MAPTERHORN.tileSize, attribution: MAPTERHORN.attribution })

export function buildStyle({ globe = false, terrain = false, hillshade = true, lite = false } = {}) {
  const sources = {
    omt: { type: 'vector', url: OPENFREEMAP.tilejson, attribution: OPENFREEMAP.attribution },
  }
  sources.cap = { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, 84.2], [180, 84.2], [180, 85.06], [-180, 85.06], [-180, 84.2]]] } } }
  if (hillshade) sources[DEM_SOURCE] = demSource()
  if (terrain) sources[TERRAIN_SOURCE] = demSource()

  const fill = (id, layer, filter, paint, extra = {}) => ({ id, type: 'fill', source: 'omt', 'source-layer': layer, ...(filter ? { filter } : {}), paint, ...extra })
  const line = (id, layer, filter, paint, extra = {}) => ({ id, type: 'line', source: 'omt', 'source-layer': layer, ...(filter ? { filter } : {}), layout: { 'line-cap': 'round', 'line-join': 'round', ...(extra.layout || {}) }, paint, ...(extra.minzoom != null ? { minzoom: extra.minzoom } : {}), ...(extra.maxzoom != null ? { maxzoom: extra.maxzoom } : {}) })
  const label = (id, layer, filter, layout, paint, extra = {}) => ({
    id, type: 'symbol', source: 'omt', 'source-layer': layer, ...(filter ? { filter } : {}),
    layout: { 'text-field': name, 'text-font': F.regular, 'text-size': 12, 'text-max-width': 8, ...layout },
    paint: { 'text-color': COLOR.ink, 'text-halo-color': 'rgba(255,255,255,0.92)', 'text-halo-width': 1.4, ...paint },
    ...extra,
  })

  const layers = [
    { id: 'land', type: 'background', paint: { 'background-color': z(3.5, MAP_COLOR.land, 6, COLOR.paper) } },

    // ---- ground cover
    fill('cover-ice', 'landcover', cls('ice'), { 'fill-color': COLOR.white, 'fill-opacity': z(3, 0, 5, 1) }),
    fill('cover-wood', 'landcover', cls('wood', 'forest'), { 'fill-color': MAP_COLOR.forest, 'fill-opacity': z(5, 0, 7, 0.55, 11, 0.9) }),
    fill('cover-grass', 'landcover', cls('grass', 'farmland'), { 'fill-color': MAP_COLOR.forest, 'fill-opacity': z(7, 0, 10, 0.35) }, { minzoom: 7 }),
    fill('cover-wetland', 'landcover', cls('wetland'), { 'fill-color': WASH.tide.tint, 'fill-opacity': 0.6 }, { minzoom: 8 }),
    fill('cover-sand', 'landcover', cls('sand'), { 'fill-color': WASH.sun.tint, 'fill-opacity': 0.7 }, { minzoom: 8 }),
    fill('park', 'park', null, { 'fill-color': MAP_COLOR.park, 'fill-opacity': z(5, 0, 7, 0.35, 12, 0.28) }, { minzoom: 5 }),
    fill('landuse-town', 'landuse', cls('residential', 'suburb', 'neighbourhood', 'commercial', 'retail', 'industrial'), { 'fill-color': COLOR.paperDeep, 'fill-opacity': z(8, 0, 10, 0.55) }, { minzoom: 8 }),
    fill('landuse-green', 'landuse', cls('cemetery', 'stadium', 'pitch', 'playground', 'track'), { 'fill-color': MAP_COLOR.forest, 'fill-opacity': 0.6 }, { minzoom: 11 }),
  ]

  if (hillshade && !lite) {
    layers.push({
      id: 'hillshade', type: 'hillshade', source: DEM_SOURCE, minzoom: 5,
      paint: {
        'hillshade-method': 'standard',
        'hillshade-shadow-color': ink(0.42),
        'hillshade-highlight-color': 'rgba(255,255,255,0.75)',
        'hillshade-accent-color': ink(0.1),
        'hillshade-illumination-direction': 315,
        'hillshade-exaggeration': z(5, 0.25, 9, 0.44, 13, 0.58),
      },
    })
  } else if (hillshade) {
    // lite level: one cheap pass, no accent
    layers.push({ id: 'hillshade', type: 'hillshade', source: DEM_SOURCE, minzoom: 7, paint: { 'hillshade-shadow-color': ink(0.34), 'hillshade-highlight-color': 'rgba(255,255,255,0.6)', 'hillshade-accent-color': ink(0), 'hillshade-exaggeration': 0.4 } })
  }

  layers.push(
    line('park-edge', 'park', null, { 'line-color': WASH.lime.deep, 'line-width': z(7, 0.6, 12, 1.2), 'line-opacity': z(7, 0.7, 11, 0.45), 'line-dasharray': [3, 2] }, { minzoom: 7, layout: { 'line-cap': 'butt' } }),

    // ---- water: the globe's sea is the Map wash; it pales as you come down to a region
    line('river', 'waterway', null, { 'line-color': z(8, '#8CC9FF', 12, '#6DB9FF'), 'line-width': zexp(1.4, 8, 0.5, 12, 1.6, 16, 6) }, { minzoom: 8 }),
    fill('water', 'water', ['!=', ['get', 'brunnel'], 'tunnel'], { 'fill-color': SEA, 'fill-antialias': true }),
    // The coastline keyline is what makes the globe a sticker. Lakes get a finer line and
    // only once you are close, or Canada comes out in spots.
    line('coast', 'water', cls('ocean'), { 'line-color': COLOR.ink, 'line-opacity': z(3, 0.95, 6, 0.6, 10, 0.5), 'line-width': z(0, 1.1, 3, 1.3, 6, 0.9, 12, 1.1) }),
    line('shore', 'water', ['all', ['!', cls('ocean')], ['!=', ['get', 'brunnel'], 'tunnel']], { 'line-color': COLOR.ink, 'line-opacity': z(2, 0.5, 6, 0.5, 10, 0.5), 'line-width': z(2, 0.5, 6, 0.7, 12, 1.1) }, { minzoom: 2 }),
    // The sea's polygon stops at 85 degrees north, which the globe would show as a ring
    // round the pole: a band of sea over it, which the globe then carries up to the pole.
    { id: 'pole-cap', type: 'fill', source: 'cap', maxzoom: 5, paint: { 'fill-color': SEA, 'fill-antialias': false } },

    // ---- boundaries
    line('boundary-state', 'boundary', ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], { 'line-color': ink(0.34), 'line-width': z(3, 0.5, 8, 1), 'line-dasharray': [3, 2.5] }, { minzoom: 3, layout: { 'line-cap': 'butt' } }),
    line('boundary-country', 'boundary', ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], { 'line-color': ink(0.6), 'line-width': z(0, 0.5, 3, 0.9, 7, 1.6) }),

    // ---- ground detail
    line('runway', 'aeroway', cls('runway'), { 'line-color': COLOR.paperDeep, 'line-width': zexp(1.5, 10, 2, 14, 18) }, { minzoom: 10, layout: { 'line-cap': 'butt' } }),
    line('taxiway', 'aeroway', cls('taxiway'), { 'line-color': COLOR.paperDeep, 'line-width': zexp(1.5, 11, 1, 14, 5) }, { minzoom: 11 }),
    fill('building', 'building', null, { 'fill-color': COLOR.paperDeep, 'fill-outline-color': ink(0.2), 'fill-opacity': z(13, 0, 14, 0.9) }, { minzoom: 13 }),

    // ---- ways. Trails are the journeys people walk: dashed ink.
    line('trail', 'transportation', cls('path', 'track'), { 'line-color': ink(0.5), 'line-width': z(11, 0.7, 14, 1.4), 'line-dasharray': [2.5, 2] }, { minzoom: 11, layout: { 'line-cap': 'butt' } }),
    line('rail', 'transportation', cls('rail'), { 'line-color': ink(0.3), 'line-width': z(9, 0.6, 14, 1.4), 'line-dasharray': [4, 3] }, { minzoom: 9, layout: { 'line-cap': 'butt' } }),
    line('ferry', 'transportation', cls('ferry'), { 'line-color': ink(0.4), 'line-width': 1, 'line-dasharray': [1, 3] }, { minzoom: 8, layout: { 'line-cap': 'butt' } }),
    line('road-minor-case', 'transportation', cls('minor', 'service', 'tertiary'), { 'line-color': ink(0.22), 'line-width': zexp(1.5, 10, 0.8, 13, 3.4, 16, 12) }, { minzoom: 10 }),
    line('road-major-case', 'transportation', cls('motorway', 'trunk', 'primary', 'secondary'), { 'line-color': ink(0.34), 'line-width': zexp(1.5, 5, 0.6, 9, 2.2, 12, 4.6, 16, 16) }, { minzoom: 5 }),
    line('road-minor', 'transportation', cls('minor', 'service', 'tertiary'), { 'line-color': COLOR.white, 'line-width': zexp(1.5, 10, 0.3, 13, 2, 16, 9.5) }, { minzoom: 10 }),
    line('road-major', 'transportation', cls('motorway', 'trunk', 'primary', 'secondary'), { 'line-color': COLOR.white, 'line-width': zexp(1.5, 5, 0, 9, 1, 12, 3, 16, 13) }, { minzoom: 7 }),

    // ---- names
    label('name-river', 'waterway', null, { 'symbol-placement': 'line', 'text-font': F.italic, 'text-size': 11, 'text-letter-spacing': 0.06 }, { 'text-color': '#1463B8' }, { minzoom: 12 }),
    label('name-lake', 'water_name', ['!', cls('ocean', 'sea')], { 'text-font': F.italic, 'text-size': z(7, 10.5, 13, 13.5), 'text-max-width': 6 }, { 'text-color': '#1463B8', 'text-halo-color': 'rgba(255,255,255,0.8)' }, { minzoom: 7 }),
    label('name-sea', 'water_name', cls('ocean', 'sea'), { 'text-font': F.italic, 'text-size': z(1, 11, 5, 15), 'text-letter-spacing': 0.14, 'text-max-width': 6, 'text-transform': 'uppercase' }, { 'text-color': z(3, ink(0.72), 6, '#1463B8'), 'text-halo-width': 0 }, { minzoom: 1.6 }),
    label('name-park', 'park', ['==', ['geometry-type'], 'Point'], { 'text-size': 10.5, 'text-letter-spacing': 0.1, 'text-transform': 'uppercase', 'text-max-width': 9 }, { 'text-color': '#4E7300' }, { minzoom: 8, maxzoom: 13 }),
    label(
      'name-peak', 'mountain_peak', ['<=', ['get', 'rank'], 4],
      {
        'icon-image': 'ofsa-peak', 'icon-size': 1,
        'text-field': ['case', ['has', 'ele_ft'], ['format', name, {}, '\n', {}, ['concat', ['number-format', ['get', 'ele_ft'], { 'max-fraction-digits': 0 }], ' ft'], { 'font-scale': 0.86, 'text-color': ink(0.72) }], name],
        'text-size': z(10, 10.5, 14, 12.5), 'text-anchor': 'top', 'text-offset': [0, 0.55], 'text-max-width': 7, 'text-line-height': 1.15, 'symbol-sort-key': ['get', 'rank'],
      },
      {}, { minzoom: 10 },
    ),
    label('name-hamlet', 'place', cls('hamlet', 'suburb', 'neighbourhood', 'isolated_dwelling'), { 'text-size': 11 }, { 'text-color': ink(0.75) }, { minzoom: 12 }),
    label('name-town', 'place', cls('town', 'village'), { 'text-size': z(7, 10.5, 14, 14.5), 'symbol-sort-key': ['get', 'rank'] }, {}, { minzoom: 7 }),
    label('name-city', 'place', cls('city'), { 'text-font': F.bold, 'text-size': z(4, 10.5, 10, 16), 'symbol-sort-key': ['get', 'rank'] }, {}, { minzoom: 4.5 }),
    label('name-state', 'place', cls('state', 'province'), { 'text-size': z(4, 9.5, 7, 11.5), 'text-transform': 'uppercase', 'text-letter-spacing': 0.14, 'text-max-width': 7 }, { 'text-color': ink(0.58) }, { minzoom: 4, maxzoom: 8 }),
    // on the whole globe only the big countries are named; the rest arrive as you come in
    label(
      'name-country-big', 'place', ['all', cls('country'), ['<=', ['get', 'rank'], 2]],
      { 'text-font': F.bold, 'text-size': z(0.5, 10, 2.6, 12), 'text-max-width': 6.5, 'text-letter-spacing': 0.02, 'symbol-sort-key': ['get', 'rank'], 'text-padding': 8 },
      { 'text-halo-width': 1.6 }, { minzoom: 0.5, maxzoom: 2.6 },
    ),
    label(
      'name-country', 'place', cls('country'),
      { 'text-font': F.bold, 'text-size': z(2.6, 12, 4, 13, 6, 15), 'text-max-width': 6.5, 'text-letter-spacing': 0.02, 'symbol-sort-key': ['get', 'rank'], 'text-padding': 6 },
      { 'text-halo-width': 1.6 }, { minzoom: 2.6, maxzoom: 7 },
    ),
  )

  const style = { version: 8, name: 'OFS Daylight', glyphs: OPENFREEMAP.glyphs, sources, layers }
  if (globe) style.projection = { type: 'globe' }
  if (terrain) style.terrain = { source: TERRAIN_SOURCE, exaggeration: TERRAIN_EXAGGERATION }
  // No glow and no dark space: the sky is paper, the horizon the palest azure.
  style.sky = { 'sky-color': COLOR.paper, 'horizon-color': WASH.azure.tint, 'fog-color': COLOR.paper, 'sky-horizon-blend': 0.7, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.85, 'atmosphere-blend': 0 }
  return style
}
