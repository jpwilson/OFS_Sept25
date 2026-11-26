// Film package copy (owner: film). Plain data: no JSX, no browser globals.
// Fixed lines are SPEC's, word for word. Every product number goes through fact().
// Sample content that needs digits lives in film.sample.js.
import { fact, factList } from './facts.js'
import { ROUTES, SECTION_IDS } from './routes.js'
import { COUNTS, RUN_CLUB, STORIES } from './cast.js'
import { SMALL_PRINT } from './common.js'

/** Anchor ids inside the film. Chapter 01 is the hero's "See how it works" target. */
export const FILM_IDS = {
  tell: 'lp-tell',
  read: 'lp-read',
  map: 'lp-map',
  year: 'lp-year',
  finale: 'lp-finale',
  app: 'lp-app',
}

const story = (id) => STORIES.find((s) => s.id === id)
const list = (items) => items.join(' · ')

// ---------------------------------------------------------------------------------------
// HERO
// ---------------------------------------------------------------------------------------
export const HERO = {
  eyebrow: 'Our Family Socials: a private family social network',
  display: { before: 'The whole story, for the people you', mark: 'choose', after: '.' },
  sub: 'Our Family Socials is a private, ad-free place where a family shares the long version: written stories with photo galleries, video and journey maps. You decide who can open each one.',
  primary: { label: 'Start free', href: ROUTES.signup },
  secondary: { label: 'See how it works', href: `#${FILM_IDS.tell}` },
  note: `FREE TO VIEW, FOREVER · ${fact('trialDays')}-DAY TRIAL · ${fact('trialStories')} STORIES IN THE TRIAL · NO CARD`,
  switchLabel: 'Who can open this story',
  switchHint: 'Try it. The crowd changes.',
  ghost: { private: 'private', custom: 'custom group', close: 'close family', followers: 'followers', public: 'public' },
  /** Readout beside the switch. Keys are the switch's input values. */
  canOpen: {
    label: 'Can open it',
    values: {
      private: { value: 'Just you', note: 'Private is only you.' },
      custom: { value: COUNTS.runClub, unit: `in ${RUN_CLUB.name}`, note: 'A Custom Group is a named list you build from people you follow.' },
      close: { value: COUNTS.closeFamily, unit: 'close family', note: 'Close Family is a tick you set per follower.' },
      followers: { value: COUNTS.followers, unit: 'followers', note: 'People whose follow request you accepted.' },
      public: { value: 'Anyone', unit: 'with the link', note: 'Public opens for anyone with the link, signed in or not.' },
    },
  },
  anyone: 'Anyone with the link',
  card: { alt: 'The feed card for the sample story "A week on the coast path"', caption: 'This story.' },
  smallPrint: SMALL_PRINT,
}

// ---------------------------------------------------------------------------------------
// CHAPTERS
// ---------------------------------------------------------------------------------------
const aiModes = factList('aiModes')
const layers = factList('mapLayers')
const views = factList('views')

export const TELL = {
  id: FILM_IDS.tell,
  story: story('kitchen'),
  eyebrow: 'STORY 01 · FEBRUARY · PROJECTS',
  head: { before: 'Add the photos. Then just', mark: 'talk', after: '.' },
  body: 'Add photos or clips, then type or speak a description. AI Create returns a title, a story with section headings, a caption per photo, a category and a place.',
  ghost: 'tell',
  sticker: 'Drafted by AI. Yours to edit.',
  photos: 'Photos',
  voiceTag: 'Sample voice note',
  pageTag: 'Sample story',
  galleryTag: 'Gallery',
  readouts: {
    beta: { label: 'AI Create', value: 'Beta' },
    ways: { label: 'Ways in', value: fact('aiModes'), note: list(aiModes) },
    perDay: { label: 'AI actions a day', value: fact('aiPerDay'), note: 'on Pro or the trial' },
  },
  audience: { name: 'Followers', note: `${COUNTS.followers} people` },
}

export const READ = {
  id: FILM_IDS.read,
  story: story('marathon'),
  eyebrow: 'STORY 02 · APRIL · MILESTONES',
  head: { before: 'Some days deserve a whole', mark: 'chapter', after: '.' },
  body: 'Headings, photos and video clips inline, each with its own caption. The gallery opens full screen with a slideshow and zoom.',
  ghost: 'read',
  videoTag: 'Clip',
  lightbox: { alt: 'The gallery lightbox open on a sample race photo, with its caption and the reaction picker', caption: 'Full screen.' },
  reactionsTag: 'On photos and on comments',
  repliesTag: `Replies nest ${fact('replyLevels')} levels`,
  readouts: {
    photos: { label: 'Photos a story · Pro', value: fact('photosPro') },
    clip: { label: 'Clip length', value: fact('videoSeconds'), unit: 'seconds', note: 'trimmed in the editor' },
    reactions: { label: 'Reactions', value: fact('reactions') },
  },
  audience: { name: 'Custom Group', note: `${RUN_CLUB.name} · ${COUNTS.runClub} people` },
}

export const MAP = {
  id: FILM_IDS.map,
  story: story('coast'),
  eyebrow: 'STORY 03 · AUGUST · VACATIONS',
  head: { before: 'Your photos already know', mark: 'where', after: '.' },
  body: 'GPS and the time taken are read from each photo in your browser, before upload. Each located photo becomes a numbered stop on the story map.',
  ghost: 'map',
  start: 'Start',
  journey: { alt: 'The journey map of the sample coast story: numbered stops joined by a dashed line', caption: 'The journey map.' },
  readouts: {
    gps: { label: 'GPS', value: 'From the photo', note: 'read in your browser, before upload' },
    layers: { label: 'Map layers', value: fact('mapLayers'), note: list(layers) },
  },
  audience: { name: 'Followers', note: `${COUNTS.followers} people` },
}

export const WORLD = {
  eyebrow: 'THE MAP VIEW · SAMPLE FAMILY',
  head: { before: 'One pin per', mark: 'story', after: '.' },
  body: 'The map view shows one pin per story and groups pins that sit close together. It zooms out to the whole world. It is a flat map.',
  ghost: 'world',
  clusterTag: 'Sample · nearby stories group',
  readouts: {
    pins: { label: 'One pin per story', value: 'Nearby pins group' },
    flat: { label: 'Zooms out to', value: 'The whole world', note: 'a flat map' },
  },
}

export const YEAR = {
  id: FILM_IDS.year,
  story: story('ivy'),
  eyebrow: 'STORY 04 · OCTOBER · BIRTHDAYS',
  head: { before: 'A year you can actually', mark: 'find', after: '.' },
  body: `Every story sits in up to ${fact('categoriesPerStory')} of ${fact('categories')} categories, or one you name yourself. Find it again by person, category or date.`,
  ghost: 'year',
  categories: factList('categories'),
  /** The categories the scroll steps through, in order; the last is where it rests. */
  steps: ['Birthdays', 'Vacations', 'Projects', 'Milestones', 'Birthdays'],
  views,
  device: { alt: 'The app on a phone, showing the sample family in each of its views', caption: 'Four views.' },
  cardAlt: 'A feed card for a sample story',
  readouts: {
    views: { label: 'Views', value: fact('views'), note: list(views) },
    categories: { label: 'Categories', value: fact('categories'), note: `up to ${fact('categoriesPerStory')} a story, plus your own` },
    order: { label: 'Order', value: 'By date', note: 'nothing is ranked' },
  },
  audience: { name: 'Close Family', note: `${COUNTS.closeFamily} people` },
}

// ---------------------------------------------------------------------------------------
// FINALE: the portrait, the app, the close
// ---------------------------------------------------------------------------------------
export const OURS = {
  id: FILM_IDS.finale,
  eyebrow: 'ONE YEAR · ONE FAMILY',
  head: { before: 'Every story has its own', mark: 'audience', after: '.' },
  body: 'Change the setting and see who could open a story shared that way.',
  ghost: 'ours',
  switchLabel: 'Who can open a story',
  /** One tag per sample story: title and the audience it was shared with. */
  tags: STORIES.map((s) => ({ id: s.id, title: s.title, audience: s.group ? `${s.audience} · ${s.group}` : s.audience })),
}

export const APP = {
  id: FILM_IDS.app,
  eyebrow: 'THE APP · REAL INTERFACE, SAMPLE FAMILY',
  head: { before: 'And this is what they', mark: 'open', after: '.' },
  body: 'The feed is in date order. Nothing is ranked. Filter it by person, category or date.',
  ghost: 'feed',
  feed: { alt: 'The feed view in the app, showing the sample family stories', caption: 'The feed.' },
  rail: [
    { id: 'ui-story-head', alt: 'A story page: cover, title and details', label: 'A story' },
    { id: 'ui-story-journey', alt: 'A journey map with numbered stops', label: 'Its map' },
    { id: 'ui-lightbox', alt: 'The gallery open full screen', label: 'Its gallery' },
    { id: 'ui-privacy', alt: 'The audience selector with all five options', label: 'Its audience' },
  ],
}

export const END = {
  head: { before: 'One place for the whole', mark: 'year', after: '.' },
  line: `Free to view, forever. Free to try for ${fact('trialDays')} days. ${fact('priceProMonthBilledYearly')} a month, billed yearly, to keep writing.`,
  primary: { label: 'Start free', href: ROUTES.signup },
  secondary: { label: 'See the plans', href: `#${SECTION_IDS.plans}` },
  plateAlt: 'An AI-generated illustration of the sample family and their relatives at a long garden table',
  note: 'AI-generated illustration of the sample family.',
}

// ---------------------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------------------
export const HUD = {
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  whoLabel: 'Who can open it',
  railLabel: 'Chapters of the film',
  rail: [
    { key: 'tell', label: 'Tell', href: `#${FILM_IDS.tell}` },
    { key: 'read', label: 'Read', href: `#${FILM_IDS.read}` },
    { key: 'map', label: 'Map', href: `#${FILM_IDS.map}` },
    { key: 'year', label: 'Year', href: `#${FILM_IDS.year}` },
    { key: 'app', label: 'The app', href: `#${FILM_IDS.app}` },
  ],
  filmLabel: 'One sample family, one year, told in stories',
}

/** For screen readers while the film is pinned: every chapter's words, in order. */
const srHead = (h) => `${h.before} ${h.mark}${h.after}`
export const SR = {
  intro: 'This part of the page plays one sample family year as you scroll. Its chapters, in order:',
  chapters: [TELL, READ, MAP, WORLD, YEAR, OURS, APP].map((c) => ({ head: srHead(c.head), body: c.body })).concat([{ head: srHead(END.head), body: END.line }]),
}

// ---------------------------------------------------------------------------------------
// Text for llms-full.txt (marketing block format).
// ---------------------------------------------------------------------------------------
const headText = (h) => `${h.before} ${h.mark}${h.after}`

export const SEO_BLOCKS = [
  { h2: headText(HERO.display) },
  { p: HERO.sub },
  { p: `Every story has one of ${fact('audiences')} audiences: ${factList('audiences').join(', ')}.` },
  {
    ul: [
      HERO.canOpen.values.private.note,
      HERO.canOpen.values.custom.note,
      HERO.canOpen.values.close.note,
      `Followers: ${HERO.canOpen.values.followers.note}`,
      HERO.canOpen.values.public.note,
    ],
  },
  { h2: headText(TELL.head) },
  { p: TELL.body },
  { p: `AI Create is in beta and has ${fact('aiModes')} modes: ${aiModes.join(', ')}. It allows ${fact('aiPerDay')} AI actions a day, on Pro or the trial.` },
  { h2: headText(READ.head) },
  { p: READ.body },
  {
    p: `Up to ${fact('photosPro')} photos in a story on Pro. Clips are trimmed to ${fact('videoSeconds')} seconds in the editor. ${fact('reactions')} reactions on photos and on comments. Replies nest ${fact('replyLevels')} levels.`,
  },
  { h2: headText(MAP.head) },
  { p: MAP.body },
  { p: `The story map has ${fact('mapLayers')} layers: ${layers.join(', ')}.` },
  { h2: headText(WORLD.head) },
  { p: WORLD.body },
  { h2: headText(YEAR.head) },
  { p: YEAR.body },
  { p: `${fact('views')} views of the same stories: ${views.join(', ')}. The categories are ${YEAR.categories.join(', ')}. The feed is ordered by date and nothing is ranked.` },
  { h2: headText(END.head) },
  { p: END.line },
  { p: SMALL_PRINT },
]
