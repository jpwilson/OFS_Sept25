import { useState } from 'react';
import styles from './GPSExtractionModal.module.css';

function GPSExtractionModal({ isOpen, onClose, onEnable }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleEnable = () => {
    if (dontShowAgain) {
      localStorage.setItem('gpsExtractionPreference', 'enabled');
      localStorage.setItem('gpsExtractionModalDismissed', 'true');
    }
    onEnable(true);
    onClose();
  };

  const handleCancel = () => {
    if (dontShowAgain) {
      localStorage.setItem('gpsExtractionPreference', 'disabled');
      localStorage.setItem('gpsExtractionModalDismissed', 'true');
    }
    onEnable(false);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>GPS Location Extraction</h2>

        <p className={styles.description}>
          Do you want to automatically extract GPS coordinates and timestamps from photos you upload?
        </p>

        <div className={styles.infoBox}>
          <div className={styles.infoIcon}>ℹ️</div>
          <div>
            <p className={styles.infoTitle}>How it works:</p>
            <ul className={styles.infoList}>
              <li>Location data is extracted from photo metadata (EXIF)</li>
              <li>Locations appear as markers on your journey map</li>
              <li>Not all photos have GPS data (screenshots, edited images, etc.)</li>
              <li>You can always add locations manually using the pin button</li>
            </ul>
          </div>
        </div>

        <div className={styles.checkboxContainer}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Don't show this again</span>
          </label>
        </div>

        <div className={styles.actions}>
          <button onClick={handleCancel} className={styles.cancelButton}>
            No, I'll Add Locations Manually
          </button>
          <button onClick={handleEnable} className={styles.enableButton}>
            Yes, Extract GPS Data
          </button>
        </div>
      </div>
    </div>
  );
}

export default GPSExtractionModal;
