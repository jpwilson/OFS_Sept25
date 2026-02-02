import { Link } from 'react-router-dom'
import FeedCardPreview from '../components/FeedCardPreview'
import styles from './AdminDesignPreview.module.css'

function AdminDesignPreview() {
  // Sample event data for preview
  const sampleEvents = [
    {
      id: 1,
      title: "Summer Beach Vacation 2024",
      author_name: "wilson_family",
      event_date: "2024-07-15",
      location: "Malibu, California",
      cover_image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400"
    },
    {
      id: 2,
      title: "Birthday Party Celebration",
      author_name: "the_johnsons",
      event_date: "2024-06-20",
      location: "New York City",
      cover_image_url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400"
    },
    {
      id: 3,
      title: "Mountain Hiking Adventure",
      author_name: "adventure_crew",
      event_date: "2024-08-05",
      location: "Rocky Mountains",
      cover_image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400"
    },
    {
      id: 4,
      title: "Family Reunion Weekend",
      author_name: "smiths_united",
      event_date: "2024-05-28",
      location: "Austin, Texas",
      cover_image_url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400"
    }
  ]

  const variants = ['A', 'B', 'C', 'D']

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link to="/admin" className={styles.backLink}>← Back to Dashboard</Link>
        </div>
        <h1 className={styles.title}>Design Preview</h1>
        <p className={styles.subtitle}>Feed card hover effect variations</p>
      </header>

      {/* Variant descriptions */}
      <div className={styles.descriptions}>
        <div className={styles.descCard}>
          <span className={styles.descBadge}>A</span>
          <div>
            <strong>Slide Up</strong>
            <p>Dark gradient slides up from bottom, no blur</p>
          </div>
        </div>
        <div className={styles.descCard}>
          <span className={styles.descBadge}>B</span>
          <div>
            <strong>Fade + Glossy</strong>
            <p>Gradient fades in with glossy sweep animation</p>
          </div>
        </div>
        <div className={styles.descCard}>
          <span className={styles.descBadge}>C</span>
          <div>
            <strong>Text Blur Only</strong>
            <p>Blur only behind text area, image stays crisp</p>
          </div>
        </div>
        <div className={styles.descCard}>
          <span className={styles.descBadge}>D</span>
          <div>
            <strong>Corner Reveal</strong>
            <p>Diagonal wipe with subtle gradient overlay</p>
          </div>
        </div>
      </div>

      {/* Preview cards grid */}
      <section className={styles.previewSection}>
        <h2 className={styles.sectionTitle}>Hover to preview effects</h2>
        <div className={styles.cardsGrid}>
          {variants.map((variant, index) => (
            <FeedCardPreview
              key={variant}
              event={sampleEvents[index]}
              variant={variant}
            />
          ))}
        </div>
      </section>

      {/* Implementation notes */}
      <section className={styles.notes}>
        <h2 className={styles.sectionTitle}>Implementation Notes</h2>
        <ul className={styles.notesList}>
          <li>All variants use glassmorphism with backdrop-filter blur</li>
          <li>Card images are displayed full-bleed with no visible text by default</li>
          <li>On hover, the glass overlay reveals title, author, date, and location</li>
          <li>Animations are optimized for smooth 60fps performance</li>
          <li>Mobile touch devices will show overlay on tap</li>
        </ul>
      </section>
    </div>
  )
}

export default AdminDesignPreview
