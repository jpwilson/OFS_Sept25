// close package copy (owner: close). Plain data: no JSX, no browser globals, numbers only via fact().
// Imports need explicit .js extensions (Node build scripts read these files).
//
// Every sentence here rests on SPEC's "true statements" or facts table, and follows the
// ROUND4 voice rule: say what it does, in the positive, warmly; never volunteer a limitation
// or a competitor's strength. Figures and sentences supplied by the business live in
// business.js; testimonials (real members only) in testimonials.js.
import { fact, PRICES } from './facts.js'
import { ROUTES, SECTION_IDS } from './routes.js'
import { BRAND } from './common.js'

// ---------------------------------------------------------------- nav

export const NAV = {
  short: 'OFS',
  links: [
    { id: SECTION_IDS.how, label: 'How it works' },
    { id: SECTION_IDS.anatomy, label: "What's in a story" },
    { id: SECTION_IDS.plans, label: 'Plans' },
  ],
  login: 'Log in',
  start: 'Start free',
  menu: 'Menu',
  close: 'Close',
  menuNote: `A free account, no card. The trial gives you ${fact('trialDays')} days to write.`,
}

// ---------------------------------------------------------------- band after the film

// Design only. The figure and the sentences are in content/business.js.
export const MILESTONE = {
  people: 'g-family-hero',
  peopleAlt: 'A family celebrating together',
  prop: 'prop-balloons',
}

// ---------------------------------------------------------------- 11 why families love it

// Photos: the photo-love-* set; until each lands in the manifest the section stands in with
// the year photo named in `stand`.
export const LOVE = {
  label: 'Why families love it',
  head: { before: 'Why families', mark: 'love', after: 'it.' },
  people: ['p-ruth-wave', 'p-joe-wave'],
  peopleAlt: 'Nana Ruth and Grandpa Joe waving',
  quoteLabel: 'From our members',
  cards: [
    {
      line: 'Grandparents see the everyday.',
      text: 'Dinner out, the school play, an ordinary Tuesday: your parents see what the grandkids are up to, the day it happens.',
      photo: 'photo-love-grandparents',
      stand: 'photo-year-joe70',
    },
    {
      line: 'You decide who opens it.',
      text: 'Every story goes to the people you pick: just you, close family, your followers, a group, or anyone with the link.',
      photo: 'photo-love-control',
      stand: 'photo-year-birthday',
    },
    {
      line: 'Far apart, still close.',
      text: 'Family spread across the country keeps up with each other again, without a group chat and without a scroll machine.',
      photo: 'photo-love-far',
      stand: 'photo-year-gala',
    },
    {
      line: 'Easy to make. Always looks great.',
      text: 'Add your photos, say a few words, and the story is written and laid out for you.',
      photo: 'photo-love-easy',
      stand: 'photo-year-rocket',
    },
    {
      line: 'Scroll back through every memory.',
      text: 'Every trip, birthday and first day, in order, on a timeline and a map you can come back to for years.',
      photo: 'photo-love-timeline',
      stand: 'photo-year-school',
    },
    {
      // Photo books are being built (ROUND4 §2): this card must not go live before they can be ordered.
      line: 'Turn a story into a photo book.',
      text: 'Your favorite stories, printed and on the coffee table.',
      photo: 'photo-love-book',
      stand: 'photo-year-halloween',
    },
  ],
}

// ---------------------------------------------------------------- 12 why our family socials

// Head and line come from business.js (whyHead, whyLine). Each card says only what you get here.
export const COMPARE = {
  label: 'Why Our Family Socials',
  more: 'Read more',
  person: 'p-marcus-camera',
  personAlt: 'Uncle Marcus taking a photo',
  cards: [
    {
      path: '/compare/facebook-groups',
      name: 'Coming from a private Facebook group?',
      wash: 'tide',
      text: 'Your family gets a place of its own: no ads, nothing ranked, every story in date order. Each story has its own page with photos, video and a map, and you choose who can open it.',
    },
    {
      path: '/compare/tinybeans',
      name: 'Coming from Tinybeans?',
      wash: 'zest',
      text: 'Share the whole family’s life here: the trips, the weddings, the birthdays and the grandparents’ big days. Every story is written up with its photos and lands on your timeline and your map.',
    },
    {
      path: '/compare/familyalbum',
      name: 'Coming from FamilyAlbum?',
      wash: 'lime',
      text: 'Turn the photos into stories. AI Create writes the title, the story and a caption for every photo, so a long weekend reads like a chapter, and the trip lands on your family’s map.',
    },
    {
      path: '/compare/private-instagram',
      name: 'Coming from a private Instagram account?',
      wash: 'fizz',
      text: 'Tell the long version, with every photo and clip in its place. Then pick exactly who can open it: close family, a group you made, your followers, or anyone with the link.',
    },
  ],
  links: [
    {
      href: '/compare/how-to-share-photos-privately',
      name: "How to share kids' photos privately",
      line: "A friendly guide to keeping your family's photos for the people you choose.",
    },
    {
      href: ROUTES.alternatives,
      name: 'Why Our Family Socials',
      line: 'Everything that makes this the home for your family’s stories.',
    },
  ],
}

// ---------------------------------------------------------------- 13 plans

const num = (s) => Number(String(s).replace(/[^0-9.]/g, ''))
const money = (n) => `${PRICES.pro.perMonth.replace(/[0-9.,]/g, '')}${Number.isInteger(n) ? n : n.toFixed(2)}`

/**
 * The plan arithmetic, computed from PRICES (site.js). Months in a year are read from the
 * prices themselves (yearly total / annual price per month), so no number is typed here.
 */
export const PLAN_MATH = (() => {
  const perMonth = num(PRICES.pro.perMonth)
  const perMonthYearly = num(PRICES.pro.perMonthBilledYearly)
  const perYear = num(PRICES.pro.perYear)
  const lifetime = num(PRICES.lifetime.price)
  const months = Math.round(perYear / perMonthYearly)
  const monthlyYear = months * perMonth
  const saving = Math.round(((monthlyYear - perYear) / monthlyYear) * 100)
  const years = (lifetime / perYear).toFixed(1)
  return {
    months: String(months),
    perMonth: PRICES.pro.perMonth,
    monthlyYear: money(monthlyYear),
    perYear: PRICES.pro.perYear,
    saved: money(monthlyYear - perYear),
    saving: `${saving}%`,
    lifetime: PRICES.lifetime.price,
    years,
  }
})()

export const PLANS = {
  label: 'Plans',
  head: { before: 'Readers are free. Storytellers', mark: 'pay', after: '.' },
  lede: 'Grandma never pays to open the vacation story. The person who writes it up does. Every plan is ad-free, and every feed is in date order.',
  billing: { legend: 'Billing', yearly: 'Annual', monthly: 'Monthly' },
  free: {
    name: PRICES.free.name,
    price: PRICES.free.price,
    per: PRICES.free.period,
    line: 'For everyone you share with.',
    list: [
      'Open stories by people you follow, and any Public story',
      `Like, comment and react, with ${fact('reactions')} reactions`,
      'Free for as long as you like',
    ],
    cta: 'Start free',
  },
  pro: {
    name: PRICES.pro.name,
    yearly: { price: PRICES.pro.perMonthBilledYearly, per: 'a month', note: `billed annually, ${PRICES.pro.perYear} a year` },
    monthly: { price: PRICES.pro.perMonth, per: 'a month', note: 'billed monthly' },
    line: 'For whoever writes up the trips, the wedding and the birthdays.',
    list: [
      'As many stories as you like',
      `Up to ${fact('photosPro')} photos and ${fact('videosPerStory')} video clips per story`,
      `AI Create, ${fact('aiPerDay')} uses a day, and Smart Import`,
      'Follow new people',
    ],
    cta: 'Start the free trial',
  },
  lifetime: {
    name: PRICES.lifetime.name,
    price: PRICES.lifetime.price,
    per: PRICES.lifetime.period,
    line: 'Everything in Pro, paid once.',
    list: ['Everything in Pro', 'One payment, nothing to renew'],
    cta: 'See all plan details',
  },
  trial: {
    label: 'The free trial',
    head: 'Try writing, free.',
    items: [
      { k: 'Length', v: `${fact('trialDays')} days`, line: 'to write and publish' },
      { k: 'Card', v: 'No card', line: 'needed to start' },
      { k: 'Stories', v: `${fact('trialStories')} stories`, line: 'to publish in the trial' },
      { k: 'Per story', v: `${fact('photosTrial')} photos`, line: 'or videos in each story' },
    ],
  },
  // The poster: one reader, one storyteller, each with what they pay.
  reader: {
    person: 'p-joe-phone',
    alt: 'Grandpa Joe reading a story on his phone',
    price: PRICES.free.price,
    unit: 'to read',
    note: 'Forever. For everyone you share with.',
  },
  writer: {
    person: 'p-maya-talk',
    alt: 'Maya talking a story into her phone',
    price: PRICES.pro.perMonthBilledYearly,
    unit: 'a month to write',
    note: `Billed annually, ${PRICES.pro.perYear} a year. Try it free first.`,
  },
  rules: [
    'Reading stays free forever: with or without a plan, open stories by people you follow and any Public story, and like and comment. A plan is what lets you publish and follow new people.',
    'Your plan keeps your stories open to the people you share them with, and every share link you make works until it ends.',
  ],
  math: {
    yearLabel: 'Monthly against annual',
    yearNote: `Pay for the year at once and keep ${PLAN_MATH.saved}, or ${PLAN_MATH.saving}.`,
    lifeLabel: 'Lifetime in years of Pro',
    lifeNote: 'One payment, the price of this many years of Pro paid annually, and it is yours for good.',
    unitYears: 'years',
  },
}

// ---------------------------------------------------------------- 14 questions

export const QUESTIONS = {
  label: 'Questions',
  head: { before: '', mark: 'FAQ', after: '' },
  lede: 'Short answers to what people ask before they start.',
  person: 'p-kate-wave',
  personAlt: 'Aunt Kate waving',
  more: 'Read the full FAQ',
  items: [
    {
      q: 'What is Our Family Socials?',
      a: 'A private, ad-free place where a family keeps the long version of its vacations, weddings, birthdays and big days: written stories with photo galleries, video and journey maps. You decide who can open each one. In the app a story is called an event.',
    },
    {
      q: 'Is it really free to read?',
      a: `Yes, forever. Open stories by people you follow and any Public story, and like and comment, without paying a thing. Publishing your own stories and following new people come with a plan, and the free trial gives you ${fact('trialDays')} days of publishing with no card.`,
    },
    {
      q: 'Who can open a story I post?',
      a: 'You pick one of five audiences per story. Private is just you, and you can still make a share link for it. Custom Group is a named list you build from people you follow. Close Family is a checkmark you set per follower. Followers means people whose follow request you accepted. Public opens for anyone with the link, signed in or not.',
    },
    {
      q: 'What does Public mean, exactly?',
      a: 'Anyone with the link can open a Public story, signed in or not. Signed-in members can see the card (title, cover and place) of any story that is not Private, and opening it always follows the audience you chose. Choose Private to keep a story, card and all, just for you.',
    },
    {
      q: 'Does Grandma need an account?',
      a: `To follow along in the app, Grandma makes a free account and you accept her follow request. Or send her a share link: it opens that one story for anyone who has it, no account needed, for ${fact('shareLinkDays')}. A Public story opens for anyone with the link.`,
    },
    {
      q: 'How do I make a story?',
      a: `Add the photos from the day. They are enough on their own: AI Create writes the title, the story with its headings and a caption for every photo. A few typed lines or a voice note make it even better, and AI Interview asks you a few questions to make it better still. AI Create comes with Pro and the free trial, up to ${fact('aiPerDay')} times a day; its stories go to Followers, and you can change the audience whenever you edit. Or write it yourself in the editor.`,
    },
    {
      q: 'Is there an app?',
      a: "Yes. Add Our Family Socials to your phone's home screen today, and our iPhone app is on the way. Email lets you know about a follow request, a new comment on your story and a new story from someone you follow.",
    },
    {
      q: 'What happens to my stories if I stop paying?',
      a: 'Your stories stay yours, and so does reading: open stories by people you follow and any Public story, and like and comment, free. Your family can open your stories again as soon as your plan is active, and you can publish and follow new people again. Share links you already made keep working until they end.',
    },
    {
      q: 'How does the map know where we went?',
      a: "Your browser reads the GPS position and the time from each photo before it uploads. Each located photo becomes a numbered stop on the story's map, joined to the next by a dashed line. You can add a place to any story with location markers in the editor.",
    },
    {
      q: 'Are there ads, or a ranked feed?',
      a: 'Your feed is ad-free and in date order, by the date posted or the date it happened, your choice. Filter by person, category and date range, and mute anyone you like.',
    },
  ],
}

// ---------------------------------------------------------------- 15 start

export const START = {
  label: 'Start here',
  head: { before: 'Start with your last', mark: 'vacation', after: '.' },
  line: 'Add its photos. They are enough on their own: AI Create writes the title, the story with its headings and a caption for every photo, and you choose who can open it.',
  terms: `A free account, no card, and ${fact('trialDays')} days to try it, with ${fact('trialStories')} stories to publish.`,
  start: 'Start free',
  login: 'Log in',
  loginLead: 'Already have an account?',
  plate: 'plate-year-d',
  plateM: 'plate-year-m',
  plateAlt: 'A family laughing around a garden table at a birthday',
}

// ---------------------------------------------------------------- 16 footer

export const FOOTER = {
  words: BRAND.split(' '),
  mark: 'Family',
  groups: [
    {
      title: 'Product',
      links: [
        { href: ROUTES.features, label: 'Features' },
        { href: ROUTES.pricing, label: 'Pricing' },
        { href: ROUTES.faq, label: 'FAQ' },
      ],
    },
    {
      title: 'Compare',
      links: [
        { href: ROUTES.alternatives, label: 'Why Our Family Socials' },
        { href: '/compare/how-to-share-photos-privately', label: "How to share kids' photos privately" },
      ],
    },
    {
      title: 'Company',
      links: [
        { href: ROUTES.about, label: 'About' },
        { href: '/blog', label: 'Blog' }, // an existing app route (App.jsx), not yet in ROUTES
        { href: ROUTES.contact, label: 'Contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { href: ROUTES.privacy, label: 'Privacy Policy' },
        { href: ROUTES.terms, label: 'Terms of Service' },
      ],
    },
    {
      title: 'Account',
      links: [
        { href: ROUTES.login, label: 'Log in' },
        { href: ROUTES.signup, label: 'Start free' },
      ],
    },
  ],
  small: 'Photos on this page are illustrative.',
}

// ---------------------------------------------------------------- llms-full.txt

const head = (h) => `${h.before ? `${h.before} ` : ''}${h.mark}${h.after}`

/** Text blocks for llms-full.txt (marketing.js block format: { h2 } | { p } | { ul: [] }). */
export const SEO_BLOCKS = [
  { h2: head(LOVE.head) },
  { ul: LOVE.cards.map((c) => `${c.line} ${c.text}`) },
  { h2: COMPARE.label },
  ...COMPARE.cards.map((c) => ({ p: `${c.name} ${c.text}` })),
  { h2: head(PLANS.head) },
  {
    ul: [
      `${PLANS.free.name}: ${PLANS.free.price}, ${PLANS.free.per}. ${PLANS.free.list.join('. ')}.`,
      `${PLANS.pro.name}: ${PLANS.pro.yearly.price} a month ${PLANS.pro.yearly.note}, or ${PLANS.pro.monthly.price} a month billed monthly. ${PLANS.pro.list.join('. ')}.`,
      `${PLANS.lifetime.name}: ${PLANS.lifetime.price} ${PLANS.lifetime.per}. ${PLANS.lifetime.line}`,
    ],
  },
  { p: `Free trial: ${PLANS.trial.items.map((i) => `${i.v.toLowerCase()} ${i.line}`).join(', ')}.` },
  ...PLANS.rules.map((p) => ({ p })),
  { h2: head(QUESTIONS.head) },
  ...QUESTIONS.items.flatMap((i) => [{ p: `${i.q} ${i.a}` }]),
]
