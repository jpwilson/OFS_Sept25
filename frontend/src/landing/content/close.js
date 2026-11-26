// close package copy (owner: close). Plain data: no JSX, no browser globals, numbers only via fact().
// Imports need explicit .js extensions (Node build scripts read these files).
//
// Every sentence here rests on SPEC's "true statements" or facts table. Nothing is copied
// from the app's pricing page or faqData.js (several of their claims are wrong about the
// product). The only copied text is the four comparison short answers in COMPARE, which
// must match frontend/src/content/marketing.js exactly (scripts/landing/check-pricing.mjs).
import { fact, PRICES } from './facts.js'
import { ROUTES, SECTION_IDS } from './routes.js'
import { BRAND, SMALL_PRINT } from './common.js'

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

// ---------------------------------------------------------------- 11 limits

export const LIMITS = {
  label: 'Before you ask',
  head: { before: 'What it does not', mark: 'do', after: '.' },
  lede: 'Eight things worth knowing before you share your first vacation. None of them is hidden in the app; they are just easier to hear up front.',
  items: [
    {
      s: 'It is a web app you add to your home screen.',
      c: 'There is no app-store app and no push notifications. Email tells you when someone asks to follow you, comments on your story or posts a new one.',
    },
    {
      s: 'It is not a backup of your camera roll.',
      c: 'Photos are stored resized, so keep your originals.',
    },
    {
      s: `Video clips are trimmed to ${fact('videoSeconds')} seconds.`,
      c: 'Keep the best part of the toast or the finish line: the editor asks you which part before the clip goes in.',
    },
    {
      s: `AI Create is in beta, with ${fact('aiPerDay')} uses a day.`,
      c: 'AI Draft and AI Interview show you the draft to edit first. Quick Publish posts it straight away, so read it after.',
    },
    {
      s: 'AI-made stories are published to Followers.',
      c: 'To give one a smaller audience, edit the story after it is made.',
    },
    {
      s: 'Public means public. A share link is a key.',
      c: `Anyone with the link can open a Public story, signed in or not. A share link opens its one story for anyone who has it, whatever the audience, until it ends after ${fact('shareLinkDays')}.`,
    },
    {
      s: 'Members can see that a story exists.',
      c: 'Unless a story is Private, its card (title, cover, place) is listed to signed-in members. Opening it follows the audience you chose.',
    },
    {
      s: 'Writing stories needs a paid plan after the trial.',
      c: 'With no plan you can still open stories by people you follow and any Public story, and like and comment.',
    },
  ],
  prop: 'prop-print-stack',
}

// ---------------------------------------------------------------- 12 compare

// The four "short answer" paragraphs, copied exactly from frontend/src/content/marketing.js
// (the block after { h2: 'The short answer' } on each page). Do not edit them here: edit
// marketing.js and copy again. check-pricing.mjs fails if they drift.
export const COMPARE = {
  label: 'Compared fairly',
  head: { before: 'Where the others are', mark: 'better', after: '.' },
  lede: 'Some families are better served elsewhere, and we would rather say so. Each comparison page starts with where the other choice is stronger; this is its short answer, word for word.',
  more: 'Read the full comparison',
  expand: 'Read the short answer',
  collapse: 'Show less',
  cards: [
    {
      path: '/compare/tinybeans',
      name: 'Tinybeans',
      wash: 'zest',
      short:
        'Choose Tinybeans if your main need is a private day-by-day journal of a baby or young child, shared with a small circle, from a polished mobile app. Choose Our Family Socials if you want one private space for the whole family\'s events - kids\' milestones but also holidays, anniversaries, reunions and grandparents\' birthdays - organised on a map and a timeline.',
    },
    {
      path: '/compare/familyalbum',
      name: 'FamilyAlbum',
      wash: 'lime',
      short:
        'Choose FamilyAlbum if free unlimited photo and video storage, automatic month-by-month organisation and cheap prints are what you want. Choose Our Family Socials if you want rich event pages with written stories, an interactive map of everywhere your family has been, a timeline by year, and a follow graph across the extended family rather than one child\'s album.',
    },
    {
      path: '/compare/facebook-groups',
      name: 'A private Facebook group',
      wash: 'tide',
      short:
        'Use a private Facebook group if every relative is already on Facebook, you want it to cost nothing, and you mainly want a chat-and-photos stream. Use Our Family Socials if you want family memories kept off an advertising platform, organised into event pages with maps and a timeline, and visible in the order they were posted.',
    },
    {
      path: '/compare/private-instagram',
      name: 'A private Instagram account',
      wash: 'fizz',
      short:
        'A private Instagram account is free, instant, and already installed on everyone\'s phone. Our Family Socials costs money to post but keeps family memories off an advertising platform and organises them into event pages, a map and a timeline you can still browse in ten years.',
    },
  ],
  links: [
    {
      href: '/compare/how-to-share-photos-privately',
      name: "How to share kids' photos privately",
      line: 'Shared albums, group chats, photo apps and family networks: what each is good at.',
    },
    {
      href: ROUTES.alternatives,
      name: 'All the alternatives',
      line: 'The realistic options, and the cases where you should pick something else.',
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
  lede: 'Grandma never pays to open the vacation story. The person who writes it up does. No plan has ads, and no feed is ranked.',
  billing: { legend: 'Billing', yearly: 'Annual', monthly: 'Monthly' },
  free: {
    name: PRICES.free.name,
    price: PRICES.free.price,
    per: PRICES.free.period,
    line: 'For everyone you share with.',
    list: [
      'Open stories by people you follow, and any Public story',
      `Like, comment and react, with ${fact('reactions')} reactions`,
      'No time limit',
    ],
    cta: 'Start free',
  },
  pro: {
    name: PRICES.pro.name,
    yearly: { price: PRICES.pro.perMonthBilledYearly, per: 'a month', note: `billed annually, ${PRICES.pro.perYear} a year` },
    monthly: { price: PRICES.pro.perMonth, per: 'a month', note: 'billed monthly' },
    line: 'For whoever writes up the trips, the wedding and the birthdays.',
    list: [
      'No cap on the number of stories',
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
    items: [
      { k: 'Length', v: `${fact('trialDays')} days` },
      { k: 'Card', v: 'None needed' },
      { k: 'Stories', v: `${fact('trialStories')} published` },
      { k: 'Per story', v: `${fact('photosTrial')} photos or videos` },
    ],
  },
  rules: [
    'After the trial, without a plan, you can still open stories by people you follow and any Public story, and like and comment. You cannot publish or follow new people.',
    'While your plan or trial is not active, other people cannot open your stories in the app. A share link you already made keeps working until it ends.',
  ],
  math: {
    yearLabel: 'Monthly against annual',
    yearNote: `Paying monthly for a year against paying for the year at once. That is ${PLAN_MATH.saved} less, or ${PLAN_MATH.saving}.`,
    lifeLabel: 'Lifetime in years of Pro',
    lifeNote: 'The one payment equals this many years of Pro paid annually.',
    unitYears: 'years',
  },
  person: 'p-joe-phone',
  personAlt: 'Grandpa Joe, from the sample family, reading on his phone',
}

// ---------------------------------------------------------------- 14 questions

export const QUESTIONS = {
  label: 'Questions',
  head: { before: 'Fair', mark: 'questions', after: '.' },
  lede: 'Short answers to what people ask before they start.',
  more: 'Read the full FAQ',
  items: [
    {
      q: 'What is Our Family Socials?',
      a: 'A private, ad-free place where a family keeps the long version of its vacations, weddings, birthdays and big days: written stories with photo galleries, video and journey maps. You decide who can open each one. In the app a story is called an event.',
    },
    {
      q: 'Is it really free to read?',
      a: `Yes, with no time limit: with no plan and no trial you can still open stories by people you follow and any Public story, and like and comment. What you cannot do without a plan is publish or follow new people. The trial lets you publish for ${fact('trialDays')} days with no card.`,
    },
    {
      q: 'Who can open a story I post?',
      a: 'You pick one of five audiences per story. Private is only you, unless you make a share link for it. Custom Group is a named list you build from people you follow. Close Family is a checkmark you set per follower. Followers means people whose follow request you accepted. Public opens for anyone with the link, signed in or not.',
    },
    {
      q: 'What does Public mean, exactly?',
      a: 'Anyone with the link can open a Public story, signed in or not. Separately, the card of any story that is not Private (title, cover, place) is listed to signed-in members; opening it still follows the audience you chose.',
    },
    {
      q: 'Does Grandma need an account?',
      a: `To open your stories in the app, yes: a free account, and you accept their follow request. Or make a share link, a key you hand out yourself: it opens that one story for anyone who has it, without an account, and ends after ${fact('shareLinkDays')}. A Public story opens for anyone with the link.`,
    },
    {
      q: 'How do I make a story?',
      a: `Add the photos from the day. They are enough on their own: AI Create writes the title, the story with its headings and a caption for every photo. A few typed lines or a voice note make it better, and AI Interview asks you a few questions to make it better still. It is in beta, needs Pro or the trial, allows ${fact('aiPerDay')} uses a day, and publishes to Followers until you edit the story. Or write it yourself in the editor.`,
    },
    {
      q: 'Is there an app?',
      a: 'It installs to your phone\'s home screen from the browser. There is no app-store app and there are no push notifications. Email tells you about a follow request, a new comment on your story and a new story from someone you follow.',
    },
    {
      q: 'What happens to my stories if I stop paying?',
      a: 'While your plan or trial is not active, other people cannot open your stories in the app. A share link you already made keeps working until it ends. You can still open stories by people you follow and any Public story, and like and comment, but you cannot publish or follow new people.',
    },
    {
      q: 'How does the map know where we went?',
      a: 'Your browser reads the GPS position and the time from each photo before it uploads. Each located photo becomes a numbered stop on the story\'s map, joined to the next by a dashed line. You can also add location markers in the editor.',
    },
    {
      q: 'Are there ads, or a ranked feed?',
      a: 'There are no ads. The feed is ordered by date, either the date posted or the date it happened, your choice. Nothing is ranked. You can filter by person, category and date range, and you can mute someone.',
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
  plateAlt: 'The sample family and their friends around a garden table, raising a glass',
  plateNote: 'Sample family. AI-generated illustration.',
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
        { href: ROUTES.about, label: 'About' },
      ],
    },
    {
      title: 'Compare',
      links: [{ href: ROUTES.alternatives, label: 'Alternatives' }, ...ROUTES.compare.map((c) => ({ href: c.href, label: c.label }))],
    },
    {
      title: 'Company',
      links: [
        { href: ROUTES.privacy, label: 'Privacy Policy' },
        { href: ROUTES.terms, label: 'Terms of Service' },
        { href: ROUTES.contact, label: 'Contact' },
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
  small: SMALL_PRINT,
  name: BRAND,
}

// ---------------------------------------------------------------- llms-full.txt

const head = (h) => `${h.before} ${h.mark}${h.after}`

/** Text blocks for llms-full.txt (marketing.js block format: { h2 } | { p } | { ul: [] }). */
export const SEO_BLOCKS = [
  { h2: head(LIMITS.head) },
  { ul: LIMITS.items.map((i) => `${i.s} ${i.c}`) },
  { h2: head(COMPARE.head) },
  ...COMPARE.cards.map((c) => ({ p: `${c.name}: ${c.short}` })),
  { h2: head(PLANS.head) },
  {
    ul: [
      `${PLANS.free.name}: ${PLANS.free.price}, ${PLANS.free.per}. ${PLANS.free.list.join('. ')}.`,
      `${PLANS.pro.name}: ${PLANS.pro.yearly.price} a month ${PLANS.pro.yearly.note}, or ${PLANS.pro.monthly.price} a month billed monthly. ${PLANS.pro.list.join('. ')}.`,
      `${PLANS.lifetime.name}: ${PLANS.lifetime.price} ${PLANS.lifetime.per}. ${PLANS.lifetime.line}`,
    ],
  },
  { p: `Free trial: ${PLANS.trial.items.map((i) => `${i.k.toLowerCase()} ${i.v.toLowerCase()}`).join(', ')}.` },
  ...PLANS.rules.map((p) => ({ p })),
  { h2: head(QUESTIONS.head) },
  ...QUESTIONS.items.flatMap((i) => [{ p: `${i.q} ${i.a}` }]),
]
