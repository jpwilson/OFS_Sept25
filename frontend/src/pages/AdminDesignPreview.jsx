import { Link } from 'react-router-dom'
import { FeedCardVariantGrid } from '../components/FeedCardPreview'
import styles from './AdminDesignPreview.module.css'

function AdminDesignPreview() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link to="/admin" className={styles.backLink}>← Back to Dashboard</Link>
        </div>
        <h1 className={styles.title}>Design Preview</h1>
        <p className={styles.subtitle}>Preview different UI variations before deploying</p>
      </header>

      {/* Feed Card Variants Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Feed Card Glass Hover Effects</h2>
          <p className={styles.sectionDesc}>
            Cards show image-only by default. Hover to see the glass overlay with event details.
            Each variant uses a different animation style.
          </p>
        </div>

        <FeedCardVariantGrid />

        <div className={styles.variantDescriptions}>
          <div className={styles.variantDesc}>
            <strong>Variant A - Slide Up:</strong> Glass panel slides up from the bottom with a bouncy spring animation.
            Text fades in as the panel rises. Classic and reliable.
          </div>
          <div className={styles.variantDesc}>
            <strong>Variant B - Fade In:</strong> Full-height glass overlay fades in smoothly.
            Text elements stagger in sequence for an elegant, layered reveal.
          </div>
          <div className={styles.variantDesc}>
            <strong>Variant C - Split:</strong> Glass expands from the center horizontally, creating a dramatic
            reveal effect. Bold and modern feel.
          </div>
          <div className={styles.variantDesc}>
            <strong>Variant D - Corner:</strong> Glass expands diagonally from the bottom-left corner.
            Unique and playful diagonal wipe effect.
          </div>
        </div>
      </section>

      {/* Landing Page Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Landing Page Variations</h2>
          <p className={styles.sectionDesc}>
            Preview different landing page designs with glassmorphism effects.
          </p>
        </div>

        <div className={styles.landingLinks}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(v => (
            <Link
              key={v}
              to={`/admin/landing-${v}`}
              target="_blank"
              className={styles.landingLink}
            >
              <span className={styles.landingVersion}>V{v}</span>
              <span className={styles.landingLabel}>
                {v === 1 && 'Subtle Frosted'}
                {v === 2 && 'Floating Panels'}
                {v === 3 && 'Blur Gradients'}
                {v === 4 && 'Glass Cards'}
                {v === 5 && 'Parallax Depth'}
                {v === 6 && 'Scroll Reveal'}
                {v === 7 && 'Neon Glow'}
                {v === 8 && 'Light Refraction'}
              </span>
              <span className={styles.landingArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AdminDesignPreview
