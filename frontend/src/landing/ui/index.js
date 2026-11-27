// Shared UI primitives (owner: F0). Packages may ADD files prefixed with their package name
// (ui/FilmCrowd.jsx) but should not restyle these. All are server-renderable.
export { Head } from './Head.jsx'
export { Sticker } from './Sticker.jsx'
export { Button } from './Button.jsx'
export { Label } from './Label.jsx'
export { Readout } from './Readout.jsx'
export { GhostWord } from './GhostWord.jsx'
export { Cutout } from './Cutout.jsx'
export { Shot, SHOT_CAPTION } from './Shot.jsx'
export { Print } from './Print.jsx'
export { Device } from './Device.jsx'
export { Section } from './Section.jsx'
export { Stage } from './Stage.jsx'
export { Reveal, watchReveal } from './Reveal.jsx'
export { AudienceSwitch, AUDIENCES, AUDIENCE_DEFAULT } from './AudienceSwitch.jsx'
export { Icon, ICON_NAMES } from './Icon.jsx'
export { Stub } from './Stub.jsx'
export { Missing } from './Missing.jsx'
export { ArtImg } from './ArtImg.jsx'
export { useFrame } from './useFrame.js'
export { cx } from './cx.js'

/** Wash ids (round one's five, paper, then round two's sun and violet). */
export const WASHES = ['tide', 'fizz', 'zest', 'azure', 'lime', 'paper', 'sun', 'violet']
