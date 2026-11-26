// Content for every public marketing page, as plain data.
//
// Why a data module: scripts/prerender.mjs turns these blocks into static HTML
// files in dist/ so crawlers and AI answer engines see the full text without
// running JavaScript, while src/components/MarketingPage.jsx renders the exact
// same blocks in React for the new pages. One source of truth means the
// JSON-LD, the static HTML and the visible page can never disagree.
//
// Inline markup supported in strings: **bold** and [label](href).
//
// Voice (docs/landing/ROUND4.md section 1): say what the product does, in the
// positive, warmly and truthfully. Never volunteer a limitation, a caveat or a
// competitor's strength, and never run another product down. Every statement
// about Our Family Socials must be true in the code today (docs/landing/SPEC.md
// lists what may and may not be claimed). The member figure comes only from
// src/landing/content/business.js, which the owner supplies.
import { faqCategories, flatFaqs } from './faqData.js'
import { biz } from '../landing/content/business.js'

export const LAST_UPDATED = 'November 2026'
// ISO form of the same date lives in site.js (sitemap <lastmod>, JSON-LD
// dateModified). Bump both when the content on these pages actually changes.
export { LAST_UPDATED_ISO } from './site.js'

// "more than a million", from the owner's figure in business.js.
const MEMBERS = 'more than ' + biz('membersWords')

export const JOIN_LINE = `Join ${MEMBERS} people sharing their private moments with the people who matter to them.`

const WHY_HEAD = `Why ${MEMBERS} people are moving to Our Family Socials`

const PRICE_NOTE =
  'Free plan $0/forever, Pro $9/month billed annually ($108/year) or $12/month billed monthly, and a one-time Lifetime plan at $294. Every new account gets a 30-day free trial of Pro, no credit card required.'

// The notes below describe what the product actually enforces, so the
// marketing copy, the FAQ, the JSON-LD and the llms files cannot promise more
// than the code delivers. Sources: PrivacySelector.jsx and CreateEvent.jsx (the
// audience options and their default), backend/app/utils/privacy.py
// (can_view_event, filter_events_for_feed), backend/app/api/events.py
// (create_event limits) and backend/app/models/user.py (can_view_event).
const AUDIENCE_NOTE =
  'You choose an audience for every event you create: **Followers** (the default), **Close Family**, a **Custom Group**, **Private** (only you) or **Public** (anyone with the link, signed in or not). For anything just for the family, pick Followers, Close Family, a Custom Group or Private.'

const FEED_NOTE =
  'Want a story nobody else even knows about? Make it Private, and it stays with you alone. Every other event shows its card (title, cover and place) in the feed of signed-in members, and opening the event itself always follows the audience you chose. Visitors who are not signed in can open Public events only.'

const PLAN_RULES =
  'Every new account starts with a 30-day Pro trial, no credit card required, with up to 5 published events (drafts and deleted events do not count). Pro and Lifetime make publishing unlimited. When a trial ends without a plan, the account stays free for reading, liking and commenting, and publishing new events is part of Pro and Lifetime.'

const EXPIRED_VIEWING =
  'Your free account keeps the feed, your own events, every event set to Public and the events of the people you follow, all open to you, with likes and comments. Opening everything else, and publishing new events, comes with an active trial or subscription.'

// --- shared building blocks for the comparison pages ---
// Written about Our Family Socials only. Each page frames them for someone
// arriving from a particular product, and adds its own sections.

const STORY_NAME_NOTE = 'In the app, a story is called an event.'

const AUDIENCE_LIST = {
  ul: [
    '**Private**: just you, until you make a share link for it.',
    '**Custom Group**: a named list you build from the people you follow, such as "Run club" or "The cousins".',
    '**Close Family**: the followers you have marked as close family.',
    '**Followers**: everyone whose follow request you accepted. New stories start here.',
    '**Public**: anyone with the link, signed in or not.'
  ]
}

const SHARE_LINK =
  'Want to send one story to someone without an account? Make a share link. It opens that one story for anyone you give it to, for 1 to 5 days, your choice.'

const MAP_AND_TIMELINE =
  'The places come from your photos. Our Family Socials reads where and when each photo was taken, right in your browser, and every located photo becomes a numbered stop on the story\'s journey map, joined in order by a dashed line. Then the whole family history opens four ways: a feed in date order, a calendar, a world map with a pin for every story, and a timeline by year.'

const NO_ADS =
  'Nothing here is ranked. Stories from the people you follow arrive in date order, by the day they were posted or the day they happened, your choice. There are no ads anywhere in Our Family Socials and we never sell your data. Filter by person, category or date range whenever you want to find something.'

const READERS_FREE =
  'Readers are free, forever: grandparents, cousins and friends read, like and comment on the stories of the people they follow without paying a thing. The plans: ' + PRICE_NOTE

const AI_CREATE =
  'Add your photos or clips, then type or simply say what happened. AI Create comes back with a title, a story with section headings, a caption for every photo, a category and a place. AI Draft and AI Interview hand you the draft to polish before it goes out, and Quick Publish posts it straight away. AI Create is part of Pro and the free trial.'

const SMART_IMPORT =
  'Smart Import takes up to 300 photos at once and sorts them into albums by time and place. The time and place of each photo are read on your device, and only those details, never the pictures, are sent to group them. Your photos upload when you pick an album to turn into a story. Smart Import is part of Pro and the free trial.'

const START_CTA = { cta: [{ text: 'Start free', href: '/login?signup=true', primary: true }, { text: 'Why Our Family Socials', href: '/alternatives' }] }

// The home page sections that are rendered twice: once into static HTML by
// scripts/prerender.mjs (what crawlers and AI engines read) and once by
// src/pages/Landing.jsx after React mounts (what a visitor reads). Keeping them
// in one array is what stops the two versions of the home page drifting apart.
export const HOME_SHARED_BLOCKS = [
    { h2: 'Who can see an event' },
    { p: AUDIENCE_NOTE },
    { p: FEED_NOTE },
    { h2: 'What you can do' },
    {
      ul: [
        '**Follow family members** - see what your family is up to in a chronological feed, with no algorithm hiding posts. Never miss a birthday party, graduation, vacation or Sunday dinner.',
        '**Rich event pages** - photo galleries with lightbox viewing, rich text for the full story, comments and likes from family, and every detail that makes a trip worth remembering.',
        '**Interactive maps and timeline** - see every trip on an interactive world map, follow multi-location journey maps, and browse a timeline organized by year. Filter by person, category or date.',
        '**GPS extraction from photos** - Our Family Socials reads the location data already stored in your photos and suggests the places you visited.',
        '**Video support** - add video clips alongside photos, with a built-in trimmer.',
        '**AI Create** - add your photos, type or say what happened, and AI Create drafts the story, the headings and a caption for every photo. Part of Pro and the free trial.',
        '**Family trees** - a visual family tree built from relationships both people have confirmed.',
        '**Tag profiles** - tag children, older relatives or pets who do not have an account yet; they can claim the profile later.',
        '**Audience controls** - choose who opens each event, from Public down to a Custom Group such as "close family only" or Private, just for you.'
      ]
    },
    { h2: 'How it works' },
    {
      ol: [
        '**Create an account** at ourfamilysocials.com. Every new account starts with a 30-day Pro trial, no credit card required, and you can publish up to 5 events during it.',
        '**Follow your family.** Send follow requests or email invitations. Once someone accepts, you see each other\'s events.',
        '**Share life events.** Build an event page with photos, a story, dates and locations, then choose its audience.',
        '**Stay connected.** Browse the feed, the map or the timeline, and comment and like just like a normal social network - only among family rather than in public.'
      ]
    },
    { h2: 'Common questions' },
    {
      faq: [
        flatFaqs.find((f) => f.q === 'What is Our Family Socials?'),
        flatFaqs.find((f) => f.q === 'Is it really free?'),
        flatFaqs.find((f) => f.q === 'Who can see my events?'),
        flatFaqs.find((f) => f.q === 'Can I share an event with someone who doesn\'t have an account?')
      ]
    },
    { p: 'Read all the answers on the [FAQ page](/faq).' },
]

const home = {
  path: '/',
  title: 'Our Family Socials - Private Family Social Network',
  description:
    'Our Family Socials is a private, ad-free social network where families share life events, photos, journey maps and stories. Free to view, Pro from $9/month.',
  h1: "Our Family Socials: a private family social network",
  lede:
    "Never miss your family's greatest adventures. Our Family Socials is a private, ad-free social network for families to share life events, photos and stories with each other instead of posting them publicly. See where they have been, relive the moments, and stay connected across any distance.",
  blocks: [
    { h2: 'Stay connected across any distance' },
    {
      p:
        'From weekend getaways to once-in-a-lifetime trips, keep up with what your family is doing. Follow the relatives you care about, see their events in the order they happened, and stop finding out about a graduation three weeks after the fact.'
    },
    { h2: 'Your memories are yours' },
    { p: 'No ads. No data selling. No algorithms. A family-sized space instead of a public one.' },
    {
      ul: [
        '**Not public by default** - a new event goes to the followers you have approved, not to the open internet, and you can narrow or widen that audience for every event.',
        '**No ads, ever** - we will never sell your data or show ads. Your memories are not a product.',
        '**Built for families** - made by a family, for families.'
      ]
    },
    ...HOME_SHARED_BLOCKS,
    { h2: 'Simple, transparent pricing' },
    { p: 'Start for free. Upgrade when you need more.' },
    { p: PLAN_RULES },
    {
      ul: [
        '**Free to View - $0/forever.** View the events you have access to, like and comment, follow family members, interactive maps and timeline, and a 30-day Pro trial with up to 5 published events.',
        '**Pro - $9/month billed annually ($108/year), or $12/month billed monthly.** Create unlimited events, photo and video uploads, journey mapping, GPS extraction from photos, privacy controls and a rich text editor.',
        '**Lifetime - $294 once.** Everything in Pro, no recurring fees, all future updates, priority support and early access to features.'
      ]
    },
    { p: '**30-day free trial on all accounts.** Subscribe within 5 days for an extra month free.' },
    { p: EXPIRED_VIEWING },
    { h2: 'Learn more' },
    {
      ul: [
        '[Features](/features) - everything Our Family Socials does, in one list.',
        '[Pricing](/pricing) - the free plan, Pro and Lifetime.',
        '[FAQ](/faq) - answers about privacy, events, billing and sharing.',
        '[About](/about) - why this exists and who it is for.',
        '[Why Our Family Socials](/alternatives) - why families are moving here.',
        '[Coming from a private Facebook group](/compare/facebook-groups)',
        '[Coming from Tinybeans](/compare/tinybeans)',
        '[Coming from FamilyAlbum](/compare/familyalbum)',
        '[Coming from a private Instagram account](/compare/private-instagram)',
        '[How to share kids\' photos privately with family](/compare/how-to-share-photos-privately)'
      ]
    },
    { cta: [{ text: 'Get started for free', href: '/login?signup=true', primary: true }, { text: 'See pricing', href: '/pricing' }] }
  ]
}

const features = {
  path: '/features',
  title: 'Features - Our Family Socials',
  description:
    'Every feature of Our Family Socials: private event pages, a chronological family feed, interactive journey maps, GPS photo extraction, AI Create and family trees.',
  h1: 'Our Family Socials features',
  lede:
    'Our Family Socials is a private family social network built around the story: the long version of a trip, a birthday or a Sunday dinner, with your words, your photos, your clips and a map, opened by exactly the people you choose. Here is everything that comes with it, live today.',
  breadcrumb: 'Features',
  blocks: [
    { h2: 'A private, chronological family feed' },
    {
      p:
        'Follow the family members and close friends you care about. Their events appear in a feed in date order, never ranked, so a quiet post about a grandparent\'s birthday sits right next to a three-week vacation. Following is request-based: every follow request is yours to accept or decline.'
    },
    {
      ul: [
        'A feed in date order, with nothing ranked',
        'Follow requests you accept or decline',
        'Likes, ten reactions and nested replies from the people you have approved',
        'Email when someone asks to follow you, comments on your story or posts a new one',
        'Email invitations so you can bring relatives in directly'
      ]
    },
    { h2: 'Rich event pages instead of single posts' },
    {
      p:
        'The heart of Our Family Socials is the event, which we also call a story. An event is a trip, a birthday, a graduation or a Sunday dinner, with everything that belongs to it in one place.'
    },
    {
      ul: [
        'Photo galleries that open full screen, with a slideshow and zoom',
        'A rich text editor for the story behind the photos, with headings that build a contents list',
        'Video clips right in the story, with a built-in trimmer to pick the best moment',
        'Multiple locations per event, for road trips and multi-stop vacations',
        'Dates, categories and tagged family members',
        'Drafts that only you can see, and a trash you can restore events from'
      ]
    },
    { h2: 'Maps, journeys and timeline' },
    {
      p:
        'Because every event can carry locations, your family history becomes something you can browse by place as well as by date.'
    },
    {
      ul: [
        'An interactive world map with a pin for every event you can open',
        'Journey maps that connect the stops of a single multi-location trip, in order',
        'A timeline view grouped by year, and a calendar view',
        'Filters by person, category and date range',
        'Automatic GPS extraction from photo metadata, so locations are suggested for you'
      ]
    },
    { h2: 'AI Create' },
    { p: AI_CREATE },
    { h2: 'Smart Import' },
    { p: SMART_IMPORT },
    { h2: 'Family trees and relationships' },
    {
      p:
        'You can record how people are actually related - sister, dad, cousin - and both people confirm the relationship. Confirmed relationships build an interactive family tree. For relatives who are not on Our Family Socials yet (young children, older relatives, even pets) you can create a tag profile, tag them in events, and let them claim the profile when they join.'
    },
    { h2: 'Audience and privacy controls' },
    { p: AUDIENCE_NOTE },
    {
      ul: [
        'Five audience settings per event: Followers (the default), Close Family, a Custom Group, Private, or Public',
        'Public events open for anyone with the link, signed in or not, for the stories you want to share widely',
        'Private share links open one specific event for someone without an account, for 1 to 5 days',
        'Follow requests are approved by you, and verified relationships are confirmed by both people',
        'No advertising anywhere in the product, and no selling of your data'
      ]
    },
    { p: FEED_NOTE },
    { h2: 'On every phone, tablet and computer' },
    {
      p:
        'Our Family Socials runs in the browser on phones, tablets and computers. Add it to your phone\'s home screen today and it opens just like an app, and our iPhone app is on the way.'
    },
    { h2: 'What it costs' },
    { p: PRICE_NOTE },
    { p: PLAN_RULES },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'See pricing', href: '/pricing' }] },
    { p: 'See also: [FAQ](/faq), [about Our Family Socials](/about) and [why families are moving to Our Family Socials](/alternatives).' }
  ]
}

const pricing = {
  path: '/pricing',
  title: 'Pricing - Our Family Socials',
  description:
    'Our Family Socials pricing: free to view forever, Pro at $9/month billed annually or $12/month, and Lifetime at $294 once. 30-day free trial on all plans.',
  h1: 'Simple, transparent pricing',
  lede:
    'Readers are free, forever. Storytellers start with a 30-day Pro trial, no card needed, and pick Pro or Lifetime to keep publishing. ' + JOIN_LINE,
  breadcrumb: 'Pricing',
  blocks: [
    { p: PLAN_RULES },
    { h2: 'Free to View - $0/forever' },
    { p: 'For the whole family of readers.' },
    {
      ul: [
        '**Read, like and comment, free forever**',
        'Open the events of the people you follow, and every Public event',
        'Like and comment',
        'Follow family members',
        'Interactive maps & timeline',
        '30-day Pro trial included, with up to 5 published events'
      ]
    },
    { h2: 'Pro - $9/month billed annually, or $12/month billed monthly' },
    { p: 'For storytellers. Billed annually at $108/year, or monthly at $12/month.' },
    {
      ul: [
        '**Create unlimited events**',
        'Photo and video uploads',
        'Journey mapping',
        'GPS extraction from photos',
        'Privacy controls',
        'Rich text editor',
        'AI Create and Smart Import'
      ]
    },
    { h2: 'Lifetime - $294 once' },
    { p: 'Pay once, use forever.' },
    {
      ul: [
        '**Everything in Pro**',
        'No recurring fees',
        'All future updates',
        'Priority support',
        'Early access to features',
        'Best long-term value'
      ]
    },
    { p: '**30-day free trial on all accounts.** Subscribe within 5 days for an extra month free.' },
    { h2: 'Pricing questions' },
    {
      faq: [
        {
          q: 'How does the free trial work?',
          a: 'Sign up and get Pro for 30 days, with no credit card required, and publish up to 5 events. Subscribe to Pro during the trial and the days you have left are added on before your first renewal. Subscribe within your first 5 days and we add an extra 30 days free on top.'
        },
        {
          q: 'What happens when my trial ends?',
          a: EXPIRED_VIEWING + ' Pick Pro or Lifetime whenever you are ready, and you are publishing again straight away.'
        },
        {
          q: 'Can I cancel anytime?',
          a: 'Yes. Cancel your subscription anytime, with no questions asked. Every event you have published stays right where it is, and you can pick up again whenever you like.'
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit cards through Stripe, our secure payment partner. Your payment information is never stored on our servers.'
        }
      ]
    },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }] },
    { p: 'See also: [features](/features) and the full [FAQ](/faq).' }
  ]
}

const about = {
  path: '/about',
  title: 'About Our Family Socials',
  description:
    'Our Family Socials is a private, ad-free social network built for families to share life events, photos and memories. Read why it exists and who it is for.',
  h1: 'About Our Family Socials',
  lede:
    'Our Family Socials is a private, ad-free social network made for families to share life events, photos and memories together. A new event goes to the family you have approved, you choose the audience for every one, and the feed is in date order with nothing ranked. ' + JOIN_LINE,
  breadcrumb: 'About',
  blocks: [
    { h2: 'Why it exists' },
    {
      p:
        'We built Our Family Socials for our own family: one place where the long version of our lives could live, from the road trip to the school play, shared with the people who already know the kids\' names. It gives every family a space of its own to keep their memories the way they deserve, and to come back to them for years.'
    },
    { h2: 'What makes it ours' },
    {
      ul: [
        '**You choose the audience** - a new event goes to the followers you have approved, and you can set any event to Close Family, a Custom Group such as "close family only", Private (just you) or Public (anyone with the link).',
        '**No ads, ever** - we will never sell your data or show you ads. Your family memories are not a product to be monetized.',
        '**Rich event pages** - photo galleries, detailed stories, multiple locations and GPS-tagged journey maps.',
        '**Interactive maps and timeline** - see your family\'s adventures on an interactive world map, and watch years of memories unfold in order.',
        '**AI Create** - add your photos, type or say what happened, and AI drafts the story for you to make your own.',
        '**Built for families** - made by a family, for families. We use Our Family Socials ourselves to stay close to our own loved ones.'
      ]
    },
    { h2: 'How it works' },
    {
      ol: [
        '**Create an account** - sign up for free at ourfamilysocials.com. You get a 30-day Pro trial automatically, with up to 5 published events during it.',
        '**Follow your family** - send follow requests to family members. Once they accept, you see each other\'s events.',
        '**Share life events** - create event pages with photos, stories, locations and dates. Choose the audience for each event.',
        '**Stay connected** - view your family\'s events in the feed, on the map or in the timeline. Comment, like and cheer each other on.'
      ]
    },
    { h2: 'Who it is for' },
    {
      ul: [
        '**Parents** sharing kids\' milestones with grandparents',
        '**Extended families** staying close across any distance',
        '**Travelers** telling the story of every trip with photo albums and maps',
        '**Anyone** who wants to share their life privately with the people who matter',
        '**Families** who value privacy and want to keep their memories ad-free'
      ]
    },
    { h2: 'Pricing' },
    { p: PRICE_NOTE },
    { p: PLAN_RULES },
    { cta: [{ text: 'Sign up free', href: '/login?signup=true', primary: true }, { text: 'View pricing details', href: '/pricing' }] },
    { p: 'See also: [features](/features), the [FAQ](/faq) and [why families are moving to Our Family Socials](/alternatives).' }
  ]
}

const faq = {
  path: '/faq',
  title: 'FAQ - Our Family Socials',
  description:
    'Answers to common questions about Our Family Socials: what it is, who can see your events, what the free plan includes, what Pro costs, and how sharing works.',
  h1: 'Our Family Socials FAQ',
  lede:
    'Frequently asked questions about Our Family Socials, a private social network for families. Anything else you would like to know, just email ' + 'support@ourfamilysocials.com.',
  breadcrumb: 'FAQ',
  isFaqPage: true,
  blocks: [
    ...faqCategories.flatMap((cat) => [{ h2: cat.category }, { faq: cat.questions }]),
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'Contact us', href: '/contact' }] },
    { p: 'See also: [features](/features), [pricing](/pricing) and [about Our Family Socials](/about).' }
  ]
}

const compareFacebookGroups = {
  path: '/compare/facebook-groups',
  title: 'Our Family Socials vs private Facebook groups',
  description:
    'Coming from a private Facebook group? Our Family Socials gives your family whole stories, five audiences, journey maps, a feed in date order and no ads.',
  h1: 'Coming from a private Facebook group? Welcome to Our Family Socials.',
  lede:
    JOIN_LINE + ' Bring your family group with you, and give every trip, birthday and Sunday dinner the room it deserves: a whole story, opened by exactly the people you pick.',
  breadcrumb: 'Coming from a private Facebook group',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'Every moment gets its own story' },
    {
      p:
        'On Our Family Socials, each moment gets a page of its own: your writing, a gallery of captioned photos, video clips, the dates, and a journey map of everywhere you went. Add a few headings and the page builds a contents list for you, and every story ends with a gallery of everything that opens full screen as a slideshow. ' + STORY_NAME_NOTE
    },
    { h2: 'You decide who opens each story' },
    {
      p:
        'Every story carries its own audience, so the bath-time video and the big family reunion can go to different people. Choose from five:'
    },
    AUDIENCE_LIST,
    { p: SHARE_LINK },
    { h2: 'A feed in date order, with no ads' },
    { p: NO_ADS },
    { h2: 'Your family on a map and a timeline' },
    { p: MAP_AND_TIMELINE },
    { h2: 'Bringing the family over' },
    {
      ul: [
        '**Invite by email.** Send relatives an invitation straight from Our Family Socials, and you are connected as soon as they sign up with it.',
        '**Readers are free, forever.** Grandparents and cousins read, like and comment without paying a thing.',
        '**On every phone.** Add Our Family Socials to your phone\'s home screen today, and our iPhone app is on the way.',
        '**Room for everyone.** Tag the kids, the grandparents and even the dog, with or without an account; they can claim their profile later. Confirmed relationships build your family tree.'
      ]
    },
    { h2: 'What it costs' },
    { p: READERS_FREE },
    START_CTA,
    { p: 'See also: [coming from Tinybeans](/compare/tinybeans), [coming from FamilyAlbum](/compare/familyalbum), [coming from a private Instagram account](/compare/private-instagram).' }
  ]
}

const compareTinybeans = {
  path: '/compare/tinybeans',
  title: 'Our Family Socials vs Tinybeans',
  description:
    'Coming from Tinybeans? Keep every milestone and give the whole family a place for their stories, on one timeline and one map that grow up with your kids.',
  h1: 'Coming from Tinybeans? Welcome to Our Family Socials.',
  lede:
    JOIN_LINE + ' Keep sharing every first step and first day of school, and give the rest of the family a place for their stories too, all on one timeline that grows up with your kids.',
  breadcrumb: 'Coming from Tinybeans',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'Every milestone gets a whole story' },
    {
      p:
        'A story on Our Family Socials is the long version: what happened, in your words, with a gallery of captioned photos, video clips, the dates and the places. Give each story up to two categories from Birthdays, Anniversaries, Vacations, Family Gatherings, Holidays, Projects, Daily Life and Milestones, or make your own, and every first tooth and every birthday party is easy to find again. ' + STORY_NAME_NOTE
    },
    { h2: 'Room for the whole family' },
    {
      p:
        'Grandparents, aunts, uncles and cousins follow each other and tell their own stories, so the family\'s year is all in one place: the kids\' milestones, Grandpa\'s seventieth, the cousins\' camping trip. Tag the children with a profile of their own that they can claim when they are older, and confirm how everyone is related to build your family tree.'
    },
    { h2: 'You decide who opens each story' },
    {
      p:
        'Every story has its own audience. Send the first-day-of-school photos to Close Family and the soccer final to all your followers. Choose from five:'
    },
    AUDIENCE_LIST,
    { p: SHARE_LINK },
    { h2: 'Look back on every year' },
    { p: MAP_AND_TIMELINE },
    { h2: 'Easy to make, even on a busy day' },
    { p: AI_CREATE },
    { h2: 'No ads, nothing ranked' },
    { p: NO_ADS },
    { h2: 'What it costs' },
    { p: READERS_FREE },
    START_CTA,
    { p: 'See also: [coming from FamilyAlbum](/compare/familyalbum), [coming from a private Facebook group](/compare/facebook-groups).' }
  ]
}

const compareFamilyAlbum = {
  path: '/compare/familyalbum',
  title: 'Our Family Socials vs FamilyAlbum',
  description:
    'Coming from FamilyAlbum? Turn your family photos into stories with Smart Import and AI Create, map every trip, and choose who opens each one.',
  h1: 'Coming from FamilyAlbum? Welcome to Our Family Socials.',
  lede:
    JOIN_LINE + ' Bring your photos and turn them into stories: the trip, the party and the ordinary Tuesday, written up, captioned and mapped, for exactly the people you choose.',
  breadcrumb: 'Coming from FamilyAlbum',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'From camera roll to stories, fast' },
    { p: SMART_IMPORT },
    { h2: 'Let AI write the first draft' },
    { p: AI_CREATE },
    { h2: 'Photos that look their best' },
    {
      p:
        'Every story ends with a gallery of everything in it, opening full screen with a slideshow and zoom. Each photo carries its own caption, iPhone HEIC photos are welcome, and video clips sit right in the story next to the photos. Family can answer with ten reactions on any photo or comment, and replies nest three levels deep. ' + STORY_NAME_NOTE
    },
    { h2: 'Every photo knows where it was taken' },
    { p: MAP_AND_TIMELINE },
    { h2: 'You decide who opens each story' },
    {
      p:
        'Every story carries its own audience, so you can share the beach day with all your followers and keep the birthday video for close family. Choose from five:'
    },
    AUDIENCE_LIST,
    { p: SHARE_LINK },
    { h2: 'No ads, nothing ranked' },
    { p: NO_ADS },
    { h2: 'What it costs' },
    { p: READERS_FREE },
    START_CTA,
    { p: 'See also: [coming from Tinybeans](/compare/tinybeans), [coming from a private Facebook group](/compare/facebook-groups).' }
  ]
}

const comparePrivateInstagram = {
  path: '/compare/private-instagram',
  title: 'Our Family Socials vs a private Instagram account',
  description:
    'Coming from a private Instagram account? Tell the long version: whole family stories with photos, clips and a map, opened by the audience you pick.',
  h1: 'Coming from a private Instagram account? Welcome to Our Family Socials.',
  lede:
    JOIN_LINE + ' Keep the people you trust, and give them the long version: a whole story for every trip and celebration, with your words, your photos, your clips and the map, opened by exactly the audience you pick.',
  breadcrumb: 'Coming from a private Instagram account',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'Tell the long version' },
    {
      p:
        'A story here has room for the whole day. Write it with headings, bold, italic, links and lists; drop photos and video clips in between the paragraphs, each with its own caption; and mark the places on the map as you go. The page builds a contents list from your headings and finishes with a gallery of everything. ' + STORY_NAME_NOTE
    },
    { h2: 'An audience for every story' },
    {
      p:
        'Privacy here is set story by story. Share the vacation with all your followers, the new baby with close family, and the marathon with your running friends. Choose from five:'
    },
    AUDIENCE_LIST,
    { p: SHARE_LINK },
    { h2: 'Conversation, family style' },
    {
      p:
        'Family can like the story, answer any photo or comment with one of ten reactions, and reply in threads that nest three levels deep. Email lets you know when someone comments on your story, asks to follow you, or posts a new story of their own.'
    },
    { h2: 'In date order, with no ads' },
    { p: NO_ADS },
    { h2: 'A map and a timeline to come back to' },
    { p: MAP_AND_TIMELINE },
    { h2: 'What it costs' },
    { p: READERS_FREE },
    START_CTA,
    { p: 'See also: [coming from a private Facebook group](/compare/facebook-groups), [how to share kids\' photos privately](/compare/how-to-share-photos-privately).' }
  ]
}

const howToSharePhotos = {
  path: '/compare/how-to-share-photos-privately',
  title: "How to share kids' photos privately with family",
  description:
    "How to share children's photos with family privately: what to look for, and how to do it step by step on Our Family Socials, a private family social network.",
  h1: "How to share kids' photos privately with family",
  lede:
    'Grandparents want to see every first tooth and every school play, and you want those photos kept inside the family. Here is what to look for in a private way to share, and how to do it step by step on Our Family Socials. ' + JOIN_LINE,
  breadcrumb: "How to share kids' photos privately",
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'What to look for' },
    {
      ul: [
        '**You choose the audience** - every photo and every story should go to exactly the people you pick. On Our Family Socials, each story has one of five audiences, from Private to Public.',
        '**A new story starts with family** - on Our Family Socials a new story goes to the followers you have approved, never to the open internet.',
        '**No ad targeting** - your family photos should never feed an advertising profile. Our Family Socials has no ads and never sells your data.',
        '**Easy for grandparents** - readers are free forever, sign-up takes an email address, and a share link opens one story with no account at all.',
        '**Organized by occasion** - a trip should stay together as one story, with its words, photos, clips and map.',
        '**Easy to find in ten years** - a timeline by year, a calendar and a world map of every story keep everything findable.'
      ]
    },
    { h2: 'How to do it on Our Family Socials' },
    {
      ol: [
        '**Start free.** Create an account at ourfamilysocials.com. Your 30-day Pro trial starts right away, no card needed.',
        '**Invite the family.** Send grandparents, aunts and uncles an email invitation; you are connected as soon as they sign up with it. Reading is free for them, forever.',
        '**Add the photos, then just talk.** Pick your photos and clips, type or say what happened, and AI Create drafts the story with a caption for every photo. Or write it yourself.',
        '**Choose who opens it.** Pick Private, a Custom Group, Close Family, Followers or Public for each story.',
        '**Share a link with anyone else.** A share link opens that one story for someone without an account, for 1 to 5 days.'
      ]
    },
    { h2: 'The five audiences' },
    AUDIENCE_LIST,
    { h2: 'Getting grandparents on board' },
    {
      ul: [
        '**Sign-up takes an email address**, and reading is free forever.',
        '**Private share links** send one story to someone who would rather not sign up for anything.',
        '**It works on any device** - phone, tablet or computer - right in the browser. Add it to the home screen today, and our iPhone app is on the way.',
        '**Email invitations** bring a relative straight in, with no searching for your name.'
      ]
    },
    { h2: 'Keep it organized for years' },
    { p: MAP_AND_TIMELINE },
    { p: NO_ADS },
    { h2: 'What it costs' },
    { p: READERS_FREE },
    { cta: [{ text: 'Try Our Family Socials free', href: '/login?signup=true', primary: true }, { text: 'Why Our Family Socials', href: '/alternatives' }] }
  ]
}

const alternatives = {
  path: '/alternatives',
  title: 'Why Our Family Socials - compare private family sharing',
  description:
    'Why families are moving to Our Family Socials: long family stories, five audiences, journey maps and a timeline, no ads, nothing ranked, and readers are free.',
  h1: WHY_HEAD,
  lede:
    JOIN_LINE + ' Our Family Socials is a private, ad-free family social network built around the story: the long version of a trip, a birthday or an ordinary Tuesday, with your words, captioned photos, video and a journey map, opened by exactly the people you choose.',
  breadcrumb: 'Why Our Family Socials',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'A whole story for every moment' },
    {
      p:
        'A story is a page of its own for something that happened: what you did, in your words, with a gallery of captioned photos, video clips right where they belong, the dates and the places. Add a few headings and the page builds its own contents list. Short on time? Add the photos, say what happened, and AI Create writes the first draft. ' + STORY_NAME_NOTE
    },
    { h2: 'You decide who opens it' },
    { p: 'Every story carries its own audience. Choose from five:' },
    AUDIENCE_LIST,
    { p: SHARE_LINK },
    { h2: 'Every trip on a map, every year on a timeline' },
    { p: MAP_AND_TIMELINE },
    { h2: 'No ads. Nothing ranked.' },
    { p: NO_ADS },
    { h2: 'Readers are free' },
    { p: READERS_FREE },
    { h2: 'Coming from somewhere else?' },
    { h3: 'Coming from a private Facebook group?' },
    {
      p:
        'Bring the group with you. Everyone you invite reads for free, every story goes to exactly the audience you pick, and the feed runs in date order with no ads. [See what your group gets here](/compare/facebook-groups).'
    },
    { h3: 'Coming from Tinybeans?' },
    {
      p:
        'Keep every milestone, and make room for the whole family. Grandparents, aunts and cousins tell their stories too, on one timeline and one map that grow up with your kids. [See what your family gets here](/compare/tinybeans).'
    },
    { h3: 'Coming from FamilyAlbum?' },
    {
      p:
        'Turn the photos into stories. Smart Import sorts a big batch into albums by time and place, AI Create writes it up from a few words, and every trip gets its own journey map. [See what your photos get here](/compare/familyalbum).'
    },
    { h3: 'Coming from a private Instagram account?' },
    {
      p:
        'Tell the long version. A story has room for all the writing, photos and clips the day deserves, and you choose who opens each one, story by story. [See what your stories get here](/compare/private-instagram).'
    },
    { h3: 'Sharing photos of the kids with grandparents?' },
    {
      p:
        'Here is what to look for, and how to do it step by step. [Read the guide to sharing kids\' photos privately](/compare/how-to-share-photos-privately).'
    },
    { cta: [{ text: 'Start free', href: '/login?signup=true', primary: true }, { text: 'See all features', href: '/features' }] }
  ]
}

export const PAGES = [
  home,
  features,
  pricing,
  faq,
  about,
  alternatives,
  compareFacebookGroups,
  compareTinybeans,
  compareFamilyAlbum,
  comparePrivateInstagram,
  howToSharePhotos
]

export const pageByPath = (path) => PAGES.find((p) => p.path === path)

// Prerendered to dist/404.html (Vercel serves it with a real HTTP 404 for any
// address that matches neither a static file nor a rewritten React route).
// Deliberately not in PAGES: it must stay out of the sitemap, llms.txt and the
// SEO checks, and it carries robots: noindex.
export const NOT_FOUND_PAGE = {
  path: '/404',
  noindex: true,
  title: 'Page not found - Our Family Socials',
  description:
    'That link does not point anywhere on Our Family Socials. Try the home page, features, pricing or the FAQ.',
  h1: 'Page not found',
  lede:
    'That link does not point anywhere on Our Family Socials. It may have moved, or the address may have a typo in it.',
  blocks: [
    { h2: 'Try one of these' },
    {
      ul: [
        '[Home](/) - what Our Family Socials is',
        '[Features](/features) - everything it does',
        '[Pricing](/pricing) - the free plan, Pro and Lifetime',
        '[FAQ](/faq) - privacy, events, billing and sharing',
        '[Why Our Family Socials](/alternatives)',
        '[Contact us](/contact)'
      ]
    }
  ]
}

// Note: /privacy, /terms, /contact and /blog are public React routes but are
// deliberately NOT in the sitemap, because they are not prerendered and so
// carry no text for crawlers that do not run JavaScript. They stay crawlable
// via the footer. See SEO.md.
