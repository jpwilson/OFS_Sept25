import { useState } from 'react'
import styles from './ProgressRibbon.module.css'

/**
 * Progress ribbon that shows video upload/compression status
 * Displays in top-right corner, non-blocking, allows user to continue editing
 */
function ProgressRibbon({ videoTasks = [], onCancel }) {
  const [isMinimized, setIsMinimized] = useState(false)

  if (videoTasks.length === 0) return null

  // Count only videos that are actively being processed
  const activeVideos = videoTasks.filter(
    task => task.status === 'uploading' || task.status === 'compressing'
  )
  const allComplete = videoTasks.every(task => task.status === 'complete')
  const anyFailed = videoTasks.some(task => task.status === 'failed')

  return (
    <div className={`${styles.ribbon} ${isMinimized ? styles.minimized : ''}`}>
      <div className={styles.header}>
        <div className={styles.title}>
          {allComplete ? '✅ Videos Ready' : '📹 Processing Videos'}
          {activeVideos.length > 1 && ` (${activeVideos.length})`}
        </div>
        <div className={styles.headerButtons}>
          <button
            className={styles.minimizeButton}
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          {allComplete && (
            <button
              className={styles.closeButton}
              onClick={() => onCancel && onCancel('all')}
              title="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* User guidance message */}
          {activeVideos.length > 0 && (
            <div className={styles.guidanceMessage}>
              💡 You can continue editing your event while videos process. Publishing will be available once compression completes.
            </div>
          )}

          <div className={styles.taskList}>
            {videoTasks.map((task) => (
            <div key={task.id} className={styles.task}>
              {/* Thumbnail preview */}
              {task.thumbnailUrl && (
                <div className={styles.thumbnail}>
                  <img src={task.thumbnailUrl} alt="Video thumbnail" />
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
                      onClick={() => onCancel && onCancel(task.id)}
                    >
                      Cancel
                    </button>
                  )}
                  {task.status === 'failed' && (
                    <button
                      className={styles.retryButton}
                      onClick={() => task.onRetry && task.onRetry()}
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
