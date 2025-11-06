import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './PricingPage.module.css'

function PricingPage() {
  const { user } = useAuth()
  const [billingPeriod, setBillingPeriod] = useState('annual') // 'monthly' or 'annual'

  const features = [
    {
      category: 'Events',
      items: [
        { name: 'Published events', free: '5 events', premium: 'Unlimited', family: 'Unlimited' },
        { name: 'Draft events', free: 'Unlimited', premium: 'Unlimited', family: 'Unlimited' },
        { name: 'Deleted events (recoverable)', free: 'Unlimited', premium: 'Unlimited', family: 'Unlimited' }
      ]
    },
    {
      category: 'Content & Media',
      items: [
        { name: 'Photos per event', free: 'Unlimited', premium: 'Unlimited', family: 'Unlimited' },
        { name: 'GPS extraction from photos', free: true, premium: true, family: true },
        { name: 'Multiple locations per event', free: true, premium: true, family: true },
        { name: 'Interactive journey maps', free: true, premium: true, family: true },
        { name: 'Rich text editor', free: true, premium: true, family: true },
        { name: 'Cover images', free: true, premium: true, family: true },
        { name: 'Profile banner images', free: true, premium: true, family: true }
      ]
    },
    {
      category: 'Social Features',
      items: [
        { name: 'Follow family members', free: true, premium: true, family: true },
        { name: 'Comments & likes', free: true, premium: true, family: true },
        { name: 'Timeline view', free: true, premium: true, family: true },
        { name: 'Event sharing', free: true, premium: true, family: true }
      ]
    },
    {
      category: 'Premium Features',
      items: [
        { name: 'Photo books', free: false, premium: 'Coming soon', family: 'Coming soon' },
        { name: 'Custom event themes', free: false, premium: 'Coming soon', family: 'Coming soon' },
        { name: 'Export your data', free: false, premium: 'Coming soon', family: 'Coming soon' },
        { name: 'Priority support', free: false, premium: true, family: true }
      ]
    },
    {
      category: 'Family Plan',
      items: [
        { name: 'Family accounts', free: '1', premium: '1', family: 'Up to 10' },
        { name: 'Shared family calendar', free: false, premium: false, family: true },
        { name: 'Private family groups', free: false, premium: false, family: true },
        { name: 'Admin controls', free: false, premium: false, family: true },
        { name: 'Dedicated support', free: false, premium: false, family: true }
      ]
    }
  ]

  const renderFeatureValue = (value) => {
    if (value === true) return <span className={styles.checkmark}>✓</span>
    if (value === false) return <span className={styles.dash}>—</span>
    return <span className={styles.value}>{value}</span>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Choose Your Plan</h1>
        <p className={styles.subtitle}>
          All plans include our core features. Upgrade to publish unlimited events and unlock premium features.
        </p>

        {/* Billing Period Toggle */}
        <div className={styles.billingToggle}>
          <button
            className={`${styles.toggleButton} ${billingPeriod === 'monthly' ? styles.active : ''}`}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </button>
          <button
            className={`${styles.toggleButton} ${billingPeriod === 'annual' ? styles.active : ''}`}
            onClick={() => setBillingPeriod('annual')}
          >
            Annual <span className={styles.saveBadge}>Save 25%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className={styles.pricingCards}>
        {/* Free Plan */}
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.planName}>Free</h2>
            <div className={styles.price}>
              <span className={styles.priceAmount}>$0</span>
              <span className={styles.pricePeriod}>/forever</span>
            </div>
            <p className={styles.planDesc}>Perfect for trying it out</p>
          </div>
          <div className={styles.planHighlights}>
            <div className={styles.highlight}>5 published events</div>
            <div className={styles.highlight}>All core features</div>
            <div className={styles.highlight}>Unlimited drafts</div>
          </div>
          {user ? (
            user.subscription_tier === 'free' ? (
              <div className={styles.currentPlan}>Current Plan</div>
            ) : (
              <Link to="/profile" className={styles.buttonSecondary}>
                Your Profile
              </Link>
            )
          ) : (
            <Link to="/signup" className={styles.buttonSecondary}>
              Get Started Free
            </Link>
          )}
        </div>

        {/* Premium Plan */}
        <div className={`${styles.pricingCard} ${styles.featured}`}>
          <div className={styles.popularBadge}>Most Popular</div>
          <div className={styles.cardHeader}>
            <h2 className={styles.planName}>Premium</h2>
            <div className={styles.price}>
              <span className={styles.priceAmount}>{billingPeriod === 'annual' ? '$9' : '$12'}</span>
              <span className={styles.pricePeriod}>/month</span>
            </div>
            <p className={styles.planDesc}>
              {billingPeriod === 'annual' ? 'Billed annually at $108/year' : 'Billed monthly'}
            </p>
          </div>
          <div className={styles.planHighlights}>
            <div className={styles.highlight}><strong>Unlimited events</strong></div>
            <div className={styles.highlight}>All Free features</div>
            <div className={styles.highlight}>Priority support</div>
          </div>
          {user ? (
            user.subscription_tier === 'premium' ? (
              <div className={styles.currentPlan}>Current Plan</div>
            ) : (
              <Link to="/checkout?plan=premium" className={styles.buttonPrimary}>
                Upgrade to Premium
              </Link>
            )
          ) : (
            <Link to="/signup" className={styles.buttonPrimary}>
              Start Premium Trial
            </Link>
          )}
        </div>

        {/* Family Plan */}
        <div className={styles.pricingCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.planName}>Family</h2>
            <div className={styles.price}>
              <span className={styles.priceAmount}>{billingPeriod === 'annual' ? '$19' : '$24'}</span>
              <span className={styles.pricePeriod}>/month</span>
            </div>
            <p className={styles.planDesc}>
              {billingPeriod === 'annual' ? 'Billed annually at $228/year' : 'Billed monthly'}
            </p>
          </div>
          <div className={styles.planHighlights}>
            <div className={styles.highlight}>Everything in Premium</div>
            <div className={styles.highlight}>Up to 10 accounts</div>
            <div className={styles.highlight}>Family features</div>
          </div>
          {user ? (
            user.subscription_tier === 'family' ? (
              <div className={styles.currentPlan}>Current Plan</div>
            ) : (
              <Link to="/checkout?plan=family" className={styles.buttonSecondary}>
                Choose Family
              </Link>
            )
          ) : (
            <Link to="/signup" className={styles.buttonSecondary}>
              Start Family Trial
            </Link>
          )}
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className={styles.comparisonSection}>
        <h2 className={styles.comparisonTitle}>Detailed Feature Comparison</h2>

        <div className={styles.comparisonTable}>
          <div className={styles.tableHeader}>
            <div className={styles.featureColumn}>Features</div>
            <div className={styles.planColumn}>Free</div>
            <div className={styles.planColumn}>Premium</div>
            <div className={styles.planColumn}>Family</div>
          </div>

          {features.map((category, idx) => (
            <div key={idx} className={styles.categorySection}>
              <div className={styles.categoryHeader}>{category.category}</div>
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className={styles.featureRow}>
                  <div className={styles.featureColumn}>{item.name}</div>
                  <div className={styles.planColumn}>{renderFeatureValue(item.free)}</div>
                  <div className={styles.planColumn}>{renderFeatureValue(item.premium)}</div>
                  <div className={styles.planColumn}>{renderFeatureValue(item.family)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>What counts towards my 5-event limit?</h3>
            <p className={styles.faqAnswer}>
              Only <strong>published</strong> events count. Drafts and deleted events don't count towards your limit, so you can experiment freely!
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>Can I upgrade or downgrade anytime?</h3>
            <p className={styles.faqAnswer}>
              Yes! You can upgrade anytime. If you downgrade, you'll keep your events but won't be able to publish new ones if you're over the free tier limit.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>What happens if I cancel Premium?</h3>
            <p className={styles.faqAnswer}>
              All your events remain safe. You can still view, edit, and download them. You just won't be able to publish new events beyond the 5-event free limit.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h3 className={styles.faqQuestion}>Is there a free trial?</h3>
            <p className={styles.faqAnswer}>
              The Free plan lets you create 5 events with all core features—no credit card required. This is perfect for trying out Our Family Socials!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingPage
