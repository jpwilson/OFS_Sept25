import { Link } from 'react-router-dom'
import styles from './Legal.module.css'

function Terms() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.logo}>
          Our Family Socials
        </Link>
      </div>

      <div className={styles.content}>
        <h1>Terms of Service</h1>
        <p className={styles.lastUpdated}>Last Updated: January 2025</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using Our Family Socials, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>Our Family Socials is a private social network that allows families to share events, photos, and memories. We offer both free and paid subscription plans with different features and limitations.</p>
        </section>

        <section>
          <h2>3. Account Registration</h2>
          <p>To use our service, you must:</p>
          <ul>
            <li>Be at least 13 years of age</li>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section>
          <h2>4. User Content</h2>
          <p>You retain ownership of the content you post. By posting content, you grant us a license to use, store, and display your content to provide our services. You are responsible for:</p>
          <ul>
            <li>Ensuring you have rights to all content you post</li>
            <li>Not posting illegal, harmful, or offensive content</li>
            <li>Not violating others' intellectual property rights</li>
            <li>Not impersonating others or providing false information</li>
          </ul>
        </section>

        <section>
          <h2>5. Subscription Plans</h2>
          <p><strong>Free Plan:</strong> Limited to 5 events with basic features.</p>
          <p><strong>Premium Plan ($9/month or $108/year):</strong> Unlimited events and additional features.</p>
          <p><strong>Family Plan ($19/month or $228/year):</strong> Multiple accounts and advanced features.</p>
          <p>Subscription fees are non-refundable except as required by law. You may cancel your subscription at any time.</p>
        </section>

        <section>
          <h2>6. Prohibited Conduct</h2>
          <p>You may not:</p>
          <ul>
            <li>Use the service for any illegal purpose</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Spam or send unsolicited messages</li>
            <li>Attempt to access others' accounts</li>
            <li>Interfere with the service's operation</li>
            <li>Use automated tools without permission</li>
          </ul>
        </section>

        <section>
          <h2>7. Content Moderation</h2>
          <p>We reserve the right to remove content that violates these Terms or is otherwise objectionable. We may suspend or terminate accounts that violate these Terms.</p>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>
          <p>Our Family Socials and its original content (excluding user content) are the property of Our Family Socials and protected by copyright, trademark, and other laws.</p>
        </section>

        <section>
          <h2>9. Disclaimers</h2>
          <p>Our service is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free.</p>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Our Family Socials shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
        </section>

        <section>
          <h2>11. Indemnification</h2>
          <p>You agree to indemnify and hold Our Family Socials harmless from any claims, damages, or expenses arising from your use of the service or violation of these Terms.</p>
        </section>

        <section>
          <h2>12. Termination</h2>
          <p>You may terminate your account at any time through account settings. We may terminate or suspend your account for violations of these Terms or for any other reason with or without notice.</p>
        </section>

        <section>
          <h2>13. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time. Continued use of the service after changes constitutes acceptance of the modified Terms.</p>
        </section>

        <section>
          <h2>14. Governing Law</h2>
          <p>These Terms shall be governed by the laws of the United States, without regard to conflict of law provisions.</p>
        </section>

        <section>
          <h2>15. Contact Information</h2>
          <p>For questions about these Terms, please contact us at:</p>
          <p>Email: legal@ourfamilysocials.com</p>
        </section>

        <div className={styles.actions}>
          <Link to="/" className={styles.backButton}>← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}

export default Terms
