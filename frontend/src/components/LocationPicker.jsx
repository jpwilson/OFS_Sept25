import { useState } from 'react';
import LocationAutocomplete from './LocationAutocomplete';
import DatePicker from 'react-datepicker';
import styles from './LocationPicker.module.css';

function LocationPicker({ isOpen, onClose, onSelect, eventStartDate, eventEndDate }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [timestamp, setTimestamp] = useState(new Date());

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      return;
    }

    onSelect({
      locationName: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      timestamp: timestamp.toISOString(),
      placeId: selectedLocation.place_id
    });

    // Reset and close
    setSelectedLocation(null);
    setTimestamp(new Date());
    onClose();
  };

  const handleCancel = () => {
    setSelectedLocation(null);
    setTimestamp(new Date());
    onClose();
  };

  if (!isOpen) return null;

  // Parse event dates for validation
  const minDate = eventStartDate ? new Date(eventStartDate) : null;
  const maxDate = eventEndDate ? new Date(eventEndDate) : null;

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Add Location Marker</h3>
          <button className={styles.closeButton} onClick={handleCancel}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.field}>
            <label>Search Location</label>
            <LocationAutocomplete
              onSelect={handleLocationSelect}
              placeholder="Type to search for a location..."
            />
            {selectedLocation && (
              <div className={styles.selectedLocation}>
                ✓ Selected: {selectedLocation.name}
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label>Date & Time</label>
            <DatePicker
              selected={timestamp}
              onChange={(date) => setTimestamp(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={minDate}
              maxDate={maxDate}
              className={styles.datePicker}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={100}
              scrollableYearDropdown
            />
            {minDate && maxDate && (
              <p className={styles.hint}>
                Must be between {minDate.toLocaleDateString()} and {maxDate.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={!selectedLocation}
          >
            Add Location
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationPicker;
