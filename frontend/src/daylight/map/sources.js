// Tile and terrain sources in one place (owner: F0; MAP extends). PLAN-DAYLIGHT 3.2.
// Both need no key. Both are best effort with no SLA; moving to self-hosted PMTiles on R2
// is a change to this file plus the pmtiles protocol.
export const OPENFREEMAP = {
  tilejson: 'https://tiles.openfreemap.org/planet',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  fonts: { regular: ['Noto Sans Regular'], bold: ['Noto Sans Bold'], italic: ['Noto Sans Italic'] },
}
export const MAPTERHORN = {
  tilejson: 'https://tiles.mapterhorn.com/tilejson.json',
  encoding: 'terrarium',
  tileSize: 512,
  attribution: '<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>',
}
/** Hosts a map may contact (the capture script allows only these). */
export const TILE_HOSTS = ['tiles.openfreemap.org', 'tiles.mapterhorn.com']
