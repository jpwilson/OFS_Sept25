import { useState, useEffect } from 'react'
import styles from './InstallPrompt.module.css'

/**
 * Platform-aware PWA Install Prompt
 *
 * Detects iOS vs Android vs Desktop and shows the appropriate install flow:
 * - Android: Uses native beforeinstallprompt event
 * - iOS: Shows manual instructions (Add to Home Screen via Share button)
 * - Desktop: Uses native beforeinstallprompt event
 * - Already installed or unsupported: Hidden
 */
function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [platform, setPlatform] = useState(null) // 'ios' | 'android' | 'desktop'
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Check if already dismissed this session
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed')
    if (wasDismissed) return

    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return // iOS standalone check

    // Detect platform
    const ua = navigator.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/.test(ua)

    if (isIOS) {
      // iOS: Check if using Safari (PWA only works from Safari on iOS)
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
      if (isSafari) {
        setPlatform('ios')
        // Delay showing to not interrupt initial page load
        setTimeout(() => setShowPrompt(true), 3000)
      }
    } else if (isAndroid) {
      setPlatform('android')
    } else {
      setPlatform('desktop')
    }

    // Listen for the native install prompt (Android & Desktop Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform(prev => prev || 'desktop')
      setTimeout(() => setShowPrompt(true), 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for successful install
    const handleInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (deferredPrompt) {
      setInstalling(true)
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
      setInstalling(false)
    }
  }

  function handleDismiss() {
    setShowPrompt(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt || dismissed) return null

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.iconSection}>
          <img src="/icons/icon-192x192.png" alt="OFS" className={styles.appIcon} />
        </div>
        <div className={styles.textSection}>
          <h3 className={styles.title}>Get the OFS App</h3>

          {platform === 'ios' && (
            <p className={styles.instructions}>
              Tap the <span className={styles.shareIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span> Share button, then <strong>"Add to Home Screen"</strong>
            </p>
          )}

          {platform === 'android' && (
            <p className={styles.instructions}>
              Install Our Family Socials for quick access from your home screen
            </p>
          )}

          {platform === 'desktop' && (
            <p className={styles.instructions}>
              Install for a faster, app-like experience
            </p>
          )}
        </div>

        <div className={styles.actions}>
          {(platform === 'android' || platform === 'desktop') && deferredPrompt && (
            <button
              className={styles.installButton}
              onClick={handleInstallClick}
              disabled={installing}
            >
              {installing ? 'Installing...' : 'Install'}
            </button>
          )}
          <button className={styles.dismissButton} onClick={handleDismiss}>
            {platform === 'ios' ? 'Got it' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default InstallPrompt
