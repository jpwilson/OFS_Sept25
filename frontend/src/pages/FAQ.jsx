import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './FAQ.module.css'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Our Family Socials?',
        a: 'Our Family Socials is a private social network designed for families. It lets you share life events, photos, and stories with your closest family members and friends. Unlike public social media, everything is private by default and there are no ads or algorithms.'
      },
      {
        q: 'Is it really free?',
        a: 'Yes! The free plan is free forever and includes unlimited viewing of shared events, following family members, commenting, and liking. You can also create up to 5 events. For unlimited event creation and premium features, you can upgrade to Pro.'
      },
      {
        q: 'How do I invite my family members?',
        a: 'Go to your Profile and you\'ll find an invite option. You can send email invitations to family members. When they sign up using your invite link, you\'ll automatically be connected.'
      },
      {
        q: 'Can I use it on my phone?',
        a: 'Absolutely! Our Family Socials is fully responsive and works great on phones, tablets, and computers. Just visit ourfamilysocials.com in your mobile browser.'
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
        a: 'Pro users can add unlimited photos to each event. Free users can create up to 5 events total. We support high-resolution images and will preserve your original photo quality.'
      },
      {
        q: 'Can I add locations to my events?',
        a: 'Yes! You can add multiple locations to each event, perfect for road trips and multi-destination adventures. We can also automatically extract GPS data from your photos to suggest locations.'
      },
      {
        q: 'What\'s the difference between Published, Drafts, and Trash?',
        a: 'Published events are visible to your followers. Drafts are works-in-progress that only you can see. Trash holds deleted events for 30 days before permanent deletion - you can restore them anytime.'
      },
      {
        q: 'Do drafts count toward my event limit?',
        a: 'No! Only published events count toward your limit. You can have unlimited drafts and deleted events.'
      }
    ]
  },
  {
    category: 'Privacy & Sharing',
    questions: [
      {
        q: 'Who can see my events?',
        a: 'Only people you\'ve approved as followers can see your events. When someone wants to follow you, you\'ll receive a request that you can accept or decline. You have full control over your audience.'
      },
      {
        q: 'Can I share an event with someone who doesn\'t have an account?',
        a: 'Yes! Each event can be shared via a private link. Recipients can view that specific event without needing an account, but they won\'t see your other events or be able to follow you.'
      },
      {
        q: 'Is my data safe?',
        a: 'Yes. We take privacy seriously. We never sell your data, show ads, or use algorithms to manipulate what you see. Your photos and stories are yours, and we\'re just here to help you preserve and share them with family.'
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
        a: 'Every new account gets a 30-day free trial of Pro features. During the trial, you can create unlimited events and access all premium features. After the trial, you\'ll revert to the free plan unless you subscribe.'
      },
      {
        q: 'How do I upgrade to Pro?',
        a: 'Go to Settings > Membership from your profile page. You can choose monthly ($12/mo) or annual ($9/mo billed yearly) billing. We also offer a one-time Lifetime option.'
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes! You can cancel your subscription anytime. You\'ll keep Pro access until the end of your billing period. Your events and data are never deleted when you cancel.'
      },
      {
        q: 'What happens to my events if I downgrade?',
        a: 'Your existing events stay exactly as they are. You just won\'t be able to create new events beyond the 5-event free limit. Drafts and previously published events remain accessible.'
      }
    ]
  }
]

export default function FAQ() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [expandedItems, setExpandedItems] = useState({})

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  function toggleItem(categoryIndex, questionIndex) {
    const key = `${categoryIndex}-${questionIndex}`
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  function isExpanded(categoryIndex, questionIndex) {
    return expandedItems[`${categoryIndex}-${questionIndex}`]
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={user ? `/profile/${user.username}` : '/'} className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>Help Center</h1>
          <p className={styles.subtitle}>
            Frequently asked questions about Our Family Socials
          </p>
        </div>

        <div className={styles.faqList}>
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className={styles.category}>
              <h2 className={styles.categoryTitle}>{category.category}</h2>
              <div className={styles.questions}>
                {category.questions.map((item, questionIndex) => (
                  <div key={questionIndex} className={styles.faqItem}>
                    <button
                      className={styles.question}
                      onClick={() => toggleItem(categoryIndex, questionIndex)}
                      aria-expanded={isExpanded(categoryIndex, questionIndex)}
                    >
                      <span>{item.q}</span>
                      <span className={styles.chevron}>
                        {isExpanded(categoryIndex, questionIndex) ? '−' : '+'}
                      </span>
                    </button>
                    {isExpanded(categoryIndex, questionIndex) && (
                      <div className={styles.answer}>
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.contactSection}>
          <h2>Still have questions?</h2>
          <p>We're here to help. Reach out and we'll get back to you as soon as possible.</p>
          <Link to="/contact" className={styles.contactButton}>Contact Us</Link>
        </div>
      </div>
    </div>
  )
}
