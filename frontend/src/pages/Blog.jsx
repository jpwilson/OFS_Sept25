import styles from './Blog.module.css'

const posts = [
  {
    date: 'February 2025',
    title: 'AI Assist (Beta)',
    description: 'Create events faster with AI! Upload your photos, optionally describe what happened (type or use voice), and let AI write the story. AI Assist analyzes your photos, reads GPS and timestamp data, and generates a complete event with captions. Available to Pro and trial users.'
  },
  {
    date: 'January 2025',
    title: 'Family Tree',
    description: 'Visualize your family connections with our new interactive Family Tree feature. See how everyone in your family is connected, add relationships, and explore your family structure in a beautiful tree view.'
  },
  {
    date: 'January 2025',
    title: 'Quick Add',
    description: 'Capture moments instantly with Quick Add. Snap a photo, add a quick title, and publish in seconds. Perfect for when you want to share a moment without writing a full event. Your photos\' GPS data is automatically used for location.'
  },
  {
    date: 'December 2024',
    title: 'Map & Timeline Views',
    description: 'Explore your family memories in new ways! The Map view shows all your events on an interactive map based on where they happened. The Timeline view lets you scroll through events chronologically. Switch between Feed, Map, and Timeline views from the main page.'
  },
  {
    date: 'December 2024',
    title: 'Photo Galleries & Lightbox',
    description: 'Events now support beautiful photo galleries. Upload multiple photos and videos to any event. Click any image to open a full-screen lightbox with swipe navigation and image counter.'
  },
  {
    date: 'November 2024',
    title: 'Groups & Privacy',
    description: 'Organize your family into groups. Create groups for immediate family, extended family, or any custom grouping. Share events with specific groups to control who sees what.'
  },
  {
    date: 'November 2024',
    title: 'Launch',
    description: 'Our Family Socials is live! A private social network designed for families. Share life events, photos, and stories with your closest family members. No ads, no algorithms, just family.'
  }
]

export default function Blog() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>What's New in OFS</h1>
        <p className={styles.subtitle}>Recent features and updates</p>

        <div className={styles.posts}>
          {posts.map((post, i) => (
            <div key={i} className={styles.post}>
              <span className={styles.date}>{post.date}</span>
              <h2 className={styles.postTitle}>{post.title}</h2>
              <p className={styles.postDescription}>{post.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
