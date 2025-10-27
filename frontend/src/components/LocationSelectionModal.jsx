import { useState, useEffect } from 'react';
import styles from './LocationSelectionModal.module.css';

function LocationSelectionModal({ isOpen, onClose, locations, onConfirm }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const MAX_LOCATIONS = 20;

  // Reset selection when modal opens with new locations
  useEffect(() => {
    if (isOpen) {
      // Auto-select first 20 locations
      const initialSelection = new Set(
        locations.slice(0, MAX_LOCATIONS).map(loc => loc.id)
      );
      setSelectedIds(initialSelection);
    }
  }, [isOpen, locations]);

  const handleToggle = (locationId) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(locationId)) {
      newSelection.delete(locationId);
    } else {
      if (newSelection.size < MAX_LOCATIONS) {
        newSelection.add(locationId);
      }
    }
    setSelectedIds(newSelection);
  };

  const handleConfirm = () => {
    const selectedLocations = locations.filter(loc => selectedIds.has(loc.id));
    onConfirm(selectedLocations);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const isValid = selectedCount <= MAX_LOCATIONS && selectedCount > 0;

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Select Locations (Max {MAX_LOCATIONS})</h3>
          <button className={styles.closeButton} onClick={handleCancel}>×</button>
        </div>

        <div className={styles.counter}>
          <span className={selectedCount > MAX_LOCATIONS ? styles.overLimit : styles.withinLimit}>
            {selectedCount} of {MAX_LOCATIONS} selected
          </span>
        </div>

        <div className={styles.content}>
          <p className={styles.instructions}>
            Your event has {locations.length} locations. Please select up to {MAX_LOCATIONS} to include in your journey map.
          </p>

          <div className={styles.locationList}>
            {locations.map((location) => {
              const isSelected = selectedIds.has(location.id);
              const isDisabled = !isSelected && selectedIds.size >= MAX_LOCATIONS;

              return (
                <div
                  key={location.id}
                  className={`${styles.locationItem} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
                  onClick={() => !isDisabled && handleToggle(location.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(location.id)}
                    disabled={isDisabled}
                    className={styles.checkbox}
                  />
                  <div className={styles.locationInfo}>
                    <div className={styles.locationName}>
                      📍 {location.locationName || location.name || 'Unknown Location'}
                    </div>
                    <div className={styles.locationMeta}>
                      {location.timestamp && (
                        <span className={styles.timestamp}>
                          {new Date(location.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                      {location.source && (
                        <span className={styles.source}>
                          {location.source === 'image' ? '📷 From Image' : '✏️ Manual Pin'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Confirm Selection ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationSelectionModal;
