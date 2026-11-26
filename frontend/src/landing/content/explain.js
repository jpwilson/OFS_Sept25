// explain package copy (owner: explain). Plain data: no JSX, no browser globals, numbers only via fact().
// Imports need explicit .js extensions (Node build scripts read these files).
import { fact, factList, registerFacts } from './facts.js'
import F from './explain.facts.js'

registerFacts(F)

const MODES = factList('aiModes') // ['Quick Publish', 'AI Draft', 'AI Interview']

/* ---------------------------------------------------------------- 2. Difference */

export const DIFFERENCE = {
  label: 'Why it is different',
  head: { before: 'Social media is built for an audience. This is built for your', mark: 'family', after: '.' },
  // Positioning, not a factual claim about any company.
  line: "LinkedIn is for work. Instagram and X are for audiences. Our Family Socials is for the few people who already know your kids' names.",
  big: [
    { key: 'ads', label: 'Ads', value: fact('ads'), count: true, note: 'The people who publish stories pay for it.' },
    { key: 'aud', label: 'Audience settings', value: fact('audiences'), count: true, note: 'Pick who can open each story.', list: factList('audiences') },
    { key: 'rank', label: 'Order', value: 'Nothing ranked', words: true, note: 'Stories are listed by date.' },
  ],
  toggle: {
    legend: 'Compare a post with a story',
    post: 'A post',
    story: 'A story',
    postLabel: 'A typical social post (illustration)',
    storyLabel: 'A story on Our Family Socials',
    storyHint: 'Drag or scroll inside the page',
    postNote: 'One photo, one line, gone by tomorrow.',
    storyNote: 'Written chapters, every photo with a caption, video and a map of where it happened.',
  },
  table: [
    { k: 'Who can open it', v: `The audience you pick for each story, from ${fact('audiences')} settings: Private, Custom Group, Close Family, Followers or Public.` },
    { k: 'What you share', v: 'Long stories with photos, video and a map.' },
    { k: 'The order', v: 'By date, the day you posted or the day it happened. Nothing is ranked.' },
    { k: 'Who pays', v: 'The people who publish stories. There are no ads.' },
    { k: 'Who can follow you', v: 'People whose follow request you accept.' },
    { k: 'Where it lives', v: 'A web app you can add to your phone’s home screen. There is no app-store app.' },
  ],
  ruthAlt: 'Nana Ruth, an illustrated grandmother, reading a story on her tablet',
}

/* ---------------------------------------------------------------- 3. How */

export const HOW = {
  label: 'How it works',
  head: { before: 'From camera roll to family in', mark: 'four', after: 'steps.' },
  stepLabel: 'Step',
  stations: [
    {
      short: 'Start free',
      title: 'Start free.',
      lines: [
        `Your trial lasts ${fact('trialDays')} days and needs no card.`,
        `Publish up to ${fact('trialStories')} stories in the trial, with up to ${fact('photosTrial')} photos or videos in each.`,
      ],
      readouts: [
        { label: 'Trial', value: fact('trialDays'), unit: 'days' },
        { label: 'Stories in the trial', value: fact('trialStories') },
        { label: 'Card needed', value: 'None' },
      ],
      cta: 'Start free',
    },
    {
      short: 'Bring your people',
      title: 'Bring your people.',
      lines: [
        'Send a follow request or an invite link. Accepting a request lets that person open your Followers stories; follow them back to open theirs.',
        'An invite link sets up following in both directions.',
        'Tick Close Family for the inner circle, or build a group of your own.',
      ],
      shot: 'ui-groups',
      shotAlt: 'The Sharing page: followers with Close Family ticks, and a group called Run club',
    },
    {
      short: 'Make a story',
      title: 'Make a story.',
      lines: [
        'Three ways in: talk it through with AI Create, drop in a batch with Smart Import, or write it yourself.',
        'Add the photos and clips; the places come from the photos.',
      ],
      shot: 'ui-quickadd-modes',
      shotAlt: 'The Quick Add window on AI Create, showing its three modes',
    },
    {
      short: 'They read and reply',
      title: 'They read, react and reply.',
      lines: [
        'People who follow you get an email when you publish.',
        `${fact('reactions')} reactions on photos and on comments. Replies nest ${fact('replyLevels')} levels deep.`,
      ],
      shot: 'ui-story-comments',
      shotAlt: 'Comments on a story, with a reply thread',
      readouts: [
        { label: 'Reactions', value: fact('reactions') },
        { label: 'Reply levels', value: fact('replyLevels') },
      ],
    },
  ],
}

/* ---------------------------------------------------------------- 4. Create */

export const CREATE = {
  label: 'AI Create',
  head: { before: 'Three ways in. The fast one is', mark: 'talking', after: '.' },
  lede: 'Add the photos, then talk for a couple of minutes about what happened. AI Create writes it up as a story you can read, fix and publish.',
  steps: [
    { tab: 'Add photos', shot: 'ui-quickadd-input', alt: 'AI Create with six kitchen photos added' },
    { tab: 'Talk', shot: 'ui-quickadd-recording', alt: 'AI Create while recording a spoken description' },
    { tab: 'Check the draft', shot: 'ui-quickadd-review', alt: 'The AI Draft review with the kitchen story written out' },
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
  mayaAlt: 'Maya, an illustrated mum, with her arms out as if to say ta-da',
  write: {
    label: 'Or write it yourself',
    head: 'Or write it yourself.',
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

export const IMPORT = {
  label: 'Smart Import',
  head: { before: 'Drop in a few hundred photos. It finds the', mark: 'stories', after: '.' },
  lede: `Choose up to ${f('importMax')} photos at a time. It reads when and where each was taken and sorts them into albums. You pick one, and only then are its photos uploaded.`,
  stageLabel: 'Made-up photos. Real rules.',
  shuffle: 'Shuffle the pile',
  axis: 'Time taken',
  unsorted: 'Unsorted',
  trip: 'One trip',
  away: 'Away',
  home: 'Home',
  breakLong: `Gap over ${f('importGapMaxHours')} h`,
  breakMoved: `Moved over ${f('importMoveKm')} km`,
  states: [
    {
      key: 'pile',
      name: 'The pile',
      rules: [
        { text: `Choose up to ${f('importMax')} photos. The time and place of each are read on your device; no photo is uploaded yet.` },
        { text: 'A photo with no time taken, like a screenshot, is set aside as unsorted.' },
      ],
    },
    {
      key: 'line',
      name: 'In order',
      rules: [
        { text: 'Photos are put in the order they were taken, by the local clock where they were taken.' },
        { text: `A photo with no location borrows one from a photo taken within ${f('importGpsBorrowMinutes')} minutes of it.` },
      ],
    },
    {
      key: 'break',
      name: 'Breaks',
      rules: [
        { text: `A gap under ${f('importGapMinMinutes')} minutes never starts a new group. A gap over ${f('importGapMaxHours')} hours always does.` },
        { text: `In between, it breaks where the gap is long for that stretch of photos, or where you moved more than ${f('importMoveKm')} km.` },
      ],
    },
    {
      key: 'trip',
      name: 'Trips',
      rules: [
        { text: `Home is the area your photos cover on the most different days. Groups more than ${f('importHomeKm')} km from it count as away.` },
        { text: `Away groups up to ${f('importTripGapHours')} hours apart and within ${f('importTripChainKm')} km of each other become one trip, with a chapter for each day.` },
        { text: `A day starts at ${f('importDayStartHour')} in the morning, so a late night stays with its day.` },
      ],
    },
    {
      key: 'album',
      name: 'Albums',
      rules: [
        { text: `A group of fewer than ${f('importMinAlbum')} photos joins a neighbour within ${f('importTinyMergeHours')} hours. One or two photos left on their own go to unsorted.` },
        { text: 'Each album gets a title hint, like “Weekend in” and the place, and a cover photo.' },
        { text: 'You pick an album. Only its photos are uploaded, and the rest stay on your device. Smart Import needs Pro or the trial.' },
      ],
    },
  ],
  sampleNote: 'Sample titles and dates. The grouping follows the rules beside it.',
  captures: {
    label: 'The real thing',
    drop: { id: 'ui-import-drop', alt: 'Smart Import, the screen where you drop your photos', caption: 'Drop the photos.' },
    albums: { id: 'ui-import-albums', alt: 'Smart Import, the album cards it found', caption: 'Pick an album.' },
  },
}

/** Text blocks for llms-full.txt (marketing.js block format: { h2 } | { p } | { ul: [] }). */
const headText = (h) => `${h.before} ${h.mark}${/^[\p{L}\p{N}]/u.test(h.after) ? ' ' : ''}${h.after}`

export const SEO_BLOCKS = [
  { h2: headText(DIFFERENCE.head) },
  { p: DIFFERENCE.line },
  { ul: DIFFERENCE.table.map((r) => `${r.k}: ${r.v}`) },
  { h2: headText(HOW.head) },
  { ul: HOW.stations.map((s) => `${s.title} ${s.lines.join(' ')}`) },
  { h2: headText(CREATE.head) },
  { p: CREATE.lede },
  { ul: CREATE.modes.map((m) => `${m.name}: ${m.text}`) },
  { p: `What comes back: ${CREATE.back.join(', ').toLowerCase()}.` },
  { ul: CREATE.limits.map((l) => `${l.k}: ${l.v}`) },
  { h2: CREATE.write.head },
  { ul: CREATE.write.list },
  { h2: headText(IMPORT.head) },
  { p: IMPORT.lede },
  { ul: IMPORT.states.flatMap((s) => s.rules.map((r) => r.text)) },
]
