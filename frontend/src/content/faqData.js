// FAQ content. Single source of truth: rendered by src/pages/FAQ.jsx (visible
// accordion), by the build-time prerenderer (static HTML for crawlers) and by
// the FAQPage JSON-LD, so the structured data always mirrors the visible text.
export const faqCategories = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Our Family Socials?',
        a: 'Our Family Socials is a private social network designed for families. It lets you share life events, photos, and stories with your closest family members and friends. Unlike public social media, a new event goes to the family you have approved rather than to the open internet, and there are no ads or algorithms.'
      },
      {
        q: 'Who is Our Family Socials for?',
        a: 'It is built for families who want a private place for their memories: parents sharing milestones with grandparents, extended families staying in touch across different countries, and anyone who documents trips and celebrations but does not want to post them on public social media.'
      },
      {
        q: 'Is it really free?',
        a: 'Viewing is free forever: the free plan includes viewing the events you have access to, following family members, commenting and liking. Creating events needs an active trial or subscription. Every new account gets a 30-day Pro trial during which you can publish up to 5 events; after that you need Pro or Lifetime to publish, and those plans remove the 5-event limit.'
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
        a: 'Absolutely! Our Family Socials is fully responsive and works great on phones, tablets, and computers. Just visit ourfamilysocials.com in your mobile browser.'
      },
      {
        q: 'Is there an app I can install?',
        a: 'Our Family Socials is a progressive web app (PWA). There is no separate App Store or Google Play download: you open ourfamilysocials.com in your browser and, on most phones, you can add it to your home screen so it opens like a normal app.'
      }
    ]
  },
  {
    category: 'Events & Content',
    questions: [
      {
        q: 'What is an "event"?',
        a: 'An event is a collection of photos, stories, and details about something that happened - like a vacation, birthday party, graduation, or Sunday dinner. Think of it as a rich, detailed post that tells the full story of a moment.'
      },
      {
        q: 'How many photos can I add to an event?',
        a: 'There is no per-event photo limit on a paid plan or an active trial. Photos are resized before upload - down to 1500 pixels on the longest side and re-encoded as JPEG at 85% quality - and then stored in several sizes for fast loading, so what we keep is a high-quality copy rather than your untouched original file. Keep your originals on your own device or backup. Individual uploads are limited to 10MB, and HEIC photos from iPhones are converted server-side.'
      },
      {
        q: 'Can I add locations to my events?',
        a: 'Yes! You can add multiple locations to each event, perfect for road trips and multi-destination adventures. We can also automatically extract GPS data from your photos to suggest locations.'
      },
      {
        q: 'Can I add videos as well as photos?',
        a: 'Yes. Pro accounts can upload photos and video clips to an event, and there is a built-in trimmer so you can shorten a clip before uploading it.'
      },
      {
        q: 'What\'s the difference between Published, Drafts, and Trash?',
        a: 'Published events are visible to the audience you chose for them. Drafts are works-in-progress that only you can see. Trash holds deleted events for 30 days before permanent deletion - you can restore them anytime.'
      },
      {
        q: 'Do drafts count toward my event limit?',
        a: 'No! Only published events count toward your limit. You can have unlimited drafts and deleted events.'
      },
      {
        q: 'Can AI help me write an event?',
        a: 'Yes. AI Create is a beta feature available to accounts on a paid plan or an active free trial. You upload photos and it groups them, asks a few questions, and drafts a story you can edit before publishing. It can make mistakes, so you always review the draft yourself.'
      }
    ]
  },
  {
    category: 'Privacy & Sharing',
    questions: [
      {
        q: 'Who can see my events?',
        a: 'You choose an audience for every event: Followers (the default), Close Family, a custom group, Private (only you) or Public. Follow requests are yours to accept or decline. Two things are worth knowing: an event set to Public can be opened by anyone who has the link, including people without an account; and any event that is not set to Private can appear in the shared feed to signed-in members, although opening the event page itself is still gated by the audience you chose.'
      },
      {
        q: 'Can I share an event with someone who doesn\'t have an account?',
        a: 'Yes! Each event can be shared via a private link. Recipients can view that specific event without needing an account, but they won\'t see your other events or be able to follow you.'
      },
      {
        q: 'Can I make an event public?',
        a: 'Yes. Public is one of the five audience settings, and a public event can be opened by anyone who has the link, with or without an account. Our robots.txt asks search engines and AI crawlers not to index event pages, but a public event is not family-only - pick Followers, Close Family, a custom group or Private if that matters.'
      },
      {
        q: 'Is my data safe?',
        a: 'Yes. We take privacy seriously. We never sell your data, show ads, or use algorithms to manipulate what you see. Your photos and stories are yours, and we\'re just here to help you preserve and share them with family.'
      },
      {
        q: 'Does Our Family Socials show ads?',
        a: 'No. There is no advertising anywhere in the product and we do not sell your data. The product is paid for by Pro and Lifetime subscriptions, which is why there is a price on the pricing page instead of an ad slot in your feed.'
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Contact us at support@ourfamilysocials.com and we\'ll delete your account and all associated data. You can also export your data before deletion.'
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
        a: 'The map view shows all events with locations on an interactive world map. You can see where your family has traveled and click on markers to view those events. It\'s a beautiful way to visualize your family\'s adventures.'
      },
      {
        q: 'Can I see events from multiple family members on one map?',
        a: 'Yes! You can view all events you have access to on a single map, or filter by specific family members to see individual journeys.'
      },
      {
        q: 'What is the timeline view?',
        a: 'The timeline view shows events organized chronologically, grouped by year. It\'s like a visual history of your family\'s memories over time.'
      }
    ]
  },
  {
    category: 'Subscription & Billing',
    questions: [
      {
        q: 'What\'s included in the free trial?',
        a: 'Every new account gets a 30-day free trial of Pro features, including photo and video uploads, journey mapping, GPS extraction and AI Create. You can publish up to 5 events during the trial. After the trial you revert to the free plan unless you subscribe, which means you can still browse and comment but cannot create new events.'
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
        a: 'Yes! You can cancel your subscription anytime. You\'ll keep Pro access until the end of your billing period. Your events and data are never deleted when you cancel.'
      },
      {
        q: 'What happens to my events if I downgrade?',
        a: 'Your existing events stay exactly as they are, and you can always open your own events. You will not be able to create new events without an active subscription, and other people cannot open your events while your subscription is inactive, so resubscribing restores them.'
      }
    ]
  }
]

export const flatFaqs = faqCategories.flatMap((c) => c.questions)
