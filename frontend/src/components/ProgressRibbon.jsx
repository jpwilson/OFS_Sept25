import { useState } from 'react'
import styles from './ProgressRibbon.module.css'

/**
 * Progress ribbon that shows video and image upload status
 * Displays in top-right corner, non-blocking, allows user to continue editing
 */
function ProgressRibbon({ videoTasks = [], imageTasks = [], onCancel, onCancelImage }) {
  const [isMinimized, setIsMinimized] = useState(false)

  // Combine all tasks for display
  const allTasks = [
    ...imageTasks.map(t => ({ ...t, type: 'image' })),
    ...videoTasks.map(t => ({ ...t, type: 'video' }))
  ]

  if (allTasks.length === 0) return null

  // Count active tasks
  const activeTasks = allTasks.filter(
    task => task.status === 'uploading' || task.status === 'compressing'
  )
  const allComplete = allTasks.every(task => task.status === 'complete')
  const anyFailed = allTasks.some(task => task.status === 'failed')

  // Separate counts for title
  const activeVideos = videoTasks.filter(t => t.status === 'uploading' || t.status === 'compressing')
  const activeImages = imageTasks.filter(t => t.status === 'uploading')

  return (
    <div
      className={`${styles.ribbon} ${isMinimized ? styles.minimized : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <div className={styles.title}>
          {allComplete ? '✅ Uploads Complete' : (
            <>
              {activeImages.length > 0 && `📷 ${activeImages.length} image${activeImages.length > 1 ? 's' : ''}`}
              {activeImages.length > 0 && activeVideos.length > 0 && ', '}
              {activeVideos.length > 0 && `📹 ${activeVideos.length} video${activeVideos.length > 1 ? 's' : ''}`}
              {activeTasks.length === 0 && anyFailed && '⚠️ Upload failed'}
            </>
          )}
        </div>
        <div className={styles.headerButtons}>
          <button
            className={styles.minimizeButton}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setIsMinimized(!isMinimized)
            }}
            title={isMinimized ? 'Expand' : 'Minimize'}
            type="button"
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          {allComplete && (
            <button
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onCancel && onCancel('all')
                onCancelImage && onCancelImage('all')
              }}
              title="Dismiss"
              type="button"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* User guidance message */}
          {activeTasks.length > 0 && (
            <div className={styles.guidanceMessage}>
              💡 You can continue editing while uploads process.
            </div>
          )}

          <div className={styles.taskList}>
            {allTasks.map((task) => (
            <div key={task.id} className={styles.task}>
              {/* Thumbnail preview - for videos or images */}
              {(task.thumbnailUrl || (task.type === 'image' && task.previewUrl)) && (
                <div className={styles.thumbnail}>
                  <img src={task.thumbnailUrl || task.previewUrl} alt={task.type === 'image' ? 'Image preview' : 'Video thumbnail'} />
                  {task.status === 'complete' && <div className={styles.checkmark}>✓</div>}
                  {task.status === 'failed' && <div className={styles.failmark}>✗</div>}
                </div>
              )}

              <div className={styles.taskContent}>
                {/* Filename */}
                <div className={styles.filename} title={task.filename}>
                  {task.filename}
                </div>

                {/* Status text */}
                <div className={styles.status}>
                  {task.status === 'uploading' && `Uploading... ${task.progress || 0}%`}
                  {task.status === 'compressing' && `Compressing... ${task.progress || 0}%`}
                  {task.status === 'complete' && '✓ Complete'}
                  {task.status === 'failed' && `✗ Failed: ${task.error || 'Unknown error'}`}
                </div>

                {/* Progress bar */}
                {(task.status === 'uploading' || task.status === 'compressing') && (
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className={styles.actions}>
                  {task.status === 'uploading' && (
                    <button
                      className={styles.cancelButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (task.type === 'image') {
                          onCancelImage && onCancelImage(task.id)
                        } else {
                          onCancel && onCancel(task.id)
                        }
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  )}
                  {task.status === 'failed' && (
                    <button
                      className={styles.retryButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        task.onRetry && task.onRetry()
                      }}
                      type="button"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}

export default ProgressRibbon
