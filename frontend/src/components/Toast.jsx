import { useState, useEffect, createContext, useContext } from 'react'
import styles from './Toast.module.css'

const ToastContext = createContext()

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    const newToast = { id, message, type, duration }
    setToasts(prev => [...prev, newToast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className={styles.toastContainer}>
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  )
}

function Toast({ id, message, type, onRemove }) {
  const [removing, setRemoving] = useState(false)

  const handleRemove = () => {
    setRemoving(true)
    setTimeout(onRemove, 300)
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }

  const titles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info'
  }

  return (
    <div className={`${styles.toast} ${styles[type]} ${removing ? styles.removing : ''}`}>
      <span className={styles.icon}>{icons[type]}</span>
      <div className={styles.content}>
        <div className={styles.title}>{titles[type]}</div>
        <div className={styles.message}>{message}</div>
      </div>
      <button className={styles.closeButton} onClick={handleRemove}>
        ✕
      </button>
    </div>
  )
}