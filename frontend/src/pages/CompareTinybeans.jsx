import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Compare.module.css'

export default function CompareTinybeans() {
  const { user } = useAuth()

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={user ? '/feed' : '/'} className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>Our Family Socials vs. Tinybeans</h1>
          <p className={styles.subtitle}>
            When your kids grow up, you need a platform that grows with them
          </p>
        </div>

        <section className={styles.section}>
          <h2>Tinybeans Is Great... Until Your Kids Grow Up</h2>
          <p>
            Tinybeans is a popular app for parents to share baby and toddler photos. But as your children 
            get older, families find themselves needing something more comprehensive. What happens when 
            you want to share your teenager's graduation, your anniversary trip, or grandparents' milestone 
            birthdays? Tinybeans is focused on young children, leaving families searching for a platform 
            that covers the whole family's story.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Key Differences</h2>
          <div className={styles.comparison}>
            <div className={styles.comparisonItem}>
              <h3>👨‍👩‍👧‍👦 Family Scope</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>Designed specifically for babies and young kids. Limited scope for broader family events</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>All family events: kids' milestones, vacations, anniversaries, grandparents, cousins, everyone</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>📅 Event Types</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>Daily photo journals focused on children's daily activities and milestones</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Rich event pages for any occasion: vacations, birthdays, graduations, reunions, holidays, dinners</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>🗺️ Journey Maps</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>No map or location-based features</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Interactive world map showing all events, multi-location journey maps, GPS extraction from photos</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>👥 Family Network</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>Invite-only viewers for your child's journal. Focused on one immediate family</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Follow extended family members, see their events, build a full family network across generations</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>📖 Content Depth</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>Simple photo posts with captions</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Rich event pages with photo galleries, detailed stories, multiple locations, date ranges, categories</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>🌳 Family Trees</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>No family tree or relationship mapping</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Interactive family tree visualization showing verified relationships across the extended family</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>📅 Timeline Views</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>Calendar-based daily photo view</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Timeline, map, calendar, and feed views. Filter by person, place, category, or date</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>🎯 Long-Term Value</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>Great for baby/toddler years, but families outgrow it as kids age</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Lifetime value: birth to college graduation to weddings to grandchildren—one platform forever</p>
                </div>
              </div>
            </div>

            <div className={styles.comparisonItem}>
              <h3>💰 Pricing</h3>
              <div className={styles.vs}>
                <div className={styles.vsColumn}>
                  <strong>Tinybeans</strong>
                  <p>Free with limited features, premium plans start around $4.99/month</p>
                </div>
                <div className={styles.vsColumn}>
                  <strong>Our Family Socials</strong>
                  <p>Free viewing plan, $9/month (annual) or $12/month for Pro. Lifetime option available at $294</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>When Families Switch from Tinybeans</h2>
          <ul className={styles.list}>
            <li><strong>Kids are getting older:</strong> Your 10-year-old's soccer tournament doesn't fit Tinybeans' baby-focused model</li>
            <li><strong>Need more than kid content:</strong> You want to share your vacation, your anniversary, grandma's 80th birthday</li>
            <li><strong>Extended family events:</strong> Tinybeans doesn't handle family reunions, weddings, or multi-generational gatherings</li>
            <li><strong>Want richer content:</strong> Need journey maps, detailed stories, and better organization beyond daily photo journals</li>
            <li><strong>Building family history:</strong> Want a platform that captures the whole family's story, not just the kids</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Can You Use Both?</h2>
          <p>
            Absolutely! Some families keep Tinybeans for daily kid photos and use Our Family Socials for 
            bigger family events, vacations, and extended family sharing. Think of Tinybeans as a baby book 
            and Our Family Socials as the family photo album.
          </p>
          <p>
            However, many families find they can do everything in Our Family Socials—kid milestones 
            <em>and</em> the full family story—simplifying down to one platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Get Started</h2>
          <p>
            Ready for a family platform that grows with your family?
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/login?signup=true" className={styles.ctaButton}>Start Free Trial</Link>
            <Link to="/pricing" className={styles.secondaryButton}>View Pricing</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
