// explain package copy (owner: explain). Plain data: no JSX, no browser globals, numbers only via fact().
// Imports need explicit .js extensions (Node build scripts read these files).
import { fact, factList, registerFacts } from './facts.js'
import F from './explain.facts.js'

registerFacts(F)

const MODES = factList('aiModes') // ['Quick Publish', 'AI Draft', 'AI Interview']

/* ---------------------------------------------------------------- 2. Difference */

export const DIFFERENCE = {
  label: 'Why it is different',
  // Round three: the statement as three beats, each its own large line. Positioning, not a
  // factual claim about any company. The boxed word alternates on a slow pulse; the static
  // form (reduced motion, the prerender, screen readers) is `markStatic`.
  beats: ['LinkedIn is for work.', 'Instagram and X are for an audience.'],
  last: { before: 'Our Family Socials is for', after: '.' },
  marks: ['family', 'close friends'],
  markStatic: 'family and close friends',
  line: "The few people who already know your kids' names.",
  peopleAlt: {
    family: 'The illustrated sample family: Maya, Tom, Ivy, Leo and Biscuit the dog, with Nana Ruth and Grandpa Joe',
    friends: 'Priya and Sam, two of the family’s close friends, waving',
  },
  // Three complete claims. Numbers via fact(); the noun is set as big as the numeral.
  big: [
    { key: 'ads', num: fact('ads'), noun: 'ads', note: 'No ads and no sponsored posts. The people who publish stories pay for it.' },
    {
      key: 'aud',
      num: fact('audiences'),
      noun: 'ways to share',
      note: 'Pick who can open each story, from just you to anyone with the link.',
      // the five audiences in the standing order (ui/AudienceSwitch AUDIENCES)
      list: true,
    },
    { key: 'rank', words: 'In date order', note: 'Nothing is ranked. Your family’s stories are listed by date.' },
  ],
  cmp: {
    head: { before: 'A post is one photo and a line. A story is the whole', mark: 'trip', after: '.' },
    post: 'A post',
    story: 'A story',
    postLabel: 'A typical social post (illustration)',
    storyLabel: 'A story on Our Family Socials',
    storyHint: 'Drag or scroll inside the page',
    postNote: 'One photo and one line about the whole week away.',
    storyNote: 'Written chapters, every photo with a caption, the video clips and a map of everywhere you went.',
  },
  tableLabel: 'The short version',
  table: [
    { k: 'Who can open it', v: `The audience you pick for each story, from ${fact('audiences')} settings: Private, Custom Group, Close Family, Followers or Public.` },
    { k: 'What you share', v: 'The whole vacation, the wedding, the renovation: long stories with photos, video and a map.' },
    { k: 'The order', v: 'By date, the day you posted or the day it happened. Nothing is ranked.' },
    { k: 'Who pays', v: 'The people who publish stories. There are no ads.' },
    { k: 'Who can follow you', v: 'People whose follow request you accept.' },
    { k: 'Where it lives', v: 'A web app you can add to your phone’s home screen. There is no app-store app.' },
  ],
  ruthAlt: 'Nana Ruth, an illustrated grandmother, reading the family’s story on her tablet',
}

/* ---------------------------------------------------------------- 3. How */

export const HOW = {
  label: 'How it works',
  head: { before: 'From the photos on your phone to family in', mark: 'four', after: 'steps.' },
  stepLabel: 'Step',
  stations: [
    {
      short: 'Start free',
      title: 'Just back from a trip? Start free tonight.',
      lines: [
        `Your trial lasts ${fact('trialDays')} days and needs no card.`,
        `Publish up to ${fact('trialStories')} stories in the trial, with up to ${fact('photosTrial')} photos or videos in each.`,
      ],
      // Round three: each number beside its noun at the same size.
      passLabel: 'Free trial',
      pass: [`${fact('trialDays')} days free`, `${fact('trialStories')} stories to publish`, 'No card'],
      cta: 'Start free',
      person: 'p-maya-phone',
      personAlt: 'Maya, an illustrated mom, holding up her phone',
    },
    {
      short: 'Invite family',
      title: 'Bring in the people who were there.',
      lines: [
        'Send a follow request or an invite link. Accepting a request lets that person open your Followers stories; follow them back to open theirs.',
        'An invite link sets up following in both directions.',
        'Check Close Family for the grandparents and the inner circle, or build a group of your own.'
      ],
      shot: 'ui-groups',
      shotAlt: 'The Sharing page: followers with Close Family ticks, and a group called Run club',
      // big callouts over the capture, so the point reads at a glance
      callouts: ['Close Family: one tick each', 'A group of your own'],
      person: 'p-joe-wave',
      personAlt: 'Grandpa Joe, illustrated, waving hello',
    },
    {
      short: 'Make the story',
      title: 'Turn your photos into the story.',
      lines: [
        'Three ways in: let AI Create write it from your photos, add a big batch with Smart Import, or write it yourself.',
        'Add the photos and clips; the places come from the photos.',
      ],
      // Round three: three light way-cards in place of the dark Quick Add capture; each
      // links to the band below that shows it.
      ways: [
        { name: 'Talk it through', tool: 'AI Create', href: '#lp-create' },
        { name: 'Add a big batch', tool: 'Smart Import', href: '#lp-import' },
        { name: 'Write it yourself', tool: 'The story editor', href: '#lp-create-write' },
      ],
      waysLabel: 'Three ways in',
      person: 'p-maya-talk',
      personAlt: 'Maya, an illustrated mom, talking into her phone',
    },
    {
      short: 'They read and reply',
      title: 'Grandma reads it, and replies.',
      lines: [
        'People who follow you get an email when you publish.',
        `${fact('reactions')} reactions on photos and on comments. Replies nest ${fact('replyLevels')} levels deep.`,
      ],
      shot: 'ui-story-comments',
      shotAlt: 'Comments on a story, with a reply thread',
      badges: [`${fact('reactions')} reactions`, `Replies ${fact('replyLevels')} levels deep`],
      person: 'p-ruth-tablet',
      personAlt: 'Nana Ruth, an illustrated grandmother, reading on her tablet',
    },
  ],
}

/* ---------------------------------------------------------------- 4. Create */

export const CREATE = {
  label: 'AI Create',
  head: { before: 'Just photos. Or add a few words. Or just', mark: 'talk', after: '.' },
  lede: 'Pick the photos from the trip and AI Create writes the story straight away. Add a few typed lines or a voice note and it has more of your own words to work with. Let it ask you a few questions and it has more still.',
  // The progression the owner asked for. True statement: AI Create needs photos or a
  // description, not both (QuickAddModal.jsx:395,419; ai_creator.py:188-191); typed or spoken
  // words are optional; AI Interview asks follow-up questions first.
  ladderLabel: 'Start with photos. Add as much as you like.',
  ladder: [
    { name: 'Just photos', text: 'Photos alone are enough. It writes the story straight away.' },
    { name: 'Photos and a few words', text: 'Type a few lines: who was there, what made everyone laugh.' },
    { name: 'Photos and a voice note', text: 'Or just talk about the day for a couple of minutes. It writes from what you said.' },
    { name: 'Then a few questions', text: 'AI Interview asks you follow-up questions before it writes, to get the details in.' },
  ],
  steps: [
    { tab: 'Add photos', shot: 'ui-quickadd-input', alt: 'AI Create with the trip photos added' },
    { tab: 'Talk', shot: 'ui-quickadd-recording', alt: 'AI Create while recording a voice note about the trip' },
    { tab: 'Check the draft', shot: 'ui-quickadd-review', alt: 'The AI Draft review with the story written out' },
  ],
  stepsLegend: 'What you see',
  modes: [
    { name: MODES[0], text: 'Posts the story straight away.' },
    { name: MODES[1], text: 'Shows you the draft to edit before it goes out.', tag: 'Default' },
    { name: MODES[2], text: 'Asks you follow-up questions first, then writes it.' },
  ],
  modesLabel: `The ${fact('aiModes')} modes`,
  backLabel: 'What comes back',
  back: ['A title', 'Section headings', 'A caption for every photo', 'A category', 'A place'],
  limitsLabel: 'The limits, in plain sight',
  limits: [
    { k: 'Label', v: 'Beta' },
    { k: 'Per day', v: `${fact('aiPerDay')} AI actions` },
    { k: 'Needs', v: 'Pro or the trial' },
    { k: 'Audience', v: 'Published to Followers. Change it by editing the story.' },
  ],
  mayaAlt: 'Maya, an illustrated mom, talking about the day into her phone',
  write: {
    label: 'Or write it yourself',
    head: 'Want every word your own? Write it yourself.',
    shot: 'ui-editor',
    shotAlt: 'The story editor with its toolbar and a captioned photo',
    hint: 'Scroll the editor',
    list: [
      'Headings, bold, italic, links and lists.',
      'Photos and video clips inline, each with a caption.',
      'Location markers for the map.',
      'HEIC photos from iPhones are accepted.',
      `Clips are trimmed to ${fact('videoSeconds')} seconds in the editor.`,
      'Photos are stored resized, so keep your originals.',
    ],
  },
}

/* ---------------------------------------------------------------- 5. Import */

const f = (id) => fact(id)

/**
 * A kilometre fact shown in miles for American readers: converted here from the fact's own
 * value (its src stays on the fact) and rounded to a sensible step, so it is always "about".
 */
const KM_PER_MILE = 1.609344
function milesValue(id) {
  const mi = Number(fact(id)) / KM_PER_MILE
  const step = mi < 10 ? 0.5 : mi < 100 ? 5 : 25
  return Math.round(mi / step) * step
}
function miles(id) {
  const r = milesValue(id)
  return `about ${r} ${r === 1 ? 'mile' : 'miles'}`
}

export const IMPORT = {
  label: 'Smart Import',
  head: { before: 'Add a whole bunch of photos from your phone. Out come the vacations, the birthdays, the', mark: 'weekends', after: '.' },
  lede: `Back from a summer of trips with a phone full of photos? Choose up to ${f('importMax')} at a time. Smart Import reads when and where each was taken and sorts them into albums: the week on the coast, the weekend away, the birthday party. You pick one, and only then are its photos uploaded.`,
  stageLabel: 'Made-up photos. Real rules.',
  // The illustrated photo picker (a plain drawing, not any phone maker's screen). {n} is
  // filled in code from the sample roll's size (explain.sample.js), never typed here.
  picker: { title: 'Your photos', selected: '{n} selected', button: 'Add {n} photos' },
  shuffle: 'Shuffle the pile',
  axis: 'Time taken',
  unsorted: 'Unsorted',
  trip: 'One trip',
  weekend: 'One weekend',
  away: 'Away',
  home: 'Home',
  breakLong: `Gap over ${f('importGapMaxHours')} h`,
  breakMoved: `Moved about ${milesValue('importMoveKm')}+ miles`,
  states: [
    {
      key: 'pick',
      say: 'Pick a whole bunch.',
      name: 'Pick',
      rules: [
        { text: `Choose up to ${f('importMax')} photos from your phone at once.` },
        { text: 'The time and place of each are read on your device. No photo is uploaded yet.' },
      ],
    },
    {
      key: 'pile',
      say: 'In they go, all in one pile.',
      name: 'The pile',
      rules: [{ text: 'A photo with no time taken, like a screenshot, is set aside as unsorted.' }],
    },
    {
      key: 'line',
      say: 'Lined up by when they were taken.',
      name: 'In order',
      rules: [
        { text: 'Photos are put in the order they were taken, by the local clock where they were taken.' },
        { text: `A photo with no location borrows one from a photo taken within ${f('importGpsBorrowMinutes')} minutes of it.` },
      ],
    },
    {
      key: 'break',
      say: 'Split where the time or the place jumps.',
      name: 'Breaks',
      rules: [
        { text: `A gap under ${f('importGapMinMinutes')} minutes never starts a new group. A gap over ${f('importGapMaxHours')} hours always does.` },
        { text: `In between, it breaks where the gap is long for that stretch of photos, or where you moved more than ${miles('importMoveKm')}.` },
      ],
    },
    {
      key: 'trip',
      say: 'Days away become one trip.',
      name: 'Trips',
      rules: [
        { text: `Home is the area your photos cover on the most different days. Groups more than ${miles('importHomeKm')} from it count as away.` },
        { text: `Away groups up to ${f('importTripGapHours')} hours apart and within ${miles('importTripChainKm')} of each other become one trip, with a chapter for each day.` },
        { text: `A day starts at ${f('importDayStartHour')} in the morning, so a late night stays with its day.` },
      ],
    },
    {
      key: 'album',
      say: 'Out come the albums.',
      name: 'Albums',
      rules: [
        { text: `A group of fewer than ${f('importMinAlbum')} photos joins a neighbor within ${f('importTinyMergeHours')} hours. One or two photos left on their own go to unsorted.` },
        { text: 'Each album gets a title hint, like “Weekend in” and the place, and a cover photo.' },
        { text: 'You pick an album. Only its photos are uploaded, and the rest stay on your device. Smart Import needs Pro or the trial.' },
      ],
    },
  ],
  sampleNote: 'Sample titles and dates. The grouping follows the rules beside it.',
  captures: {
    label: 'The real thing',
    drop: { id: 'ui-import-drop', alt: 'Smart Import, the screen where you choose your photos', caption: 'Choose the photos.' },
    albums: { id: 'ui-import-albums', alt: 'Smart Import, the album cards it found', caption: 'Pick an album.' },
  },
  kidsAlt: 'Ivy and Leo, illustrated, hugging Biscuit the dog',
}

/** Text blocks for llms-full.txt (marketing.js block format: { h2 } | { p } | { ul: [] }). */
const headText = (h) => `${h.before} ${h.mark}${/^[\p{L}\p{N}]/u.test(h.after) ? ' ' : ''}${h.after}`

export const SEO_BLOCKS = [
  { h2: `${DIFFERENCE.beats.join(' ')} ${DIFFERENCE.last.before} ${DIFFERENCE.markStatic}${DIFFERENCE.last.after}` },
  { p: DIFFERENCE.line },
  { ul: DIFFERENCE.big.map((b) => `${b.words || `${b.num} ${b.noun}`}: ${b.note}`) },
  { p: `${headText(DIFFERENCE.cmp.head)} ${DIFFERENCE.cmp.storyNote}` },
  { ul: DIFFERENCE.table.map((r) => `${r.k}: ${r.v}`) },
  { h2: headText(HOW.head) },
  { ul: HOW.stations.map((s) => `${s.title} ${s.lines.join(' ')}`) },
  { h2: headText(CREATE.head) },
  { p: CREATE.lede },
  { ul: CREATE.ladder.map((l) => `${l.name}: ${l.text}`) },
  { ul: CREATE.modes.map((m) => `${m.name}: ${m.text}`) },
  { p: `What comes back: ${CREATE.back.join(', ').toLowerCase()}.` },
  { ul: CREATE.limits.map((l) => `${l.k}: ${l.v}`) },
  { h2: CREATE.write.head },
  { ul: CREATE.write.list },
  { h2: headText(IMPORT.head) },
  { p: IMPORT.lede },
  { ul: IMPORT.states.flatMap((s) => s.rules.map((r) => r.text)) },
]
