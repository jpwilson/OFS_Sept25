import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Compare.module.css'

export default function ComparePrivateGroups() {
  const { user } = useAuth()

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={user ? '/feed' : '/'} className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>Our Family Socials vs. Private Facebook Groups</h1>
          <p className={styles.subtitle}>
            Why families are switching from Facebook groups to a purpose-built family network
          </p>
        </div>

        <section className={styles.section}>
          <h2>The Problem with Private Facebook Groups</h2>
          <p>
            Private Facebook groups are a common way for families to stay connected, but they have 
            significant limitations. They're built for general groups, not families, and they come 
            with all the downsides of the Facebook platform: ads, algorithmic feeds, privacy concerns, 
            and a cluttered interface that wasn't designed for preserving family memories.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Key Differences</h2>
          <div className={styles.comparison}>
            <div className={styles.comparisonItem}>
              <h3>📱 Platform Privacy</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Still on Facebook's platform, subject to their data collection, ad targeting, and policy changes</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Completely separate platform with no data selling, no ad targeting, no connection to Meta</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>🎯 Feed Algorithm</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Algorithmic feed hides posts, even in groups. You might miss important family updates</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Chronological feed always. See every post from family members in the order they're shared</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>🚫 Advertising</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Ads appear in your feed, even in private groups. Your family photos appear next to ads</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Zero ads, ever. Your family memories are never interrupted by advertising</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>📸 Content Organization</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Posts get lost in endless scroll. Hard to find that vacation album from last year</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Events organized by date, location, and person. Timeline and map views for easy browsing</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>🗺️ Location Features</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Basic location tagging on posts. No journey maps or GPS extraction</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Interactive world map, multi-location journey maps, GPS extraction from photo metadata</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>📖 Rich Event Pages</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Standard posts with limited formatting. Photos appear in a basic album</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Rich event pages with photo galleries, detailed stories, multiple locations, dates, and context</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>👥 Account Requirements</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Everyone needs a Facebook account. Privacy-conscious family members may refuse</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Simple sign-up with just email and password. Share individual events via link with non-users</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>🎨 User Experience</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Private Facebook Group</strong>
                  <p>Cluttered with notifications, friend requests, and features irrelevant to family sharing</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Clean, focused interface designed specifically for families to share and preserve memories</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Why Families Are Switching</h2>
          <ul className={styles.list}>
            <li><strong>True Privacy:</strong> Not on Meta's platform, no data collection for ad targeting</li>
            <li><strong>No Missed Posts:</strong> Chronological feed ensures you see everything</li>
            <li><strong>Better Organization:</strong> Events, timeline, and map views make it easy to browse years of memories</li>
            <li><strong>Ad-Free Experience:</strong> Family photos without advertisements interrupting</li>
            <li><strong>Purpose-Built:</strong> Designed for families from the ground up, not adapted from a generic group feature</li>
            <li><strong>GPS Features:</strong> Journey maps and location tracking perfect for vacation documentation</li>
            <li><strong>Flexible Sharing:</strong> Share individual events with non-users via link</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Pricing</h2>
          <p>
            Unlike Facebook (which is "free" but monetizes your data), Our Family Socials charges a transparent 
            subscription. Free plan for viewing, Pro plan at $9/month (annual) for unlimited event creation. 
            We believe that if you're not paying for the product, you <em>are</em> the product.
          </p>
          <p>
            <strong>All new accounts get a 30-day free trial of Pro features.</strong>
          </p>
          <Link to="/pricing" className={styles.ctaButton}>View Pricing</Link>
        </section>

        <section className={styles.section}>
          <h2>Get Started</h2>
          <p>
            Ready to move your family off Facebook groups and into a private, purpose-built space?
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/login?signup=true" className={styles.ctaButton}>Start Free Trial</Link>
            <Link to="/about" className={styles.secondaryButton}>Learn More</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
