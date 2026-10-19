import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './About.module.css'

export default function About() {
  const { user } = useAuth()

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={user ? '/feed' : '/'} className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>About Our Family Socials</h1>
          <p className={styles.subtitle}>
            A private social network designed specifically for families
          </p>
        </div>

        <section className={styles.section}>
          <h2>What is Our Family Socials?</h2>
          <p>
            Our Family Socials is a private, ad-free social network designed specifically for families 
            to share life events, photos, and memories together. Unlike public social media platforms, 
            everything is private by default, and there are no algorithms manipulating what you see.
          </p>
          <p>
            We built this platform because existing social networks weren't designed for families. 
            They're cluttered with ads, algorithms hide your posts, and your family photos end up 
            mixed with everything else in an endless scroll. Our Family Socials gives families a 
            dedicated space to preserve memories the way they deserve.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Why We're Different</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>Private by Default</h3>
              <p>
                Every event is private unless you explicitly share it. You control exactly who 
                can see each memory, from everyone you follow to custom groups like "close family only."
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🚫</div>
              <h3>No Ads, Ever</h3>
              <p>
                We'll never sell your data or show you ads. Your family memories aren't a product 
                to be monetized. We're funded by subscriptions from families who value privacy.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📍</div>
              <h3>Rich Event Pages</h3>
              <p>
                Create beautiful event pages with photo galleries, detailed stories, multiple 
                locations, and GPS-tagged journey maps. Document your European road trip or your 
                kid's graduation with all the context that makes it special.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🗺️</div>
              <h3>Interactive Maps & Timeline</h3>
              <p>
                See your family's adventures on an interactive world map. Watch years of memories 
                unfold chronologically in the timeline view. Filter by person, place, or date.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🤖</div>
              <h3>AI-Powered Stories</h3>
              <p>
                Let AI help you write event descriptions. Upload your photos, and we'll generate 
                a story based on what's in them. Edit it to perfection or use it as-is.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>👨‍👩‍👧‍👦</div>
              <h3>Built for Families</h3>
              <p>
                Made by a family, for families. We understand what matters to you because we use 
                this app ourselves to stay connected with our own loved ones.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>How It Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Create an Account</h3>
              <p>Sign up for free at ourfamilysocials.com. You'll get a 30-day Pro trial automatically.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Follow Your Family</h3>
              <p>Send follow requests to family members. Once they accept, you'll see each other's events.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Share Life Events</h3>
              <p>Create event pages with photos, stories, locations, and dates. Choose who can see each event.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>Stay Connected</h3>
              <p>View your family's events in the feed, on the map, or in the timeline. Comment, like, and engage.</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Pricing</h2>
          <p>
            We offer a free plan for family members who want to view and engage with events (but not create them), 
            and a Pro plan ($9/month annual or $12/month) for unlimited event creation. We also offer a one-time 
            Lifetime plan ($294) for long-term users.
          </p>
          <p>
            <strong>All new accounts get a 30-day free trial of Pro features.</strong> Only published events 
            count toward your limit—drafts and deleted events are free.
          </p>
          <Link to="/pricing" className={styles.ctaButton}>View Pricing Details</Link>
        </section>

        <section className={styles.section}>
          <h2>Who It's For</h2>
          <ul className={styles.list}>
            <li><strong>Parents</strong> wanting to share kids' milestones with grandparents</li>
            <li><strong>Extended families</strong> staying connected across distance</li>
            <li><strong>Travelers</strong> documenting vacations with rich photo albums and maps</li>
            <li><strong>Anyone</strong> tired of public social media and seeking a private alternative</li>
            <li><strong>Families</strong> who value privacy and want to preserve memories without ads</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Get Started</h2>
          <p>
            Ready to start sharing your family's story? Sign up for free and get a 30-day Pro trial.
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/login?signup=true" className={styles.ctaButton}>Sign Up Free</Link>
            <Link to="/faq" className={styles.secondaryButton}>Read FAQ</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
