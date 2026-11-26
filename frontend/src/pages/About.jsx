import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './About.module.css'
import { JOIN_LINE } from '../content/marketing.js'

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
            Our Family Socials is a private, ad-free social network made for families to share life
            events, photos and memories together. A new event goes to the family you have approved,
            you choose the audience for every one, and the feed is in date order with nothing ranked.
          </p>
          <p>
            We built Our Family Socials for our own family: one place where the long version of our
            lives could live, from the road trip to the school play, shared with the people who
            already know the kids' names. It gives every family a space of its own to keep their
            memories the way they deserve, and to come back to them for years.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What Makes It Ours</h2>
          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>You Choose the Audience</h3>
              <p>
                A new event goes to the followers you have approved, and you can set any event to
                Close Family, a Custom Group like "close family only," Private (just you) or Public
                (anyone with the link).
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
                unfold in order in the timeline view. Filter by person, category or date.
              </p>
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>🤖</div>
              <h3>AI-Powered Stories</h3>
              <p>
                Add your photos, type or say what happened, and AI Create drafts the story, the
                headings and a caption for every photo. Make it your own, or post it as it is.
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
              <p>Create event pages with photos, stories, locations, and dates. Choose who opens each event.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>4</div>
              <h3>Stay Connected</h3>
              <p>View your family's events in the feed, on the map, or in the timeline. Comment, like and cheer each other on.</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Pricing</h2>
          <p>
            Readers are free, forever: family members read, like and comment on the free plan.
            Storytellers pick Pro ($9/month annual or $12/month) for unlimited event creation. We also offer a one-time 
            Lifetime plan ($294) for long-term users.
          </p>
          <p>
            <strong>All new accounts get a 30-day free trial of Pro, no card needed,</strong> with
            up to 5 published events. Drafts are free, so write as many as you like.
          </p>
          <Link to="/pricing" className={styles.ctaButton}>View Pricing Details</Link>
        </section>

        <section className={styles.section}>
          <h2>Who It's For</h2>
          <ul className={styles.list}>
            <li><strong>Parents</strong> wanting to share kids' milestones with grandparents</li>
            <li><strong>Extended families</strong> staying close across any distance</li>
            <li><strong>Travelers</strong> telling the story of every trip with photo albums and maps</li>
            <li><strong>Anyone</strong> who wants to share their life privately with the people who matter</li>
            <li><strong>Families</strong> who value privacy and want to keep their memories ad-free</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Get Started</h2>
          <p>
            Ready to start sharing your family's story? Sign up for free and get a 30-day Pro trial.
            {' '}{JOIN_LINE}
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
