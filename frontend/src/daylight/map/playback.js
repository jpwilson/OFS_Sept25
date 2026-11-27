// Playing a journey (owner: MAP). PLAN-DAYLIGHT 3.4. A small state machine over a scene;
// no React, no map calls of its own.
//
//   createPlayer({journey, scene, reduced, onChange}) -> player
//   player.start()            from the first stop (or from the stop given)
//   player.toggle()           play or pause            player.pause()
//   player.next()  player.prev()  player.seek(index)   player.setSpeed(1 | 2)
//   player.stop()             leave playback; timers cleared
//   onChange(state): {index, shown, phase: 'idle'|'title'|'travel'|'hold'|'done', running,
//                     speed, dayCard: dayIndex | null, photo: n, stepping}
//   index is the stop being travelled to (the scrubber), shown the last stop arrived at.
//
// Per stop: at a day boundary a title card shows while the camera fits that day; then the
// leg draws itself and the camera travels with it; then it holds while the stop's photos
// take turns (1.6s for the first, a second for each of the next two).
// Reduced motion ("stepping"): nothing advances on its own and nothing eases. The reader
// presses Next stop; each step is a jump cut, and the card cross-fades.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function createPlayer({ journey, scene, reduced = false, onChange = () => {} }) {
  const stops = journey.stops
  let st = { index: -1, shown: -1, phase: 'idle', running: false, speed: 1, dayCard: null, photo: 0, stepping: reduced }
  let token = 0
  let timer = 0
  let raf = 0
  let dead = false

  const set = (patch) => {
    st = { ...st, ...patch }
    if (!dead) onChange(st)
  }
  const cancel = () => {
    token++
    clearTimeout(timer)
    cancelAnimationFrame(raf)
  }
  const wait = (ms, tk) =>
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(tk === token && !dead), ms / st.speed)
    })
  const grow = (index, ms, tk) =>
    new Promise((resolve) => {
      const t0 = performance.now()
      const tick = (now) => {
        if (tk !== token || dead) return resolve(false)
        const t = clamp((now - t0) / ms, 0, 1)
        // ease in and out, so the line leaves and arrives gently
        scene.setProgress(index - 1, t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
        if (t >= 1) return resolve(true)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })

  async function arrive(index, { travel = true, title = true, camMs = 0 } = {}) {
    cancel()
    const tk = token
    const i = clamp(index, 0, stops.length - 1)
    const stop = stops[i], prev = stops[i - 1]
    const newDay = !prev || prev.dayIndex !== stop.dayIndex
    const animate = travel && !reduced
    // index is where we are heading (the scrubber); shown is the stop whose card is up,
    // which changes only on arrival
    set({ index: i, dayCard: null })

    if (newDay && title) {
      scene.setProgress(i - 1, 0)
      scene.setActive(prev ? prev.id : null, { source: 'play' })
      set({ phase: 'title', dayCard: stop.dayIndex })
      scene.showDay(stop.dayIndex, { animate })
      if (!(await wait(reduced ? 1500 : 2100, tk))) return
      set({ dayCard: null })
    }

    set({ phase: 'travel' })
    const leg = journey.legs[i - 1]
    const ms = animate && leg ? clamp(1100 + leg.km * 60, 1400, 3000) / st.speed : 0
    scene.travelTo(i, { duration: ms || (reduced ? 0 : camMs) })
    if (ms) {
      if (!(await grow(i, ms, tk))) return
    }
    scene.setProgress(i, 0)
    scene.setActive(stop.id, { source: 'play' })
    set({ phase: 'hold', shown: i, photo: 0 })
    scene.settleOn?.(i, { duration: reduced ? 0 : 1000 })
    if (!st.running) return

    const shots = clamp(stop.photoIds.length, 1, 3)
    for (let k = 0; k < shots; k++) {
      set({ photo: k })
      if (!(await wait(k === 0 ? 1600 : 1000, tk))) return
    }
    if (!st.running) return
    if (i + 1 < stops.length) arrive(i + 1)
    else {
      set({ phase: 'done', running: false })
      scene.fit()
    }
  }

  return {
    get state() {
      return st
    },
    start(index = 0) {
      set({ running: !reduced })
      arrive(index)
    },
    toggle() {
      if (st.running) return this.pause()
      set({ running: !reduced })
      if (st.phase === 'done' || st.index < 0) arrive(0)
      else if (st.phase === 'hold') arrive(Math.min(st.index + 1, stops.length - 1), {})
      else arrive(st.index)
    },
    pause() {
      cancel()
      const i = Math.max(0, st.index)
      scene.setProgress(i, 0)
      scene.setActive(stops[i].id, { source: 'play' })
      set({ running: false, phase: 'hold', dayCard: null, shown: i })
    },
    next() {
      if (st.index + 1 >= stops.length) return
      arrive(st.index + 1)
    },
    prev() {
      // back never re-draws a leg forwards: it is a cut to the stop before
      arrive(Math.max(0, st.index - 1), { travel: false, title: false, camMs: 700 })
    },
    seek(index) {
      arrive(index, { travel: false, title: false, camMs: 600 })
    },
    setSpeed(speed) {
      set({ speed })
    },
    stop() {
      cancel()
      dead = true
    },
  }
}
