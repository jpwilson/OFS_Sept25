// proof package copy (owner: proof). Plain data: no JSX, no browser globals, numbers only via fact().
// Imports need explicit .js extensions (Node build scripts read these files).
import { fact, factList } from './facts.js'
import { AUDIENCE_OPENERS, CLOSE_FAMILY, COUNTS, RUN_CLUB, person } from './cast.js'

const names = (ids) => {
  const n = ids.map((id) => person(id).short)
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n.join('')
}

/* ------------------------------------------------------------------ 6. Anatomy */

export const ANATOMY = {
  id: 'lp-anatomy',
  eyebrow: 'One real vacation story, taken apart',
  head: { before: 'Everything a great trip', mark: 'deserves', after: '.' },
  lede: 'This is "A week on the Maine coast", the whole page, as Nana Ruth opens it. Scroll and it comes apart, piece by piece.',
  ledeTap: 'Tap any part for the detail.',
  shot: 'ui-story-d',
  shotAlt: 'The full story page for "A week on the Maine coast", from its cover down to the comments',
  explode: 'Spread it out',
  assemble: 'Put it back',
  detailFor: 'More about',
  jump: 'Go to part',
  partsLabel: 'The parts of the story',
  close: 'Close',
  prev: 'Previous part',
  next: 'Next part',
  stepOf: 'Part',
  // at: where this part sits down the tall capture ui-story-d (0 top, 1 bottom), measured on the round-three capture (1510x10061, the Maine coast story as Nana Ruth opens it; re-measure if it is re-shot). The audience is the author's setting, so it closes the tour.
  parts: [
    {
      id: 'head',
      label: 'Cover and title',
      shot: 'ui-story-head',
      at: 0.05,
      side: 'left',
      lines: ['The trip opens on its best photo, with the title, the place and the dates.', 'Whoever reads it can leave the story a like.'],
    },
    {
      id: 'tags',
      label: 'Tags',
      tags: true,
      at: 0.081,
      side: 'right',
      lines: ['Tag everyone who was there, including people with no account: a child, a grandparent, the dog.', 'They can claim their profile later.'],
    },
    {
      id: 'toc',
      label: 'Contents',
      shot: 'ui-story-toc',
      at: 0.125,
      side: 'left',
      lines: ['A week is a lot of story. The page builds a contents list from your headings, so anyone can jump to the day they want.', 'The editor has headings, bold, italic, links and lists.'],
    },
    {
      id: 'video',
      label: 'Video clips',
      print: 'photo-race-video',
      printCaption: "A clip from Dad's first marathon",
      // not on this page (the Maine story has no clip): shown beside the page, never located on it
      offPage: 'From another of the family’s stories',
      side: 'right',
      lines: ['The moment itself, moving: clips sit in the text like photos, each with a caption.', 'Add them right in the editor, beside the photos.'],
      facts: [{ label: 'clips in one story', value: fact('videosPerStory') }],
    },
    {
      id: 'text',
      label: 'Text and captioned photos',
      shot: 'ui-story-text',
      at: 0.42,
      side: 'left',
      lines: ['Tell it the way you would at the dinner table, with each photo right where it happened and a caption of its own.', 'Photos straight from an iPhone, HEIC included.'],
      facts: [{ label: 'photos per story on Pro', value: fact('photosPro') }],
    },
    {
      id: 'journey',
      label: 'Journey map',
      shot: 'ui-story-journey',
      at: 0.725,
      side: 'right',
      lines: ['Every place you stopped, on the trip’s own map. GPS and the time taken are read from each photo in your browser before upload.', 'Each located photo becomes a stop. Stops are numbered and joined by a dashed line in order.'],
      facts: [{ label: 'map layers', value: fact('mapLayers'), note: factList('mapLayers').join(', ') }],
    },
    {
      id: 'gallery',
      label: 'Gallery',
      shot: 'ui-story-gallery',
      at: 0.795,
      side: 'left',
      lines: ['Every photo from the trip, together at the end of the story.', 'The gallery opens full screen, with a slideshow and zoom.'],
    },
    {
      id: 'lightbox',
      label: 'Reactions',
      shot: 'ui-lightbox',
      at: 0.847,
      side: 'right',
      lines: [`The family reacts to the photo they love: ${fact('reactions')} reactions on every photo and every comment.`, 'The caption travels with the photo into the full-screen view.'],
      facts: [{ label: 'reactions on every photo', value: fact('reactions') }],
    },
    {
      id: 'comments',
      label: 'Comments and replies',
      shot: 'ui-story-comments',
      at: 0.9,
      side: 'left',
      lines: ['Grandpa asks, you answer, he replies. Comments sit under the story where the family talks about it.', `Replies nest ${fact('replyLevels')} levels deep, so a conversation keeps its shape.`],
      facts: [{ label: 'levels of replies', value: fact('replyLevels') }],
    },
    {
      id: 'audience',
      label: 'Audience and share link',
      shot: 'ui-privacy',
      shot2: 'ui-share',
      // the author's controls, not on a reader's page: shown beside the page, never located on it
      offPage: 'The author’s view',
      side: 'right',
      lines: [
        `You choose who opens it, one of ${fact('audiences')} audiences per story. New stories start on ${fact('audienceDefault')}.`,
        `A share link opens this one story for anyone you send it to, no account needed, for ${fact('shareLinkDays')}.`,
      ],
      facts: [
        { label: 'audiences to choose from', value: fact('audiences') },
        { label: 'that a share link stays open', value: `${fact('shareLinkDaysMin')}–${fact('shareLinkDaysMax')}`, unit: 'days' },
      ],
    },
  ],
}

/* ------------------------------------------------------------------ 7. Places */

export const PLACES = {
  id: 'lp-places',
  eyebrow: 'Journey map and the map view',
  head: { before: 'Every vacation, every stop, on one', mark: 'map', after: '.' },
  lede: 'Back from a trip, your photos already know where you went and when. The story turns them into a route anyone can follow, and the map view puts every trip the family has taken in one place.',
  routeLabel: 'A week on the Maine coast',
  routeSample: 'Drawn from the story’s six located photos',
  insetLabel: 'Mount Desert Island',
  stopsLabel: 'The stops, in order',
  start: 'Start',
  switchLabel: 'Show on the real map',
  modes: [
    { id: 'trip', label: 'One trip', shot: 'ui-story-journey', alt: 'The journey map inside the Maine coast story: six numbered stops joined by a dashed line', caption: 'Journey map, inside the story.' },
    { id: 'world', label: 'Every trip', shot: 'ui-worldmap-d', alt: 'The map view: one pin for each of the family’s stories, with nearby pins grouped', caption: 'Map view, every story.' },
  ],
  facts: [
    { label: 'Read in your browser', text: 'GPS and the time taken are read from each photo in your browser, before anything is uploaded.' },
    { label: 'A stop per photo', text: 'Each located photo becomes a numbered stop, joined to the next by a dashed line, in order.' },
    { label: 'Map layers', value: fact('mapLayers'), noun: 'map layers', text: factList('mapLayers').join(', ') + '.' },
    { label: 'One pin per story', text: 'The map view shows one pin per story and groups pins that are close together. It zooms out to the whole world.' },
  ],
  byHand: 'Add a place to any photo.',
}

/* ------------------------------------------------------------------ 8. Views */

export const VIEWS = {
  id: 'lp-views',
  eyebrow: `${fact('views')} views, ${fact('categories')} categories`,
  head: { before: 'Every memory, four ways to', mark: 'find', after: 'it.' },
  lede: 'Looking for last summer’s lake day, or the morning Ivy turned nine? The same stories, laid out four ways: by date, by month, on the map, and year by year.',
  claim: 'The same stories. Four ways to find them.',
  switchLabel: 'Switch the view',
  readerAlt: 'Nana Ruth browsing the family’s stories on a tablet',
  dragHint: 'Scroll or drag',
  reel: [
    { id: 'feed', name: factList('views')[0], how: 'By date', shot: 'ui-feed-m', text: 'Cards in date order, by the date posted or the date it happened. Your choice. Nothing is ranked.' },
    { id: 'calendar', name: factList('views')[1], how: 'By month', shot: 'ui-calendar', text: 'A month grid. Each story sits on the day it started.' },
    { id: 'map', name: factList('views')[2], how: 'On the map', shot: 'ui-worldmap', text: 'A pin per story, on a map of the world.' },
    { id: 'timeline', name: factList('views')[3], how: 'Year by year', shot: 'ui-timeline', text: 'Stories grouped by year, newest first.' },
  ],
  browseHead: 'All the vacations. Or just the birthdays.',
  browseLede: `Tap a category and the cards filter the way the feed does. Give a story ${fact('categoriesPerStory')} categories, or make your own: this family made Wedding.`,
  all: 'All',
  ownNote: 'Their own',
  categories: factList('categories'),
  showing: 'Showing',
  of: 'of',
  stories: 'stories',
  filtersLabel: 'Also in the feed',
  filters: ['Person', 'Category', 'Date range', 'Order: date posted or date it happened', 'Mute someone'],
}

/* ------------------------------------------------------------------ 9. Audience */

/** Who is asking. 'share' is not an audience: it is a key the author hands out. */
export const AUDIENCE_COLUMNS = [
  { id: 'you', label: 'You', sub: 'the author' },
  { id: 'close', label: 'Close family', sub: names(CLOSE_FAMILY) },
  { id: 'follower', label: 'A follower', sub: 'request accepted' },
  { id: 'runclub', label: `A ${RUN_CLUB.name} member`, sub: names(RUN_CLUB.members) },
  { id: 'member', label: 'A signed-in member', sub: 'you have not approved' },
  { id: 'web', label: 'Anyone on the web', sub: 'not signed in' },
  { id: 'share', label: 'Someone you sent a share link', sub: 'opens that one story', key: true },
]

export const CELL_TEXT = { open: 'Opens it', card: 'Sees the card only', none: 'Nothing' }

/**
 * The matrix. Verified against the code (the code governs):
 *   can_view_event        backend/app/utils/privacy.py:14-97
 *   filter_events_for_feed backend/app/utils/privacy.py:173-221 (feed cards; used at backend/app/api/events.py:224)
 *   get_event             backend/app/api/events.py:570-646 (opens only if can_view_event; no login required)
 *   /event/:id route      frontend/src/App.jsx:163 (no login guard)
 *   share link            backend/app/api/share_links.py:14-72 (any published story, any audience),
 *                         backend/app/api/share_links.py:203-278 (opens with the token alone; no audience or plan check)
 * Columns: you, close, follower, runclub, member, web, share.
 * In the sample, the Run club members follow Maya but are not ticked Close Family.
 * Every row assumes the author's plan or trial is active (privacy.py:35-36, :189-204) and the
 * reader has a plan or trial (events.py:623-634, models/user.py:151-179).
 */
export const AUDIENCE_MATRIX = [
  // Private: author only (privacy.py:29-32); others denied (privacy.py:42-44); never in a feed (privacy.py:212);
  // a share link still opens it (share_links.py:14-45 has no audience check; :203-233 serves by token alone).
  { name: 'Private', note: 'unless you make a share link for it', cells: { you: 'open', close: 'none', follower: 'none', runclub: 'none', member: 'none', web: 'none', share: 'open' } },
  // Close Family: accepted follow with the Close Family tick (privacy.py:59-67); the tick is set per
  // follower by the author (backend/app/api/users.py:355-369); others signed in get the card (privacy.py:210-212).
  { name: 'Close Family', note: 'followers you ticked', cells: { you: 'open', close: 'open', follower: 'card', runclub: 'card', member: 'card', web: 'none', share: 'open' } },
  // Followers: any accepted follower (privacy.py:50-57); a member you have not approved gets the card (privacy.py:210-212).
  { name: 'Followers', note: 'friends and family who follow you', cells: { you: 'open', close: 'open', follower: 'open', runclub: 'open', member: 'card', web: 'none', share: 'open' } },
  // Custom Group: group members open it (privacy.py:69-79); other signed-in members get the card
  // (privacy.py:210-212); not signed in: no card (privacy.py:206-208) and no open (privacy.py:46-48).
  { name: 'Custom Group', note: `${RUN_CLUB.name}, a list you made`, cells: { you: 'open', close: 'card', follower: 'card', runclub: 'open', member: 'card', web: 'none', share: 'open' } },
  // Public: everyone, signed in or not (privacy.py:38-40); the card is listed even when signed out (privacy.py:206-208).
  { name: 'Public', note: 'anyone with the link', cells: { you: 'open', close: 'open', follower: 'open', runclub: 'open', member: 'open', web: 'open', share: 'open' } },
]

/**
 * The line-up: Maya (the author) and everyone who might ask, as cut-outs. col: the matrix column
 * that person stands for, so each face lights from the same verified table as the matrix.
 * In the sample the Run club members follow Maya but are not ticked Close Family; Finn follows
 * her and is not ticked. 'web' figures are grey silhouettes: anyone with the link.
 */
export const LINEUP = [
  { id: 'web1', col: 'web', art: 'p-joe-phone', anon: true },
  { id: 'finn', col: 'follower', art: 'p-finn-nod' },
  { id: 'kate', col: 'close', art: 'p-kate-wave' },
  { id: 'ruth', col: 'close', art: 'p-ruth-wave' },
  { id: 'maya', col: 'you', art: 'p-maya-tada' },
  { id: 'joe', col: 'close', art: 'p-joe-wave' },
  { id: 'marcus', col: 'close', art: 'p-marcus-wave' },
  { id: 'sam', col: 'runclub', art: 'p-sam-wave' },
  { id: 'priya', col: 'runclub', art: 'p-priya-wave' },
  { id: 'deb', col: 'runclub', art: 'p-deb-wave' },
  { id: 'web2', col: 'web', art: 'p-maya-phone', anon: true },
]

/** What the line-up says at each setting, in the switch's order. `story` echoes the headline. */
export const AUDIENCE_STEPS = {
  Private: {
    story: 'Her own albums',
    who: 'Only Maya opens it.',
    more: 'Nobody else is shown even the card. A share link she makes herself is the one way in.',
  },
  'Close Family': {
    story: 'The birthday',
    who: `${names(CLOSE_FAMILY)} open it.`,
    more: 'The followers Maya ticked as Close Family. Her other followers are shown the card only.',
  },
  Followers: {
    story: 'The vacation',
    who: `All ${COUNTS.followers} of Maya’s followers open it.`,
    more: 'Friends and family whose follow request she accepted. Other signed-in members are shown the card only.',
  },
  'Custom Group': {
    story: 'The race',
    who: `${names(RUN_CLUB.members)} open it.`,
    more: `The ${RUN_CLUB.name}, a list Maya made. Everyone else signed in is shown the card only.`,
  },
  Public: {
    story: 'An open story',
    who: 'Anyone with the link opens it.',
    more: 'Signed in or not: family, friends and people Maya has never met.',
  },
}

export const AUDIENCE = {
  id: 'lp-audience',
  eyebrow: 'Exactly who can open what',
  head: { before: 'Grandma gets the birthday. The run club gets the', mark: 'race', after: '.' },
  lede: 'Ivy’s birthday goes to close family. Dad’s marathon goes to his running friends. The Maine trip goes to everyone who follows Maya. Pick a setting and see exactly who can open it, cell by cell, the way the app decides.',
  switchLabel: 'Who can open this story',
  rowHead: 'Story set to',
  colHead: 'Who is asking',
  you: 'You',
  anyone: 'Anyone with the link',
  cardOnly: 'Card only',
  opens: 'Opens it',
  scrollHint: 'Scroll to change the setting',
  matrixHead: 'Cell by cell, the way the app decides.',
  matrixLede: 'Every setting against every kind of reader. Tap a row to light it up above.',
  openers: AUDIENCE_OPENERS,
}

/* ------------------------------------------------------------------ 10. Family */

export const FAMILY = {
  id: 'lp-family',
  eyebrow: 'Family tree and tag profiles',
  head: { before: 'It knows who is', mark: 'who', after: '.' },
  lede: 'Tags and relationships turn a pile of stories into a family: who is in each one, who is related to whom, and who should be reading.',
  tree: { shot: 'ui-tree', alt: 'The family tree built from confirmed relationships, with Maya, Tom, the children and grandparents', caption: 'Family tree.' },
  groups: {
    shot: 'ui-groups',
    alt: 'The Sharing page: followers with Close Family ticks, and the Run club group',
    altNames: 'Maya’s followers by name',
    altTicks: 'The Close Family switch for each follower: on for Ruth, Joe, Kate and Marcus',
    altClub: 'The Run club group, with Sam, Priya and Deb',
    caption: 'Sharing page, the name and Close Family columns.',
  },
  profile: { shot: 'ui-profile', alt: "Maya's profile page with her stories", caption: 'Profile.' },
  biscuit: { alt: 'Biscuit in the family tree: a dashed card marked Tag, for a pet with no account', caption: 'Biscuit in the tree.' },
  panHint: 'Drag to see the whole tree',
  points: [
    { id: 'tree', title: 'Confirmed relationships build the tree', text: 'Say how you are related and the other person confirms it. Confirmed relationships build the family tree.' },
    { id: 'tag', title: 'Tag people with no account', text: 'A child, a grandparent, a pet. Tag them anyway. They can claim the profile later.' },
    { id: 'tick', title: 'Ticks and groups do the sharing', text: 'Close Family ticks and named groups are how one story reaches exactly the right people.' },
  ],
  demo: {
    a: 'Maya',
    b: 'Grandpa Joe',
    rel: 'Daughter · Father',
    confirmed: 'Confirmed',
    tagName: 'Biscuit',
    tagNote: 'No account',
    claim: 'Claim this profile',
    close: 'Close Family',
    group: RUN_CLUB.name,
  },
  dogTag: 'Biscuit · tag profile, no account',
  ghost: 'family',
}

/** Text blocks for llms-full.txt (marketing.js block format: { h2 } | { p } | { ul: [] }). */
export const SEO_BLOCKS = [
  { h2: `${ANATOMY.head.before} ${ANATOMY.head.mark}${ANATOMY.head.after}` },
  { p: ANATOMY.lede },
  { ul: ANATOMY.parts.map((p) => `${p.label}: ${p.lines.join(' ')}`) },
  { h2: `${PLACES.head.before} ${PLACES.head.mark}${PLACES.head.after}` },
  { p: PLACES.lede },
  { ul: [...PLACES.facts.map((f) => `${f.label}: ${f.text}`), PLACES.byHand] },
  { h2: `${VIEWS.head.before} ${VIEWS.head.mark} ${VIEWS.head.after}` },
  { ul: VIEWS.reel.map((r) => `${r.name}: ${r.text}`) },
  { p: VIEWS.browseLede },
  { p: `Categories: ${VIEWS.categories.join(', ')}, or your own.` },
  { h2: `${AUDIENCE.head.before} ${AUDIENCE.head.mark}${AUDIENCE.head.after}` },
  {
    ul: AUDIENCE_MATRIX.map(
      (r) => `${r.name}: ` + AUDIENCE_COLUMNS.map((c) => `${c.label.toLowerCase()}: ${CELL_TEXT[r.cells[c.id]].toLowerCase()}`).join('; ') + '.',
    ),
  },
  { h2: `${FAMILY.head.before} ${FAMILY.head.mark}${FAMILY.head.after}` },
  { ul: FAMILY.points.map((p) => `${p.title}. ${p.text}`) },
]
