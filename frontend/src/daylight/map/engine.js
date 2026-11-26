// The only importer of maplibre-gl (owner: F0; MAP extends). PLAN-DAYLIGHT 3.8.
// scripts/daylight/check-bundle.mjs fails the build if maplibre-gl reaches the main
// bundle or any route chunk, so keep every maplibre import behind loadMapLibre().
//
//   loadMapLibre() -> Promise<maplibregl>   library + worker URL + CSS, loaded once
//   createMap(container, options) -> Promise<Map>   throws MapUnavailable when WebGL2 is missing
//
// The worker (maplibre-gl-worker.mjs) is self-contained ESM, so it is emitted as a plain
// asset with ?url and handed to setWorkerUrl: no Vite worker bundling is involved, and it
// works the same in `vite dev` and a production build.
let lib = null

export class MapUnavailable extends Error {
  constructor(reason, cause) {
    super(`Map unavailable: ${reason}`)
    this.name = 'MapUnavailable'
    this.reason = reason
    this.cause = cause
  }
}

export function loadMapLibre() {
  if (!lib) {
    lib = Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ]).then(([mod, worker]) => {
      const ml = mod.default && mod.default.Map ? mod.default : mod
      ml.setWorkerUrl(worker.default)
      return ml
    })
    lib.catch(() => {
      lib = null
    })
  }
  return lib
}

/** Creates a map; resolves after the style has loaded. */
export async function createMap(container, options = {}) {
  let ml
  try {
    ml = await loadMapLibre()
  } catch (e) {
    throw new MapUnavailable('chunk', e)
  }
  let map
  try {
    map = new ml.Map({ container, attributionControl: false, ...options })
  } catch (e) {
    throw new MapUnavailable(e?.name === 'GPUInitializationError' ? 'webgl2' : 'init', e)
  }
  await new Promise((resolve, reject) => {
    if (map.isStyleLoaded()) return resolve()
    map.once('load', resolve)
    map.once('error', (ev) => (map.isStyleLoaded() ? resolve() : reject(new MapUnavailable('style', ev?.error))))
  })
  return map
}
