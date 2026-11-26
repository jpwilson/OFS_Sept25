// Film package copy (owner: film), round two. Plain data: no JSX, no browser globals.
// Fixed lines are SPEC's and ROUND2's, word for word. Every product number goes through
// fact(). Sample content (stories, captions, coordinates, sample counts) is in film.sample.js.
import { fact, factList } from './facts.js'
import { ROUTES, SECTION_IDS } from './routes.js'
import { COUNTS, RUN_CLUB, person } from './cast.js'
import { STORY, TETONS_COPY } from './film.sample.js'

/** Anchor ids inside the film. `trips` is the hero's "See how it works" target. */
export const FILM_IDS = {
  trips: 'lp-trips',
  tetons: 'lp-tetons',
  wedding: 'lp-wedding',
  home: 'lp-home',
  race: 'lp-race',
  year: 'lp-year',
  finale: 'lp-finale',
  app: 'lp-app',
}

const list = (items) => items.join(' · ')

// ---------------------------------------------------------------------------------------
// HERO: five audiences, walked through by the scroll
// ---------------------------------------------------------------------------------------
export const HERO = {
  eyebrow: 'Our Family Socials: a private family social network',
  display: { before: 'The whole story, for the people you', mark: 'choose', after: '.' },
  sub: 'Our Family Socials is a private, ad-free place where a family shares the long version: written stories with photo galleries, video and journey maps. You decide who can open each one.',
  primary: { label: 'Start free', href: ROUTES.signup },
  secondary: { label: 'See how it works', href: `#${FILM_IDS.trips}` },
  note: `FREE TO VIEW, FOREVER · ${fact('trialDays')}-DAY TRIAL · ${fact('trialStories')} STORIES IN THE TRIAL · NO CARD`,
  switchLabel: 'Who can open this story',
  switchHint: 'Scroll, or pick one',
  canOpen: 'Can open it',
  /** One entry per audience, in the switch's order. Keys are the switch's input values. */
  steps: {
    private: { name: 'Private', word: 'private', value: 'Just you', line: "Your family's own albums and memories, kept just for you." },
    close: { name: 'Close Family', word: 'close family', value: COUNTS.closeFamily, unit: 'close family', line: 'Close Family is a tick you set per follower.' },
    followers: { name: 'Followers', word: 'followers', value: COUNTS.followers, unit: 'followers', line: 'Friends and family who follow you.' },
    custom: { name: 'Custom Group', word: 'custom group', value: COUNTS.runClub, unit: `in ${RUN_CLUB.name}`, line: 'A Custom Group is a named list you build from people you follow.' },
    public: { name: 'Public', word: 'public', value: 'Anyone', unit: 'with the link', line: 'Public opens for anyone with the link, signed in or not.' },
  },
  albums: { alt: 'A feed card for one of the family’s stories', caption: 'Their albums.' },
  anyone: 'Anyone with the link',
}

// ---------------------------------------------------------------------------------------
// CHAPTERS
// ---------------------------------------------------------------------------------------
const aiModes = factList('aiModes')
const layers = factList('mapLayers')
const views = factList('views')
const followers = { name: 'Followers', note: `${COUNTS.followers} people` }

export const COAST = {
  id: FILM_IDS.trips,
  story: STORY.coast,
  eyebrow: 'EVENT · AUGUST · VACATIONS',
  head: { before: 'Record every family', mark: 'event', after: '.' },
  body: "Your photos already know where. The place and time are read from each one, and every stop lands on the trip's own map.",
  ghost: 'events',
  start: 'Start',
  journey: { alt: 'The journey map of the Maine coast story: numbered stops joined by a dashed line', caption: 'The journey map.' },
  readouts: {
    gps: { label: 'GPS · in your browser', value: 'From the photo', note: 'read before upload' },
    layers: { label: 'Map layers', value: fact('mapLayers'), note: list(layers) },
  },
  audience: followers,
}

export const TETONS = {
  id: FILM_IDS.tetons,
  story: STORY.tetons,
  eyebrow: 'STORY · JUNE · VACATIONS',
  head: { before: 'Interactive vacation', mark: 'memories', after: '.' },
  body: TETONS_COPY.body,
  ghost: 'tetons',
  day: 'Day',
  journey: { alt: 'The journey map of the Tetons story, with its numbered stops', caption: 'Its map.' },
  readouts: {
    trip: { label: TETONS_COPY.tripLabel, value: TETONS_COPY.days, unit: TETONS_COPY.daysUnit, note: TETONS_COPY.tripNote },
    tap: { label: 'Tap a stop', value: 'Its photo, place and time' },
    layers: { label: 'Map layers', value: fact('mapLayers'), note: list(layers) },
  },
  audience: followers,
}

export const WORLD = {
  eyebrow: 'THE MAP AND THE TIMELINE',
  head: { before: "Every trip. Every event. On your family's timeline and", mark: 'map', after: '.' },
  body: 'Every story with a place is a pin on the map, and the same stories run in date order on the timeline.',
  ghost: 'world',
  clusterTag: 'Stories near home',
  timeline: { alt: 'The timeline view in the app, showing the family’s stories in date order', caption: 'The timeline.' },
  readouts: {
    pins: { label: 'On the map', value: 'One pin per story', note: 'nearby pins group' },
    timeline: { label: 'On the timeline', value: 'In date order', note: 'nothing is ranked' },
  },
}

/** Video, said as what it does. */
const VIDEO = { label: 'Video clips', value: 'Right in the story', note: 'each with its caption' }

export const WEDDING = {
  id: FILM_IDS.wedding,
  story: STORY.wedding,
  eyebrow: 'STORY · MAY · WEDDING',
  head: { before: 'The whole wedding, in one', mark: 'place', after: '.' },
  body: "Every photo with its caption, the speeches on video, and the family's replies underneath.",
  ghost: 'wedding',
  videoTag: 'Clip',
  lightbox: { alt: 'The gallery lightbox open on a wedding photo, with its caption and the reaction picker', caption: 'Full screen.' },
  reactionsTag: 'On photos and on comments',
  repliesTag: `Replies nest ${fact('replyLevels')} levels`,
  readouts: {
    photos: { label: 'Photos a story · Pro', value: fact('photosPro') },
    clip: VIDEO,
    reactions: { label: 'Reactions', value: fact('reactions') },
  },
  audience: followers,
}

export const KITCHEN = {
  id: FILM_IDS.home,
  story: STORY.kitchen,
  eyebrow: 'STORY · FEBRUARY · PROJECTS',
  head: { before: 'Doing a kitchen reno? Document every', mark: 'step', after: '.' },
  body: 'For yourself, and for the family and friends following along. Add the photos and talk it through, and the story writes itself up.',
  ghost: 'home',
  waysLabel: 'Ways to start',
  ways: ['Just photos', 'Photos + a few words', 'Photos + a voice note'],
  ask: 'It can ask you questions',
  sticker: 'Drafted by AI. Yours to edit.',
  photos: 'Photos',
  voiceTag: 'Voice note',
  pageTag: 'Your story',
  galleryTag: 'Gallery',
  readouts: {
    draft: { label: 'AI Create', value: 'Writes the first draft' },
    ways: { label: 'Modes', value: fact('aiModes'), note: list(aiModes) },
    returns: { label: 'It writes', value: 'Title · headings · captions', note: 'and you edit any of it' },
  },
  audience: followers,
}

export const RACE = {
  id: FILM_IDS.race,
  story: STORY.marathon,
  eyebrow: 'STORY · OCTOBER · MILESTONES',
  head: { before: 'Race day, from the start line to the', mark: 'finish', after: '.' },
  body: `Photos, clips of the last mile, and exactly the right crowd. This one went to the ${RUN_CLUB.name}.`,
  ghost: 'race',
  videoTag: 'Clip',
  lightbox: { alt: 'The gallery lightbox open on a race photo', caption: 'Full screen.' },
  chip: {
    label: 'Who can open it',
    name: 'Custom Group',
    group: RUN_CLUB.name,
    count: `${COUNTS.runClub} people`,
    note: 'A named list you build from people you follow.',
    members: RUN_CLUB.members.map((id) => ({ id, name: person(id).name })),
    canOpen: 'Can open it',
  },
  readouts: {
    audiences: { label: 'Audiences', value: fact('audiences'), note: 'set story by story' },
    clip: VIDEO,
  },
}

export const YEAR = {
  id: FILM_IDS.year,
  eyebrow: 'EVERY YEAR',
  slate: 'Ivy and Leo',
  head: { before: "Every year's most memorable", mark: 'moments', after: '.' },
  body: 'Birthdays, holidays, first days and big wins, filed by date, person and category so you can find any of them again.',
  ghost: 'year',
  categories: factList('categories'),
  views,
  device: { alt: 'The app on a phone, showing the family’s stories in each of its views', caption: 'Four views.' },
  chartLabel: 'A height chart: the same two children at five ages',
  readouts: {
    views: { label: 'Views', value: fact('views'), note: list(views) },
    categories: { label: 'Categories', value: fact('categories'), note: 'plus any you make' },
    order: { label: 'Order', value: 'By date', note: 'nothing is ranked' },
  },
}

// ---------------------------------------------------------------------------------------
// FINALE: the portrait, the app, the close
// ---------------------------------------------------------------------------------------
const tagOf = (s) => ({ id: s.id, title: s.title, audience: s.group ? `${s.audience} · ${s.group}` : s.audience })
export const OURS = {
  id: FILM_IDS.finale,
  eyebrow: 'ONE YEAR · ONE FAMILY',
  head: { before: 'Every story has its own', mark: 'audience', after: '.' },
  body: 'Change the setting and see who could open a story shared that way.',
  ghost: 'ours',
  switchLabel: 'Who can open a story',
  /** One tag per story shown: its title and the audience it was shared with. */
  tags: [STORY.kitchen, STORY.marathon, STORY.coast, STORY.ivy, STORY.wedding].map(tagOf),
}

export const APP = {
  id: FILM_IDS.app,
  eyebrow: 'THE APP',
  head: { before: 'And this is what they', mark: 'open', after: '.' },
  body: 'The feed is in date order. Nothing is ranked. Filter it by person, category or date.',
  ghost: 'feed',
  feed: { alt: 'The feed view in the app, showing the family’s stories', caption: 'The feed.' },
  fan: [
    { id: 'ui-story-head', alt: 'A story page: cover, title and details', label: 'A story' },
    { id: 'ui-story-journey', alt: 'A journey map with numbered stops', label: 'Its map' },
    { id: 'ui-lightbox-wedding', alt: 'The gallery open full screen', label: 'Its gallery' },
    { id: 'ui-privacy', alt: 'The audience selector with all five options', label: 'Its audience' },
  ],
}

export const END = {
  head: { before: 'One place for every', mark: 'memory', after: '.' },
  line: `Free to view, forever. Free to try for ${fact('trialDays')} days. Then ${fact('priceProMonthBilledYearly')} a month, billed yearly, to keep writing.`,
  primary: { label: 'Start free', href: ROUTES.signup },
  secondary: { label: 'See the plans', href: `#${SECTION_IDS.plans}` },
  plateAlt: 'The family and their relatives at a long garden table',
}

// ---------------------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------------------
export const HUD = {
  whoLabel: 'Who can open it',
  railLabel: 'Chapters of the film',
  /** key: the scene the chip glides to; scenes: the scenes it stays raised for. */
  rail: [
    { key: 'coast', label: 'Trips', href: `#${FILM_IDS.trips}`, wash: 'azure', scenes: ['coast', 'tetons', 'world'] },
    { key: 'wedding', label: 'Wedding', href: `#${FILM_IDS.wedding}`, wash: 'fizz', scenes: ['wedding'] },
    { key: 'kitchen', label: 'Home', href: `#${FILM_IDS.home}`, wash: 'zest', scenes: ['kitchen'] },
    { key: 'race', label: 'Race', href: `#${FILM_IDS.race}`, wash: 'violet', scenes: ['race'] },
    { key: 'year', label: 'Year', href: `#${FILM_IDS.year}`, wash: 'sun', scenes: ['year'] },
    { key: 'app', label: 'The app', href: `#${FILM_IDS.app}`, wash: 'paper', scenes: ['app'] },
  ],
  filmLabel: 'One family, one year, told in stories',
}

/** For screen readers while the film is pinned: every chapter's words, in order. */
const srHead = (h) => `${h.before} ${h.mark}${h.after}`
export const SR = {
  intro: 'This part of the page plays one family’s year as you scroll. Its chapters, in order:',
  chapters: [COAST, TETONS, WORLD, WEDDING, KITCHEN, RACE, YEAR, OURS, APP].map((c) => ({ head: srHead(c.head), body: c.body })).concat([{ head: srHead(END.head), body: END.line }]),
}

// ---------------------------------------------------------------------------------------
// Text for llms-full.txt (marketing block format).
// ---------------------------------------------------------------------------------------
export const SEO_BLOCKS = [
  { h2: srHead(HERO.display) },
  { p: HERO.sub },
  { p: `Every story has one of ${fact('audiences')} audiences: ${Object.values(HERO.steps).map((s) => s.name).join(', ')}.` },
  { ul: Object.values(HERO.steps).map((s) => `${s.name}: ${s.line}`) },
  { h2: srHead(COAST.head) },
  { p: COAST.body },
  { p: `GPS is read from each photo in your browser, before upload. The story map has ${fact('mapLayers')} layers: ${layers.join(', ')}.` },
  { h2: srHead(TETONS.head) },
  { p: 'Each located photo becomes a numbered stop on the story map. Tap a stop to see its photo, place and time.' },
  { h2: srHead(WORLD.head) },
  { p: `${WORLD.body} Nearby pins group.` },
  { h2: srHead(WEDDING.head) },
  { p: WEDDING.body },
  {
    p: `Up to ${fact('photosPro')} photos in a story on Pro. Video clips sit right in the story, each with its caption. ${fact('reactions')} reactions on photos and on comments. Replies nest ${fact('replyLevels')} levels.`,
  },
  { h2: srHead(KITCHEN.head) },
  { p: KITCHEN.body },
  {
    p: `AI Create writes the first draft: the title, the headings and a caption for every photo. Photos alone are enough to start; add a few typed words or a voice note, or let AI Interview ask you a few questions. It has ${fact('aiModes')} modes: ${aiModes.join(', ')}.`,
  },
  { h2: srHead(RACE.head) },
  { p: `Every story has its own audience. ${RACE.chip.note}` },
  { h2: srHead(YEAR.head) },
  { p: YEAR.body },
  { p: `${fact('views')} views of the same stories: ${views.join(', ')}. The categories are ${YEAR.categories.join(', ')}. The feed is ordered by date and nothing is ranked.` },
  { h2: srHead(END.head) },
  { p: END.line },
]
