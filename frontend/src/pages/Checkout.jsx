import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import styles from './Checkout.module.css'

function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') || 'premium'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/checkout?plan=${plan}`)
    }
  }, [user, navigate, plan])

  const plans = {
    premium: {
      name: 'Premium',
      price: '$9',
      description: 'For families who share everything',
      features: [
        'Unlimited events',
        'Everything in Free',
        'Photo books (coming soon)',
        'Custom event themes',
        'Priority support',
        'Export your data'
      ]
    },
    family: {
      name: 'Family',
      price: '$19',
      description: 'For larger families',
      features: [
        'Everything in Premium',
        'Up to 10 family accounts',
        'Shared family calendar',
        'Private family groups',
        'Admin controls',
        'Dedicated support'
      ]
    }
  }

  const selectedPlan = plans[plan] || plans.premium

  const handleCheckout = async () => {
    setLoading(true)

    // TODO: Integrate with Stripe Checkout
    // For now, this is a placeholder
    console.log('Initiating Stripe checkout for plan:', plan)

    // Simulate loading
    setTimeout(() => {
      alert('Stripe integration coming soon! This is a placeholder checkout page.')
      setLoading(false)
    }, 1500)
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className={styles.container}>
      <div className={styles.checkoutCard}>
        <div className={styles.header}>
          <h1>Complete your purchase</h1>
          <p>You're upgrading to {selectedPlan.name}</p>
        </div>

        <div className={styles.planSummary}>
          <div className={styles.planHeader}>
            <h2>{selectedPlan.name} Plan</h2>
            <div className={styles.price}>
              <span className={styles.priceAmount}>{selectedPlan.price}</span>
              <span className={styles.pricePeriod}>/month</span>
            </div>
          </div>
          <p className={styles.planDesc}>{selectedPlan.description}</p>

          <div className={styles.features}>
            <h3>What's included:</h3>
            <ul>
              {selectedPlan.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.paymentSection}>
          <h3>Payment Details</h3>
          <p className={styles.comingSoon}>
            🚧 Stripe payment integration coming soon
          </p>
          <p className={styles.placeholder}>
            This is a placeholder checkout page. Stripe integration will be added in the next phase.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.checkoutButton}
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Subscribe to ${selectedPlan.name} - ${selectedPlan.price}/mo`}
          </button>
          <button
            className={styles.cancelButton}
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
        </div>

        <div className={styles.guarantee}>
          <p>🔒 Secure payment • Cancel anytime • 30-day money-back guarantee</p>
        </div>
      </div>
    </div>
  )
}

export default Checkout
