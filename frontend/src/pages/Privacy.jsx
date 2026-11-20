import { Link } from 'react-router-dom'
import styles from './Legal.module.css'

function Privacy() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.logo}>
          Our Family Socials
        </Link>
      </div>

      <div className={styles.content}>
        <h1>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last Updated: November 2026</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>Account information (name, email, username, password)</li>
            <li>Profile information (bio, location, profile photo, banner image)</li>
            <li>Content you create (events, photos, comments, likes)</li>
            <li>Communications with us</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Enable you to share events and memories with family</li>
          </ul>
        </section>

        <section>
          <h2>3. Information Sharing</h2>
          <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
          <ul>
            <li>With your consent or at your direction</li>
            <li>With family members you choose to follow</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
        </section>

        <section>
          <h2>5. Cookies and Tracking</h2>
          <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
        </section>

        <section>
          <h2>6. Analytics and Privacy</h2>
          <p>We use PostHog for privacy-first analytics to understand how our service is used and to improve your experience. Our analytics implementation is designed with your privacy as the top priority:</p>
          <ul>
            <li><strong>No Personal Information:</strong> We do not track names, emails, photos, or any family member details</li>
            <li><strong>No Session Recording:</strong> We do not record your screen or capture what you type</li>
            <li><strong>Anonymous Identifiers:</strong> Users are identified only by internal numeric IDs</li>
            <li><strong>Minimal Data:</strong> We only track page views, navigation patterns, and key actions like signups and subscriptions</li>
            <li><strong>Bot Filtering:</strong> Automated traffic is separated from real user analytics</li>
            <li><strong>Respect Do Not Track:</strong> We honor your browser's Do Not Track setting</li>
          </ul>
          <p>Analytics data helps us understand which features are most valuable, identify technical issues, and measure the effectiveness of improvements. All data is aggregated and used solely to improve our service.</p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and data</li>
            <li>Export your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent and believe your child has provided us with personal information, please contact us.</p>
        </section>

        <section>
          <h2>9. Data Retention</h2>
          <p>We retain your information for as long as your account is active or as needed to provide you services. You may delete your account at any time through your account settings.</p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
        </section>

        <section>
          <h2>11. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at:</p>
          <p>Email: privacy@ourfamilysocials.com</p>
        </section>

        <div className={styles.actions}>
          <Link to="/" className={styles.backButton}>← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}

export default Privacy
