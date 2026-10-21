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
// Every fact here must be traceable to this repo (PricingPage.jsx, the API
// code, the FAQ) or to a competitor's own website, hedged and dated.
import { faqCategories, flatFaqs } from './faqData.js'

export const LAST_UPDATED = 'October 2026'
// ISO form of the same date, used for sitemap <lastmod> and JSON-LD dateModified.
// Bump both when the content on these pages actually changes.
export const LAST_UPDATED_ISO = '2026-10-21'

const PRICE_NOTE =
  'Free plan $0/forever, Pro $9/month billed annually ($108/year) or $12/month billed monthly, and a one-time Lifetime plan at $294. Every new account gets a 30-day free trial of Pro, no credit card required.'

// The three notes below describe what the product actually enforces, so the
// marketing copy, the FAQ, the JSON-LD and the llms files cannot promise more
// than the code delivers. Sources: PrivacySelector.jsx and CreateEvent.jsx (the
// audience options and their default), backend/app/utils/privacy.py
// (can_view_event, filter_events_for_feed), backend/app/api/events.py
// (create_event limits) and backend/app/models/user.py (can_view_event).
const AUDIENCE_NOTE =
  'You choose an audience for every event you create: **Followers** (the default), **Close Family**, a **custom group**, **Private** (only you) or **Public**. Public events can be opened by anyone who has the link, including people without an account, so choose a narrower audience for anything you want kept inside the family.'

const FEED_NOTE =
  'One thing worth knowing: signed-in members can see an event in the shared feed unless you set it to Private, and opening the event page itself is then gated by the audience you chose. People who are not signed in only ever see events set to Public.'

const PLAN_RULES =
  'Every new account starts with a 30-day Pro trial and no credit card is required. During the trial you can publish up to 5 events - only published events count, so drafts and deleted events are free. Pro and Lifetime remove the 5-event limit. If the trial ends and you have not subscribed you keep a free account for viewing, liking and commenting, but you cannot create new events until you subscribe.'

const EXPIRED_VIEWING =
  'After the trial you can still browse the feed, and you can still open your own events, any event set to Public, and events from the people you follow. Opening anything else needs an active trial or subscription.'

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
        '**Interactive maps and timeline** - see every trip on an interactive world map, follow multi-location journey maps, and browse a timeline organised by year. Filter by person, place or date.',
        '**GPS extraction from photos** - Our Family Socials reads the location data already stored in your photos and suggests the places you visited.',
        '**Video support** - add video clips alongside photos, with a built-in trimmer.',
        '**AI Create (beta)** - upload a batch of photos and AI groups them, asks a few questions and drafts the story for you to edit. Available on a paid plan or during the free trial.',
        '**Family trees** - a visual family tree built from relationships both people have confirmed.',
        '**Tag profiles** - tag children, older relatives or pets who do not have an account yet; they can claim the profile later.',
        '**Audience controls** - choose who sees each event, from Public down to a custom group such as "close family only" or Private, just for you.'
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
        '[FAQ](/faq) - 30 questions about privacy, events, billing and sharing.',
        '[About](/about) - why this exists and who it is for.',
        '[Private family sharing app alternatives](/alternatives) - an honest look at the other options.',
        '[Our Family Socials vs private Facebook groups](/compare/facebook-groups)',
        '[Our Family Socials vs Tinybeans](/compare/tinybeans)',
        '[Our Family Socials vs FamilyAlbum](/compare/familyalbum)',
        '[Our Family Socials vs a private Instagram account](/compare/private-instagram)',
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
    'Every feature of Our Family Socials: private event pages, a chronological family feed, interactive journey maps, GPS photo extraction and family trees.',
  h1: 'Our Family Socials features',
  lede:
    'Our Family Socials is a private family social network, and these are the features it ships with today. Everything below is live in the product; anything still being built is marked as such.',
  breadcrumb: 'Features',
  blocks: [
    { h2: 'A private, chronological family feed' },
    {
      p:
        'Follow the family members and close friends you care about. Their events appear in a feed ordered by time, not by an engagement algorithm, so a quiet post about a grandparent\'s birthday is just as visible as a three-week holiday. Following is request-based: every follow request is yours to accept or decline.'
    },
    {
      ul: [
        'Chronological feed with no algorithmic ranking',
        'Follow requests you accept or decline',
        'Likes and comments from the people you have approved',
        'Notifications for major life events',
        'Email invitations so you can bring relatives in directly'
      ]
    },
    { h2: 'Rich event pages instead of single posts' },
    {
      p:
        'The core unit in Our Family Socials is an event, not a post. An event is a trip, a birthday, a graduation or a Sunday dinner, with everything that belongs to it in one place.'
    },
    {
      ul: [
        'Photo galleries with full-screen lightbox viewing',
        'A rich text editor for the story behind the photos',
        'Video clips, with a built-in trimmer before upload',
        'Multiple locations per event, for road trips and multi-stop holidays',
        'Dates, categories and tagged family members',
        'Drafts that only you can see, and a trash that holds deleted events for 30 days'
      ]
    },
    { h2: 'Maps, journeys and timeline' },
    {
      p:
        'Because every event can carry locations, your family history becomes something you can browse geographically as well as chronologically.'
    },
    {
      ul: [
        'An interactive world map with a marker for every event you have access to',
        'Journey maps that connect the stops of a single multi-location trip',
        'A timeline view grouped by year',
        'Filters by person, place, category and date',
        'Automatic GPS extraction from photo metadata, so locations are suggested for you'
      ]
    },
    { h2: 'AI Create (beta)' },
    {
      p:
        'AI Create helps with the part most people never get round to: writing the story. You upload a batch of photos, it groups them into a coherent album, asks you a few questions about the trip, and drafts a description you can edit. It is a beta feature, it can make mistakes, and you always review the draft before publishing. AI Create requires an active paid plan or an active free trial.'
    },
    { h2: 'Family trees and relationships' },
    {
      p:
        'You can record how people are actually related - sister, dad, cousin - and both people have to confirm the relationship before it counts. Confirmed relationships build an interactive family tree. For relatives who are not on the platform (young children, older relatives, even pets) you can create a tag profile, tag them in events, and let them claim the profile if they join later.'
    },
    { h2: 'Audience and privacy controls' },
    { p: AUDIENCE_NOTE },
    {
      ul: [
        'Five audience settings per event: Followers (the default), Close Family, a custom group, Private, or Public',
        'Public events are readable by anyone with the link, signed in or not - they are the one setting that is not family-only',
        'Private share links let someone view one specific event without an account, and nothing else',
        'Follow requests are approved by you, and verified relationships need both people to confirm',
        'No advertising anywhere in the product, and no selling of your data'
      ]
    },
    { p: FEED_NOTE },
    { h2: 'Works on the device you already have' },
    {
      p:
        'Our Family Socials is a progressive web app. It runs in the browser on phones, tablets and computers, and on most phones you can add it to your home screen so it opens like a native app. There is no App Store or Google Play download to wait for.'
    },
    { h2: 'Coming soon' },
    {
      p:
        'Printed photo books from an event are advertised on the home page as coming soon. They are not available yet, so do not pick Our Family Socials for printing today.'
    },
    { h2: 'What it costs' },
    { p: PRICE_NOTE },
    { p: PLAN_RULES },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'See pricing', href: '/pricing' }] },
    { p: 'See also: [FAQ](/faq), [about Our Family Socials](/about) and [private family sharing alternatives](/alternatives).' }
  ]
}

const pricing = {
  path: '/pricing',
  title: 'Pricing - Our Family Socials',
  description:
    'Our Family Socials pricing: free to view forever, Pro at $9/month billed annually or $12/month, and Lifetime at $294 once. 30-day free trial on all plans.',
  h1: 'Simple, transparent pricing',
  lede:
    'Our Family Socials is free to view forever, and paid when you want to create events beyond the 5 you can publish during your trial. Start for free, upgrade when you need more.',
  breadcrumb: 'Pricing',
  blocks: [
    { p: PLAN_RULES },
    { h2: 'Free to View - $0/forever' },
    { p: 'Perfect for family viewers.' },
    {
      ul: [
        '**View-only once your trial ends** - creating an event needs an active trial or subscription',
        'View the events you have access to',
        'Like and comment',
        'Follow family members',
        'Interactive maps & timeline',
        '30-day Pro trial included, with up to 5 published events'
      ]
    },
    { h2: 'Pro - $9/month billed annually, or $12/month billed monthly' },
    { p: 'Most popular. Billed annually at $108/year, or monthly at $12/month.' },
    {
      ul: [
        '**Create unlimited events**',
        'Photo and video uploads',
        'Journey mapping',
        'GPS extraction from photos',
        'Privacy controls',
        'Rich text editor'
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
          a: 'Sign up and get Pro features for 30 days, with no credit card required. You can publish up to 5 events during the trial. If you subscribe within the first 5 days, you get an extra month free (60 days total).'
        },
        {
          q: 'What happens when my trial ends?',
          a: EXPIRED_VIEWING + ' You cannot create new events until you subscribe.'
        },
        {
          q: 'Can I cancel anytime?',
          a: 'Yes! Cancel your subscription anytime with no questions asked. You\'ll keep access until the end of your billing period.'
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
    'Our Family Socials is a private, ad-free social network designed specifically for families to share life events, photos and memories together. Unlike public social media platforms, a new event goes to the family you have approved rather than to the open internet, and there are no algorithms deciding what you see.',
  breadcrumb: 'About',
  blocks: [
    { h2: 'Why it exists' },
    {
      p:
        'We built this platform because existing social networks were not designed for families. They are cluttered with ads, algorithms hide your posts, and your family photos end up mixed with everything else in an endless scroll. Our Family Socials gives families a dedicated space to preserve memories the way they deserve.'
    },
    { h2: 'Why we are different' },
    {
      ul: [
        '**You choose the audience** - a new event goes to the followers you have approved, and you can set any event to Close Family, a custom group such as "close family only", Private (just you) or Public (anyone with the link).',
        '**No ads, ever** - we will never sell your data or show you ads. Your family memories are not a product to be monetised.',
        '**Rich event pages** - photo galleries, detailed stories, multiple locations and GPS-tagged journey maps.',
        '**Interactive maps and timeline** - see your family\'s adventures on an interactive world map, and watch years of memories unfold chronologically.',
        '**AI Create (beta)** - let AI help draft an event description from your photos, then edit it yourself.',
        '**Built for families** - made by a family, for families. We use this app ourselves to stay connected with our own loved ones.'
      ]
    },
    { h2: 'How it works' },
    {
      ol: [
        '**Create an account** - sign up for free at ourfamilysocials.com. You get a 30-day Pro trial automatically, with up to 5 published events during it.',
        '**Follow your family** - send follow requests to family members. Once they accept, you see each other\'s events.',
        '**Share life events** - create event pages with photos, stories, locations and dates. Choose the audience for each event.',
        '**Stay connected** - view your family\'s events in the feed, on the map or in the timeline. Comment, like and engage.'
      ]
    },
    { h2: 'Who it is for' },
    {
      ul: [
        '**Parents** wanting to share kids\' milestones with grandparents',
        '**Extended families** staying connected across distance',
        '**Travellers** documenting vacations with rich photo albums and maps',
        '**Anyone** tired of public social media and looking for a private alternative',
        '**Families** who value privacy and want to preserve memories without ads'
      ]
    },
    { h2: 'Pricing' },
    { p: PRICE_NOTE },
    { p: PLAN_RULES },
    { cta: [{ text: 'Sign up free', href: '/login?signup=true', primary: true }, { text: 'View pricing details', href: '/pricing' }] },
    { p: 'See also: [features](/features), the [FAQ](/faq) and [how we compare to the alternatives](/alternatives).' }
  ]
}

const faq = {
  path: '/faq',
  title: 'FAQ - Our Family Socials',
  description:
    'Answers to common questions about Our Family Socials: what it is, who can see your events, what the free plan includes, what Pro costs, and how sharing works.',
  h1: 'Our Family Socials FAQ',
  lede:
    'Frequently asked questions about Our Family Socials, a private social network for families. If your question is not answered here, email ' + 'support@ourfamilysocials.com.',
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
    'Private Facebook groups vs Our Family Socials for family photo sharing: cost, privacy, feed order, organisation, and where Facebook is still better.',
  h1: 'Our Family Socials vs private Facebook groups',
  lede:
    'A private Facebook group is the default way most families share photos, and Our Family Socials is a purpose-built private family network. This page compares the two fairly so you can pick the right one. Facts about Facebook are general and taken from Meta\'s own documentation as of October 2026 - check [facebook.com](https://www.facebook.com/) for current details.',
  breadcrumb: 'vs private Facebook groups',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'The short answer' },
    {
      p:
        'Use a private Facebook group if every relative is already on Facebook, you want it to cost nothing, and you mainly want a chat-and-photos stream. Use Our Family Socials if you want family memories kept off an advertising platform, organised into event pages with maps and a timeline, and visible in the order they were posted.'
    },
    { h2: 'Where private Facebook groups are stronger' },
    {
      ul: [
        '**No cost.** Facebook groups are free to create and use. Our Family Socials charges for creating unlimited events.',
        '**Everyone is already there.** No relative has to sign up for a new service, and most already know how groups work.',
        '**More general-purpose tools.** Group chat, polls, RSVP-style events and a much larger ecosystem of features.',
        '**Native iOS and Android apps** with years of polish; Our Family Socials is a progressive web app you add to your home screen.'
      ]
    },
    { h2: 'Key differences' },
    {
      compare: {
        aLabel: 'Private Facebook group',
        bLabel: 'Our Family Socials',
        rows: [
          {
            h: 'Platform and business model',
            a: 'Runs on Meta\'s advertising platform, which is funded by ads and subject to Meta\'s policy changes.',
            b: 'A separate, subscription-funded platform. No advertising in the product and no selling of your data.'
          },
          {
            h: 'Feed order',
            a: 'Facebook ranks what you see algorithmically, so posts in a group may not appear chronologically and can be missed.',
            b: 'Strictly chronological. Every event from the people you follow appears in the order it was shared.'
          },
          {
            h: 'Organisation',
            a: 'Posts live in one long scroll. Finding last year\'s holiday album means scrolling or searching.',
            b: 'Events organised by date, location, person and category, with timeline and map views.'
          },
          {
            h: 'Location features',
            a: 'Basic location tagging on a post.',
            b: 'Interactive world map, multi-stop journey maps, and automatic GPS extraction from photo metadata.'
          },
          {
            h: 'Page depth',
            a: 'A post with a caption and an album.',
            b: 'An event page with a rich text story, galleries, videos, multiple locations, dates and tagged family members.'
          },
          {
            h: 'Account requirements',
            a: 'Every member needs a Facebook account.',
            b: 'Sign-up with an email address, or view a single event through a private share link with no account at all.'
          }
        ]
      }
    },
    { h2: 'What it costs' },
    {
      p:
        'A Facebook group costs nothing. Our Family Socials is free to view forever, and paid when you want to create unlimited events: ' + PRICE_NOTE
    },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'Compare the alternatives', href: '/alternatives' }] },
    { p: 'See also: [vs Tinybeans](/compare/tinybeans), [vs FamilyAlbum](/compare/familyalbum), [vs a private Instagram account](/compare/private-instagram).' }
  ]
}

const compareTinybeans = {
  path: '/compare/tinybeans',
  title: 'Our Family Socials vs Tinybeans',
  description:
    'Tinybeans vs Our Family Socials: how a baby and toddler journal differs from a whole-family event network, and the cases where Tinybeans wins.',
  h1: 'Our Family Socials vs Tinybeans',
  lede:
    'Tinybeans is a private photo-sharing app built around young children, and Our Family Socials is a private social network for a whole family\'s events. They overlap, but they are aimed at different jobs. Details about Tinybeans below are general and taken from [tinybeans.com](https://tinybeans.com/) as of October 2026; check their site for current features and prices.',
  breadcrumb: 'vs Tinybeans',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'The short answer' },
    {
      p:
        'Choose Tinybeans if your main need is a private day-by-day journal of a baby or young child, shared with a small circle, from a polished mobile app. Choose Our Family Socials if you want one private space for the whole family\'s events - kids\' milestones but also holidays, anniversaries, reunions and grandparents\' birthdays - organised on a map and a timeline.'
      },
    { h2: 'Where Tinybeans is stronger' },
    {
      ul: [
        '**Native iOS and Android apps**, where Our Family Socials is a progressive web app you install from the browser.',
        '**Purpose-built for the baby and toddler years**, including milestone tracking and a daily journal format that fits that stage well.',
        '**Printed photo books are available today.** Photo books in Our Family Socials are advertised as coming soon and are not available yet.',
        '**A large library of parenting articles** published alongside the app.',
        '**A much longer track record** and a far bigger existing user base.'
      ]
    },
    { h2: 'Key differences' },
    {
      compare: {
        aLabel: 'Tinybeans',
        bLabel: 'Our Family Socials',
        rows: [
          {
            h: 'Who the content is about',
            a: 'Primarily a child: a private journal of a baby or young child shared with invited loved ones.',
            b: 'The whole family: kids\' milestones, holidays, weddings, reunions, Sunday dinners, grandparents\' birthdays.'
          },
          {
            h: 'Unit of content',
            a: 'Dated photo and video entries in a journal, organised by day and month.',
            b: 'Event pages: a trip or celebration with a story, galleries, videos, dates and several locations.'
          },
          {
            h: 'Maps',
            a: 'Not a focus of the product.',
            b: 'Interactive world map, multi-stop journey maps, and GPS extraction from photo metadata.'
          },
          {
            h: 'Network shape',
            a: 'An invited audience for your own journal.',
            b: 'A follow graph across the extended family, plus confirmed relationships and a family tree.'
          },
          {
            h: 'Platform',
            a: 'Native mobile apps plus a web view.',
            b: 'Progressive web app on phone, tablet and desktop; installable to the home screen.'
          }
        ]
      }
    },
    { h2: 'What it costs' },
    {
      p:
        'Tinybeans offers a free tier and a paid Tinybeans+ subscription; see [tinybeans.com](https://tinybeans.com/) for current pricing, which we deliberately do not quote here because it changes. Our Family Socials: ' + PRICE_NOTE
    },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'Compare the alternatives', href: '/alternatives' }] },
    { p: 'See also: [vs FamilyAlbum](/compare/familyalbum), [vs private Facebook groups](/compare/facebook-groups).' }
  ]
}

const compareFamilyAlbum = {
  path: '/compare/familyalbum',
  title: 'Our Family Socials vs FamilyAlbum',
  description:
    'FamilyAlbum vs Our Family Socials: free unlimited photo storage and prints versus private event pages, journey maps and a whole-family network.',
  h1: 'Our Family Socials vs FamilyAlbum',
  lede:
    'FamilyAlbum is a free, invite-only photo and video sharing app built around a child\'s album, and Our Family Socials is a private social network built around whole-family events. If you mainly need somewhere free to put a lot of photos, FamilyAlbum is hard to beat; if you want each trip told as a story on a map, this is where Our Family Socials fits. Details about FamilyAlbum are general and taken from [family-album.com](https://family-album.com/) as of October 2026.',
  breadcrumb: 'vs FamilyAlbum',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'The short answer' },
    {
      p:
        'Choose FamilyAlbum if free unlimited photo and video storage, automatic month-by-month organisation and cheap prints are what you want. Choose Our Family Socials if you want rich event pages with written stories, an interactive map of everywhere your family has been, a timeline by year, and a follow graph across the extended family rather than one child\'s album.'
    },
    { h2: 'Where FamilyAlbum is stronger' },
    {
      ul: [
        '**Free unlimited storage.** FamilyAlbum advertises free, unlimited photo and video uploads on its website; Our Family Socials needs a paid plan to create unlimited events.',
        '**Free monthly prints.** FamilyAlbum advertises 11 free photo prints a month for each family member, plus photobooks. Our Family Socials does not print anything yet.',
        '**Native iOS and Android apps.** Our Family Socials is a progressive web app.',
        '**Zero-effort organisation.** Uploads are sorted into a month-by-month album automatically, which is less work than writing an event page.'
      ]
    },
    { h2: 'Key differences' },
    {
      compare: {
        aLabel: 'FamilyAlbum',
        bLabel: 'Our Family Socials',
        rows: [
          {
            h: 'What it is built around',
            a: 'An album of a child\'s photos and videos, shared with invited family, auto-sorted by month.',
            b: 'Events: a trip, celebration or milestone belonging to anyone in the family, with the story attached.'
          },
          {
            h: 'Storytelling',
            a: 'Comments and reactions on photos, with captions.',
            b: 'A rich text editor per event, so the context, route and detail live with the photos.'
          },
          {
            h: 'Maps and places',
            a: 'Not a focus of the product.',
            b: 'Interactive world map, multi-stop journey maps, automatic GPS extraction from photo metadata, and filters by place.'
          },
          {
            h: 'Who is in it',
            a: 'You invite viewers to your album.',
            b: 'Extended family follow each other, confirm real relationships, and get a shared family tree.'
          },
          {
            h: 'Prints',
            a: 'Prints and photobooks are a core, available part of the product.',
            b: 'Photo books are advertised as coming soon and are not available yet.'
          },
          {
            h: 'Business model',
            a: 'Free with a Premium tier and print sales; see their site for current terms.',
            b: 'Subscription-funded, no advertising in the product, no selling of your data.'
          }
        ]
      }
    },
    { h2: 'What it costs' },
    {
      p:
        'FamilyAlbum\'s website advertises the core app as free with unlimited storage, alongside a Premium tier and paid prints - check [family-album.com](https://family-album.com/) for current terms. Our Family Socials: ' + PRICE_NOTE
    },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'Compare the alternatives', href: '/alternatives' }] },
    { p: 'See also: [vs Tinybeans](/compare/tinybeans), [vs private Facebook groups](/compare/facebook-groups).' }
  ]
}

const comparePrivateInstagram = {
  path: '/compare/private-instagram',
  title: 'Our Family Socials vs a private Instagram account',
  description:
    'Using a private Instagram account for family photos versus a private family social network. Honest comparison of privacy, organisation, feed order and cost.',
  h1: 'Our Family Socials vs a private Instagram account',
  lede:
    'Many families use a private ("finsta"-style) Instagram account, or a private group photo app such as Cluster, to share pictures with relatives only. Our Family Socials is a private family social network built for the same job. This page compares them fairly. Facts about Instagram are general, from Meta\'s own documentation as of October 2026 - see [instagram.com](https://www.instagram.com/) for current details.',
  breadcrumb: 'vs a private Instagram account',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'The short answer' },
    {
      p:
        'A private Instagram account is free, instant, and already installed on everyone\'s phone. Our Family Socials costs money to post but keeps family memories off an advertising platform and organises them into event pages, a map and a timeline you can still browse in ten years.'
    },
    { h2: 'Where a private Instagram account is stronger' },
    {
      ul: [
        '**Free, and already on every phone.** No relative needs a new account or a new app.',
        '**Native apps, Stories, Reels and DMs** - a much broader set of ways to share a moment.',
        '**Excellent camera and editing tools** built into the app.',
        '**Instant.** Posting takes seconds, where writing an event page takes a few minutes.'
      ]
    },
    { h2: 'Key differences' },
    {
      compare: {
        aLabel: 'Private Instagram account',
        bLabel: 'Our Family Socials',
        rows: [
          {
            h: 'What "private" means',
            a: 'Only approved followers see your posts, but the account still sits on Meta\'s advertising platform and is governed by its terms.',
            b: 'Per-event audience settings - Followers by default, down to Private or up to Public - on a separate, subscription-funded platform, with no advertising in the product and no data selling.'
          },
          {
            h: 'Feed order',
            a: 'Algorithmically ranked and mixed with suggested content, so a family post can be missed.',
            b: 'Chronological, and only from the family members you follow.'
          },
          {
            h: 'Organisation over years',
            a: 'A grid of individual posts. Finding one trip means scrolling back through everything.',
            b: 'Event pages grouped by date, place, person and category, with a map and a year-by-year timeline.'
          },
          {
            h: 'Depth per memory',
            a: 'Caption plus up to a fixed number of photos per post.',
            b: 'A full event page: rich text story, galleries, videos, multiple locations and tagged people.'
          },
          {
            h: 'Sharing outside the circle',
            a: 'Followers only, or you make the whole account public.',
            b: 'A private link can share one single event with someone who has no account, without exposing anything else.'
          },
          {
            h: 'Relationships',
            a: 'A flat follower list.',
            b: 'Confirmed family relationships, tag profiles for relatives without accounts, and a family tree.'
          }
        ]
      }
    },
    { h2: 'What about Cluster?' },
    {
      p:
        'Cluster is another well-known private group photo-sharing app in this category. We have deliberately not listed its current features or pricing here because we have not verified them recently - check [cluster.co](https://cluster.co/) directly if you are considering it.'
    },
    { h2: 'What it costs' },
    { p: 'Instagram is free. Our Family Socials: ' + PRICE_NOTE },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'Compare the alternatives', href: '/alternatives' }] },
    { p: 'See also: [vs private Facebook groups](/compare/facebook-groups), [how to share kids\' photos privately](/compare/how-to-share-photos-privately).' }
  ]
}

const howToSharePhotos = {
  path: '/compare/how-to-share-photos-privately',
  title: "How to share kids' photos privately with family",
  description:
    "How to share children's photos with family without public social media: cloud albums, group chats, child photo apps, private family networks.",
  h1: "How to share kids' photos privately with family",
  lede:
    'If you do not want your children\'s photos on public social media but grandparents still want to see them, you have four realistic options: a shared cloud album, a private group chat, a private photo app, or a private family social network. This guide explains what each is good at and how to choose.',
  breadcrumb: "How to share kids' photos privately",
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'What to look for' },
    {
      ul: [
        '**Private by default** - content should be invisible until you deliberately share it',
        '**Audience control** - choose exactly who sees each photo or album',
        '**No ad targeting** - your family photos should not be feeding an advertising profile',
        '**Easy for grandparents** - simple enough for relatives who are not comfortable with new apps',
        '**Organised by occasion** - so a trip stays together instead of dissolving into a camera roll',
        '**Durable** - you want to still be able to find this in ten years'
      ]
    },
    { h2: 'Option 1: a shared cloud album' },
    {
      p:
        'Apple Shared Albums, Google Photos shared albums and similar features let you invite specific people to an album. They are free with the storage you already pay for, and almost everyone can open a link.'
    },
    {
      ul: [
        '**Good for:** bulk photos, zero extra cost, no new app for relatives.',
        '**Weak at:** writing the story, organising by occasion over years, and keeping everything in one place when half the family is on iPhone and half on Android.'
      ]
    },
    { h2: 'Option 2: a private group chat' },
    {
      p:
        'WhatsApp, Signal or iMessage group chats are the lowest-friction option: everyone is already there and photos arrive instantly.'
    },
    {
      ul: [
        '**Good for:** immediacy and conversation.',
        '**Weak at:** archiving. Photos get compressed, scroll away, and are effectively unfindable a year later.'
      ]
    },
    { h2: 'Option 3: a private photo app for children' },
    {
      p:
        'Apps like [FamilyAlbum](https://family-album.com/) and [Tinybeans](https://tinybeans.com/) are built for exactly this: a private, invite-only album of a baby or young child, with native mobile apps and printing options.'
    },
    {
      ul: [
        '**Good for:** the baby and toddler years, free or cheap storage, prints and photo books.',
        '**Weak at:** growing with the family. They are centred on a child rather than on holidays, reunions and the rest of the family\'s life. See our [FamilyAlbum comparison](/compare/familyalbum) and [Tinybeans comparison](/compare/tinybeans).'
      ]
    },
    { h2: 'Option 4: a private family social network' },
    {
      p:
        'A private family social network such as **Our Family Socials** gives you the social part - a feed, comments, likes, following - without the public part. Each memory becomes an event page with a story, a gallery, dates and locations; relatives follow each other; and each event carries an audience setting, from your approved followers down to just you, or Public if you want a link anyone can open.'
    },
    {
      ul: [
        '**Good for:** an ongoing, organised family record across all ages, with maps, a timeline and real context around the photos.',
        '**Weak at:** being free. Viewing is free forever, but creating unlimited events needs a paid plan, and relatives do need to create an account (or open a single-event private link).'
      ]
    },
    { h2: 'Getting grandparents on board' },
    {
      ul: [
        '**Sign-up is just an email and password**, and viewing accounts are free forever.',
        '**Private share links** let you send one event to someone who refuses to sign up for anything.',
        '**It works on any device** - phone, tablet or computer - through the browser, with no app store download.',
        '**Email invitations** mean you can add a relative directly rather than explaining how to search for you.'
      ]
    },
    { h2: 'How to choose' },
    {
      p:
        'If you want the cheapest possible dump of photos, use a shared cloud album. If you want conversation, use a group chat. If your child is under three and you want prints, use a dedicated child photo app. If you want a private family record that still makes sense in a decade - organised by event, place and person - use a private family social network.'
    },
    { cta: [{ text: 'Try Our Family Socials free', href: '/login?signup=true', primary: true }, { text: 'See all alternatives', href: '/alternatives' }] }
  ]
}

const alternatives = {
  path: '/alternatives',
  title: 'Best private family sharing apps (honest comparison)',
  description:
    'An honest look at private family sharing apps - FamilyAlbum, Tinybeans, private Facebook groups, private Instagram, cloud albums - and where each one wins.',
  h1: 'Private family sharing apps: the honest comparison',
  lede:
    'If you are looking for a private place to share family photos and life events, these are the realistic options as of October 2026, what each is genuinely best at, and where Our Family Socials fits. Our Family Socials is our own product, so we have been explicit about the cases where you should pick something else. Competitor details are general and taken from each company\'s own website on the date above.',
  breadcrumb: 'Alternatives',
  updated: LAST_UPDATED,
  blocks: [
    { h2: 'Our Family Socials - best for whole-family events on a map and timeline' },
    {
      p:
        '[Our Family Socials](/) is a private, ad-free social network for families. Its unit of content is an event - a trip, a wedding, a graduation, a Sunday dinner - with a written story, photo galleries, videos, dates and multiple locations. Events appear in a chronological feed from the family members you follow, on an interactive world map, and in a timeline by year. Relationships are confirmed by both people and build a family tree.'
    },
    {
      ul: [
        '**Pick it if:** you want the whole family\'s memories in one private, organised archive, with places and stories attached, and you are happy to pay so there are no ads.',
        '**Pick something else if:** you need free unlimited photo storage, printed photo books today, or native App Store and Google Play apps. Our Family Socials is a progressive web app, and photo books are still coming soon.',
        '**Cost:** ' + PRICE_NOTE
      ]
    },
    { h2: 'FamilyAlbum - best for free unlimited storage and cheap prints' },
    {
      p:
        '[FamilyAlbum](https://family-album.com/) is an invite-only photo and video sharing app centred on a child\'s album. Its website advertises free unlimited uploads, automatic month-by-month organisation and 11 free prints a month per family member, plus photobooks and a Premium tier.'
    },
    {
      ul: [
        '**Pick it if:** cost and volume matter most, you want prints, and your focus is one child.',
        '**Pick something else if:** you want holidays, reunions and the whole extended family on a map and timeline rather than one album. See the [full comparison](/compare/familyalbum).'
      ]
    },
    { h2: 'Tinybeans - best for a baby and toddler journal' },
    {
      p:
        '[Tinybeans](https://tinybeans.com/) is a private photo-sharing app for parents, organised as a dated journal of a young child and shared with an invited circle. It has native mobile apps, photo books, a paid Tinybeans+ tier and a large parenting content library.'
    },
    {
      ul: [
        '**Pick it if:** your main need is the day-by-day record of a baby or young child, from a polished mobile app.',
        '**Pick something else if:** you want one place that still works when the children are teenagers and the grandparents are posting too. See the [full comparison](/compare/tinybeans).'
      ]
    },
    { h2: 'A private Facebook group - best if nobody will install anything new' },
    {
      p:
        'A private group on [Facebook](https://www.facebook.com/) is free, and most relatives already have an account. It is the lowest-friction option by a wide margin.'
    },
    {
      ul: [
        '**Pick it if:** cost is zero-tolerance and the family will not adopt a new service.',
        '**Pick something else if:** you do not want family memories on an advertising platform, or you are tired of an algorithm deciding which posts relatives see. See the [full comparison](/compare/facebook-groups).'
      ]
    },
    { h2: 'A private Instagram account (or Cluster) - best for instant, casual sharing' },
    {
      p:
        'A private [Instagram](https://www.instagram.com/) account restricts posts to approved followers, and apps like [Cluster](https://cluster.co/) offer private group photo sharing. Both are free and fast.'
    },
    {
      ul: [
        '**Pick it if:** you want to post in seconds from an app you already use.',
        '**Pick something else if:** you want to find a specific trip years later, or keep the archive off an ad platform. See the [full comparison](/compare/private-instagram).'
      ]
    },
    { h2: 'Shared cloud albums - best for cheap bulk storage' },
    {
      p:
        'Apple Shared Albums and Google Photos shared albums let you invite specific people into an album using storage you already pay for.'
    },
    {
      ul: [
        '**Pick it if:** you just need a lot of photos somewhere private, cheaply.',
        '**Pick something else if:** you want the story, the places and the family conversation around the photos. See our [guide to private photo sharing](/compare/how-to-share-photos-privately).'
      ]
    },
    { h2: 'Summary' },
    {
      compare: {
        aLabel: 'If this matters most',
        bLabel: 'Pick',
        rows: [
          { h: 'Free unlimited photo storage and prints', a: 'Cost and volume', b: 'FamilyAlbum' },
          { h: 'A daily journal of a young child', a: 'One child, mobile-first', b: 'Tinybeans' },
          { h: 'Nobody will install anything new', a: 'Zero friction', b: 'A private Facebook group' },
          { h: 'Posting in seconds from an existing app', a: 'Speed and casualness', b: 'A private Instagram account' },
          { h: 'A whole-family archive of events, places and stories, with no ads', a: 'Organisation and privacy', b: 'Our Family Socials' }
        ]
      }
    },
    { cta: [{ text: 'Start your free trial', href: '/login?signup=true', primary: true }, { text: 'See all features', href: '/features' }] }
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
        '[Private family sharing apps compared](/alternatives)',
        '[Contact us](/contact)'
      ]
    }
  ]
}

// Note: /privacy, /terms, /contact and /blog are public React routes but are
// deliberately NOT in the sitemap, because they are not prerendered and so
// carry no text for crawlers that do not run JavaScript. They stay crawlable
// via the footer. See SEO.md.
