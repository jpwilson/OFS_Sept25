import styles from './Skeleton.module.css'

export function EventCardSkeleton() {
  return (
    <div className={styles.eventCard}>
      <div className={`${styles.skeleton} ${styles.image}`} />
      <div className={styles.content}>
        <div className={`${styles.skeleton} ${styles.title}`} />
        <div className={`${styles.skeleton} ${styles.meta}`} />
        <div className={`${styles.skeleton} ${styles.excerpt}`} />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className={styles.profileSkeleton}>
      <div className={styles.profileHeader}>
        <div className={`${styles.skeleton} ${styles.avatar}`} />
        <div className={styles.profileInfo}>
          <div className={`${styles.skeleton} ${styles.name}`} />
          <div className={`${styles.skeleton} ${styles.username}`} />
          <div className={`${styles.skeleton} ${styles.bio}`} />
          <div className={`${styles.skeleton} ${styles.stats}`} />
        </div>
      </div>
      <div className={styles.gridSkeleton}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className={`${styles.skeleton} ${styles.gridCard}`} />
        ))}
      </div>
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div>
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </div>
  )
}