import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Compare.module.css'

export default function HowToSharePhotos() {
  const { user } = useAuth()

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={user ? '/feed' : '/'} className={styles.backLink}>
            ← Back
          </Link>
          <h1 className={styles.title}>How to Share Kids' Photos Privately with Family</h1>
          <p className={styles.subtitle}>
            A complete guide to private photo sharing without public social media
          </p>
        </div>

        <section className={styles.section}>
          <h2>The Problem with Public Social Media</h2>
          <p>
            Many parents are uncomfortable posting their children's photos on public platforms like Facebook 
            and Instagram. Privacy concerns, unwanted attention, data collection, and the permanence of 
            online content make parents think twice. Yet grandparents, aunts, uncles, and extended family 
            want to stay connected and see those precious moments.
          </p>
          <p>
            The good news? There are better ways to share family photos privately while still keeping 
            everyone connected.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What to Look for in a Private Photo Sharing Solution</h2>
          <ul className={styles.list}>
            <li><strong>Privacy by default:</strong> Photos should be private unless you explicitly share them</li>
            <li><strong>No public platform:</strong> Not on Facebook, Instagram, or other ad-driven social networks</li>
            <li><strong>Control over audience:</strong> Choose exactly who sees each photo or album</li>
            <li><strong>No data selling:</strong> Your family photos shouldn't be monetized</li>
            <li><strong>Easy for grandparents:</strong> Simple enough for less tech-savvy family members</li>
            <li><strong>Organized by events:</strong> Group photos by occasion (vacation, birthday, etc.)</li>
            <li><strong>Long-term storage:</strong> Build a family archive over years</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Option 1: Private Family Social Network (Recommended)</h2>
          <p>
            A purpose-built family social network like <strong>Our Family Socials</strong> gives you all 
            the convenience of social media without the privacy concerns.
          </p>
          <div className={styles.proscons}>
            <div className={styles.pros}>
              <h3>✓ Pros</h3>
              <ul>
                <li>Private by default—only approved family sees content</li>
                <li>No ads or data collection</li>
                <li>Organized by events with dates, locations, and context</li>
                <li>Easy for grandparents to use (simple interface)</li>
                <li>Comment and engage just like social media</li>
                <li>Interactive maps showing where photos were taken</li>
                <li>Chronological feed (no algorithm hiding posts)</li>
              </ul>
            </div>
            <div className={styles.cons}>
              <h3>✗ Cons</h3>
              <ul>
                <li>Requires family members to create an account (though it's simple)</li>
                <li>Pro plan costs $9-12/month for unlimited uploads (free viewing available)</li>
              </ul>
            </div>
          </div>
          <p>
            <strong>Best for:</strong> Families who want an ongoing, organized way to share life updates, 
            not just photos but stories, milestones, and context.
          </p>
          <Link to="/login?signup=true" className={styles.ctaButton}>Try Our Family Socials Free</Link>
        </section>

        <section className={styles.section}>
          <h2>Option 2: Private Cloud Albums (Google Photos, iCloud)</h2>
          <p>
            Google Photos and iCloud offer shared albums where you can invite specific people to view photos.
          </p>
          <div className={styles.proscons}>
            <div className={styles.pros}>
              <h3>✓ Pros</h3>
              <ul>
                <li>Easy if family already uses Google or Apple</li>
                <li>Automatic backup of all photos</li>
                <li>Free (with storage limits)</li>
              </ul>
            </div>
            <div className={styles.cons}>
              <h3>✗ Cons</h3>
              <ul>
                <li>Still on Google/Apple platforms (data collection concerns)</li>
                <li>Limited social features (no timeline, map, or rich context)</li>
                <li>Can be confusing for non-tech-savvy family</li>
                <li>No organization by events or occasions</li>
                <li>Mixed in with all your other photos</li>
              </ul>
            </div>
          </div>
          <p>
            <strong>Best for:</strong> Quick photo sharing without context, if family is already on these platforms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Option 3: Email or Text Message</h2>
          <p>
            The old-school approach: email photo attachments or MMS/WhatsApp messages.
          </p>
          <div className={styles.proscons}>
            <div className={styles.pros}>
              <h3>✓ Pros</h3>
              <ul>
                <li>Everyone has email or a phone</li>
                <li>Completely direct, no platform</li>
                <li>No accounts needed</li>
              </ul>
            </div>
            <div className={styles.cons}>
              <h3>✗ Cons</h3>
              <ul>
                <li>Photos get lost in inboxes</li>
                <li>No organization or timeline</li>
                <li>Can't see all photos in one place</li>
                <li>Annoying to send to multiple people</li>
                <li>No commenting or engagement</li>
                <li>Poor image quality in MMS</li>
              </ul>
            </div>
          </div>
          <p>
            <strong>Best for:</strong> Sharing a single photo occasionally, not ongoing updates.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Option 4: Private Photo Hosting (Flickr, SmugMug)</h2>
          <p>
            Photo hosting services with private album features.
          </p>
          <div className={styles.proscons}>
            <div className={styles.pros}>
              <h3>✓ Pros</h3>
              <ul>
                <li>High-quality storage</li>
                <li>Privacy controls available</li>
                <li>Good for photographers</li>
              </ul>
            </div>
            <div className={styles.cons}>
              <h3>✗ Cons</h3>
              <ul>
                <li>Not designed for families (more for professional photos)</li>
                <li>Expensive (SmugMug starts at $7-12/month)</li>
                <li>Complicated interface for non-photographers</li>
                <li>No social features or engagement</li>
                <li>No event organization or timeline</li>
              </ul>
            </div>
          </div>
          <p>
            <strong>Best for:</strong> Professional photographers, not casual family sharing.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Option 5: Physical Photo Books or Prints</h2>
          <p>
            Go old-school: print photos and mail them, or create photo books.
          </p>
          <div className={styles.proscons}>
            <div className={styles.pros}>
              <h3>✓ Pros</h3>
              <ul>
                <li>Tangible memories grandparents can hold</li>
                <li>No technology barrier</li>
                <li>Beautiful keepsakes</li>
              </ul>
            </div>
            <div className={styles.cons}>
              <h3>✗ Cons</h3>
              <ul>
                <li>Expensive and time-consuming</li>
                <li>No real-time sharing</li>
                <li>Can't share videos</li>
                <li>Not practical for frequent updates</li>
              </ul>
            </div>
          </div>
          <p>
            <strong>Best for:</strong> Special occasions and keepsakes, not regular updates.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Why Private Family Networks Are the Best Solution</h2>
          <p>
            After trying all the options, most families find that a private, purpose-built family network 
            offers the best balance of convenience, privacy, and family engagement. You get:
          </p>
          <ul className={styles.list}>
            <li>The social features of Facebook without the privacy concerns</li>
            <li>Better organization than cloud albums</li>
            <li>Real-time sharing that physical photos can't provide</li>
            <li>A long-term family archive that grows over years</li>
            <li>Context around photos (dates, locations, stories)</li>
            <li>A platform designed specifically for families, not adapted from something else</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Getting Grandparents On Board</h2>
          <p>
            Concerned about tech-challenged grandparents? Here's what helps:
          </p>
          <ul className={styles.list}>
            <li><strong>Simple signup:</strong> Just email and password, no complicated process</li>
            <li><strong>View-only accounts are free:</strong> Grandparents can view everything without creating content</li>
            <li><strong>Email notifications:</strong> They'll get notified when you post something new</li>
            <li><strong>Works on any device:</strong> Phone, tablet, or computer—whatever they're comfortable with</li>
            <li><strong>No learning curve:</strong> If they can use Facebook, they can use Our Family Socials</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Get Started</h2>
          <p>
            Ready to share family photos privately without the downsides of public social media?
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
