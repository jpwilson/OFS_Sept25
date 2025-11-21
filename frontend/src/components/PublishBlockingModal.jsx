import styles from './PublishBlockingModal.module.css'

/**
 * Modal that blocks publishing while videos are still uploading/compressing
 * Shows clear message and progress of remaining videos
 */
function PublishBlockingModal({ isOpen, videoTasks, onClose }) {
  if (!isOpen) return null

  const activeVideos = videoTasks.filter(
    task => task.status === 'uploading' || task.status === 'compressing'
  )

  // If no active videos, don't show modal
  if (activeVideos.length === 0) return null

  // Calculate overall progress
  const totalProgress = activeVideos.reduce((sum, task) => sum + (task.progress || 0), 0)
  const averageProgress = Math.round(totalProgress / activeVideos.length)

  return (
    <div className={styles.overlay} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.icon}>⏳</div>
          <h2 className={styles.title}>Processing Videos...</h2>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            You have added video that is still compressing.
            <br />
            Please wait until this popup closes for publishing to complete.
          </p>

          <div className={styles.videoList}>
            {activeVideos.map((task) => (
              <div key={task.id} className={styles.videoItem}>
                <div className={styles.videoInfo}>
                  {task.thumbnailUrl && (
                    <img
                      src={task.thumbnailUrl}
                      alt="Video thumbnail"
                      className={styles.thumbnail}
                    />
                  )}
                  <div className={styles.videoDetails}>
                    <div className={styles.filename}>{task.filename}</div>
                    <div className={styles.status}>
                      {task.status === 'uploading' && 'Uploading...'}
                      {task.status === 'compressing' && 'Compressing...'}
                      {' '}
                      {task.progress}%
                    </div>
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${task.progress || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.overallProgress}>
            <div className={styles.overallLabel}>
              Overall Progress: {averageProgress}%
            </div>
            <div className={styles.overallBar}>
              <div
                className={styles.overallFill}
                style={{ width: `${averageProgress}%` }}
              />
            </div>
          </div>

          <p className={styles.note}>
            ℹ️ You can continue editing your event. We'll publish automatically when videos are ready.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PublishBlockingModal
