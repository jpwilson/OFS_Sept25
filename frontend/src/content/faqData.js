// FAQ content. Single source of truth: rendered by src/pages/FAQ.jsx (visible
// accordion), by the build-time prerenderer (static HTML for crawlers) and by
// the FAQPage JSON-LD, so the structured data always mirrors the visible text.
export const faqCategories = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Our Family Socials?',
        a: 'Our Family Socials is a private social network designed for families. It lets you share life events, photos, and stories with your closest family members and friends. A new event goes to the family you have approved, you choose the audience for every one, and there are no ads and nothing ranked.'
      },
      {
        q: 'Who is Our Family Socials for?',
        a: 'It is built for families who want a private place for their memories: parents sharing milestones with grandparents, extended families staying in touch across different countries, and anyone who wants to tell the story of their trips and celebrations to the people who matter, privately.'
      },
      {
        q: 'Is it really free?',
        a: 'Reading is free forever: the free plan lets you open the events of the people you follow and every Public event, follow family members, like and comment. Every new account also gets a 30-day Pro trial with up to 5 published events, and Pro or Lifetime make publishing unlimited.'
      },
      {
        q: 'How much does Pro cost?',
        a: 'Pro is $9 per month when billed annually ($108 per year) or $12 per month billed monthly. There is also a one-time Lifetime plan at $294. Every new account starts with a 30-day free trial of Pro, and no credit card is required to start the trial.'
      },
      {
        q: 'How do I invite my family members?',
        a: 'Go to your Profile and you\'ll find an invite option. You can send email invitations to family members. When they sign up using your invite link, you\'ll automatically be connected.'
      },
      {
        q: 'Can I use it on my phone?',
        a: 'Absolutely. Our Family Socials works beautifully on phones, tablets and computers. Just visit ourfamilysocials.com in your phone\'s browser.'
      },
      {
        q: 'Is there an app?',
        a: 'Yes. Add Our Family Socials to your phone\'s home screen today, and our iPhone app is on the way.'
      }
    ]
  },
  {
    category: 'Events & Content',
    questions: [
      {
        q: 'What is an "event"?',
        a: 'An event, which we also call a story, is a page for something that happened - like a vacation, birthday party, graduation or Sunday dinner - with your writing, a gallery of captioned photos, video clips, dates and places. Think of it as the full story of a moment, all in one place.'
      },
      {
        q: 'How many photos can I add to an event?',
        a: 'On Pro and Lifetime an event holds up to 300 photos, and during the free trial up to 50. iPhone HEIC photos are welcome, and every photo is prepared for fast loading so it looks sharp on any screen, while your original files stay safe on your own device.'
      },
      {
        q: 'Can I add locations to my events?',
        a: 'Yes. You can add multiple locations to each event, perfect for road trips and multi-destination adventures. We also read the GPS data in your photos to suggest locations, and you can add a place to any photo yourself.'
      },
      {
        q: 'Can I add videos as well as photos?',
        a: 'Yes. Add video clips right in the story alongside your photos, on Pro and during the free trial. The built-in trimmer lets you pick the best 60 seconds of each clip.'
      },
      {
        q: 'What\'s the difference between Published, Drafts, and Trash?',
        a: 'Published events are visible to the audience you chose for them. Drafts are works-in-progress that only you can see. Trash keeps the events you delete, so you can restore one whenever you like, or delete it for good.'
      },
      {
        q: 'Do drafts count toward my event limit?',
        a: 'No. Only published events count toward the 5 in your trial, so you can keep as many drafts as you like.'
      },
      {
        q: 'Can AI help me write an event?',
        a: 'Yes. Add your photos or clips, then type or simply say what happened, and AI Create comes back with a title, a story with section headings, a caption for every photo, a category and a place. AI Draft and AI Interview hand you the draft to polish before it goes out, and Quick Publish posts it straight away to your Followers; you can change the audience whenever you edit the story. AI Create is part of Pro and the free trial.'
      }
    ]
  },
  {
    category: 'Privacy & Sharing',
    questions: [
      {
        q: 'Who can see my events?',
        a: 'You choose who can open every event: Followers (the default), Close Family, a Custom Group, Private (only you) or Public (anyone with the link, with or without an account). Follow requests are yours to accept or decline. A Private event stays with you alone; every other event shows its card (title, cover and place) in the feed of signed-in members, and opening it always follows the audience you chose.'
      },
      {
        q: 'Can I share an event with someone who doesn\'t have an account?',
        a: 'Yes. Make a private share link for any event. Anyone you give it to can open that one event without an account, for 1 to 5 days, your choice.'
      },
      {
        q: 'Can I make an event public?',
        a: 'Yes. Public is one of the five audience settings, and a public event can be opened by anyone who has the link, with or without an account. Our robots.txt asks search engines and AI crawlers not to index event pages. For anything just for the family, pick Followers, Close Family, a Custom Group or Private.'
      },
      {
        q: 'Is my data safe?',
        a: 'Yes. We take privacy seriously. We never sell your data, never show ads, and never rank what you see. Your photos and stories are yours, and we\'re just here to help you preserve and share them with family.'
      },
      {
        q: 'Does Our Family Socials show ads?',
        a: 'No. There is no advertising anywhere in the product and we do not sell your data. The product is paid for by Pro and Lifetime subscriptions, which is why there is a price on the pricing page instead of an ad slot in your feed.'
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Email us at support@ourfamilysocials.com and we\'ll delete your account and all associated data for you.'
      }
    ]
  },
  {
    category: 'Following & Relationships',
    questions: [
      {
        q: 'How do I follow someone?',
        a: 'Search for them by username or find them through your existing connections. Send a follow request, and once they accept, you\'ll see their events in your feed.'
      },
      {
        q: 'What are verified relationships?',
        a: 'Verified relationships let you formally connect family members (like marking someone as your "sister" or "dad"). Both parties must confirm the relationship. This helps build your family tree and adds context to your connections.'
      },
      {
        q: 'What are tag profiles?',
        a: 'Tag profiles let you tag people who don\'t have accounts yet - like young children, elderly relatives, or pets. You can create a profile for them and tag them in events. If they later join, they can claim their profile.'
      }
    ]
  },
  {
    category: 'Maps & Timeline',
    questions: [
      {
        q: 'How does the map view work?',
        a: 'The map view shows every event with a location on an interactive world map, with nearby pins grouped together. See where your family has traveled and tap a pin to open that event. It\'s a beautiful way to see your family\'s adventures.'
      },
      {
        q: 'Can I see events from multiple family members on one map?',
        a: 'Yes. See every event you can open on a single map, or filter by family member to follow one person\'s journeys.'
      },
      {
        q: 'What is the timeline view?',
        a: 'The timeline view shows events organized chronologically, grouped by year. It\'s a visual history of your family\'s memories over time.'
      }
    ]
  },
  {
    category: 'Subscription & Billing',
    questions: [
      {
        q: 'What\'s included in the free trial?',
        a: 'Every new account gets a 30-day free trial of Pro, including photo and video uploads, journey mapping, GPS extraction, AI Create and Smart Import, with up to 5 published events. When the trial ends you keep a free account for reading, liking and commenting, and Pro or Lifetime picks your storytelling up right where you left off.'
      },
      {
        q: 'How do I upgrade to Pro?',
        a: 'Go to Settings > Membership from your profile page. You can choose monthly ($12/mo) or annual ($9/mo billed yearly) billing. We also offer a one-time Lifetime option.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards through Stripe, our secure payment partner. Your payment information is never stored on our servers.'
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel your subscription anytime, with no questions asked. Your events and data stay right where they are, and you can pick up again whenever you like.'
      },
      {
        q: 'What happens to my events if I downgrade?',
        a: 'Your events stay exactly as they are, and you can always open them yourself. Sharing them with your family and publishing new ones come with an active subscription, so the moment you resubscribe, everyone can open your stories again.'
      }
    ]
  }
]

export const flatFaqs = faqCategories.flatMap((c) => c.questions)
