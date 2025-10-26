import { createContext, useContext, useState } from 'react'
import styles from './ConfirmModal.module.css'

const ConfirmContext = createContext()

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    danger: false
  })

  const confirm = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) => {
    return new Promise((resolve) => {
      setConfig({
        title,
        message,
        confirmText,
        cancelText,
        danger,
        onConfirm: (result) => {
          setIsOpen(false)
          resolve(result)
        }
      })
      setIsOpen(true)
    })
  }

  const handleConfirm = () => {
    config.onConfirm(true)
  }

  const handleCancel = () => {
    config.onConfirm(false)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className={styles.overlay} onClick={handleCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {config.title && <h3 className={styles.title}>{config.title}</h3>}
            <p className={styles.message}>{config.message}</p>
            <div className={styles.actions}>
              <button
                className={styles.cancelButton}
                onClick={handleCancel}
              >
                {config.cancelText}
              </button>
              <button
                className={`${styles.confirmButton} ${config.danger ? styles.danger : ''}`}
                onClick={handleConfirm}
              >
                {config.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
