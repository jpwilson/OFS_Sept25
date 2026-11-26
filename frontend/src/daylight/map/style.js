// The Daylight map style, generated from the tokens (owner: F0 ships a starting point;
// MAP owns the full ~45-layer style). OpenMapTiles schema. PLAN-DAYLIGHT 3.2.
//   buildStyle({globe, terrain, hillshade}) -> MapLibre style JSON
// Paper land, azure-tint water, lime-tint parks and forest, white roads with a faint ink
// casing, dashed ink paths, boundaries, place and water labels. No POIs, no sprite.
import { COLOR, WASH } from '../styles/tokens.js'
import { OPENFREEMAP, MAPTERHORN } from './sources.js'

const ink = (a) => `rgba(16,27,59,${a})`

export function buildStyle({ globe = false, terrain = false, hillshade = true } = {}) {
  const sources = {
    omt: { type: 'vector', url: OPENFREEMAP.tilejson, attribution: OPENFREEMAP.attribution },
  }
  if (terrain || hillshade) {
    sources.dem = { type: 'raster-dem', url: MAPTERHORN.tilejson, encoding: MAPTERHORN.encoding, tileSize: MAPTERHORN.tileSize, attribution: MAPTERHORN.attribution }
  }
  const name = ['coalesce', ['get', 'name:en'], ['get', 'name']]
  const layers = [
    { id: 'land', type: 'background', paint: { 'background-color': COLOR.paper } },
    { id: 'landcover-ice', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': COLOR.white } },
    { id: 'landcover-wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest']]], paint: { 'fill-color': WASH.lime.tint, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 10, 0.9] } },
    { id: 'landcover-grass', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland', 'wetland']]], paint: { 'fill-color': WASH.lime.tint, 'fill-opacity': 0.45 } },
    { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': WASH.lime.tint, 'fill-opacity': 0.7, 'fill-outline-color': 'rgba(174,219,28,0.6)' } },
    { id: 'landuse-residential', type: 'fill', source: 'omt', 'source-layer': 'landuse', minzoom: 9, filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], paint: { 'fill-color': COLOR.paperDeep, 'fill-opacity': 0.5 } },
  ]
  if (hillshade) {
    layers.push({
      id: 'hillshade', type: 'hillshade', source: 'dem', maxzoom: 15,
      paint: { 'hillshade-shadow-color': ink(0.32), 'hillshade-highlight-color': 'rgba(255,255,255,0.55)', 'hillshade-accent-color': ink(0.18), 'hillshade-exaggeration': 0.45 },
    })
  }
  layers.push(
    { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': WASH.azure.tint } },
    { id: 'water-edge', type: 'line', source: 'omt', 'source-layer': 'water', minzoom: 5, paint: { 'line-color': ink(0.35), 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 12, 1] } },
    { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': WASH.azure.base, 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 2] } },
    { id: 'boundary-country', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': ink(0.55), 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 1.5] } },
    { id: 'boundary-state', type: 'line', source: 'omt', 'source-layer': 'boundary', minzoom: 3, filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': ink(0.3), 'line-width': 0.8, 'line-dasharray': [3, 2] } },
    { id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['in', ['get', 'class'], ['literal', ['path', 'track']]], paint: { 'line-color': ink(0.4), 'line-width': 1.2, 'line-dasharray': [2, 1.5] } },
    { id: 'road-casing', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ink(0.22), 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 6, 1, 12, 4, 16, 14] } },
    { id: 'road', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor']]], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': COLOR.white, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 6, 0.5, 12, 2.6, 16, 11] } },
    { id: 'water-name', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 3, layout: { 'text-field': name, 'text-font': OPENFREEMAP.fonts.italic, 'text-size': 12, 'text-max-width': 8 }, paint: { 'text-color': '#1F6FB0', 'text-halo-color': COLOR.white, 'text-halo-width': 1.2 } },
    { id: 'peak', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 11, filter: ['<=', ['get', 'rank'], 3], layout: { 'text-field': ['concat', '▲ ', name], 'text-font': OPENFREEMAP.fonts.regular, 'text-size': 11, 'text-anchor': 'top' }, paint: { 'text-color': COLOR.ink, 'text-halo-color': COLOR.white, 'text-halo-width': 1.4 } },
    { id: 'place-town', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 7, filter: ['in', ['get', 'class'], ['literal', ['town', 'village']]], layout: { 'text-field': name, 'text-font': OPENFREEMAP.fonts.regular, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 14] }, paint: { 'text-color': COLOR.ink, 'text-halo-color': COLOR.white, 'text-halo-width': 1.4 } },
    { id: 'place-city', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 4, filter: ['==', ['get', 'class'], 'city'], layout: { 'text-field': name, 'text-font': OPENFREEMAP.fonts.bold, 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 10, 16] }, paint: { 'text-color': COLOR.ink, 'text-halo-color': COLOR.white, 'text-halo-width': 1.5 } },
    { id: 'place-state', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 3, maxzoom: 7, filter: ['==', ['get', 'class'], 'state'], layout: { 'text-field': name, 'text-font': OPENFREEMAP.fonts.regular, 'text-size': 11, 'text-transform': 'uppercase', 'text-letter-spacing': 0.12 }, paint: { 'text-color': ink(0.55), 'text-halo-color': COLOR.white, 'text-halo-width': 1 } },
    { id: 'place-country', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 1, maxzoom: 6, filter: ['==', ['get', 'class'], 'country'], layout: { 'text-field': name, 'text-font': OPENFREEMAP.fonts.bold, 'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 5, 14], 'text-max-width': 7 }, paint: { 'text-color': COLOR.ink, 'text-halo-color': COLOR.white, 'text-halo-width': 1.5 } },
  )
  const style = { version: 8, name: 'Daylight', glyphs: OPENFREEMAP.glyphs, sources, layers }
  if (globe) style.projection = { type: 'globe' }
  if (terrain) style.terrain = { source: 'dem', exaggeration: 1.25 }
  // no glow, no dark space: the sky and the atmosphere are paper
  style.sky = { 'sky-color': COLOR.paper, 'horizon-color': WASH.azure.tint, 'fog-color': COLOR.paper, 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.8, 'atmosphere-blend': 0 }
  return style
}
