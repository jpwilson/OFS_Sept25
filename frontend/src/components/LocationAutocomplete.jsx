import { useState, useEffect, useRef } from 'react';
import styles from './LocationAutocomplete.module.css';

const LocationAutocomplete = ({ onSelect, placeholder = "Search for a location..." }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/v1/geocoding/search?query=${encodeURIComponent(query)}&limit=5`
        );

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching locations:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleSelect = (location) => {
    setQuery(location.name);
    setShowResults(false);
    onSelect({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      type: location.type,
      address: location.address
    });
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  return (
    <div className={styles.autocomplete} ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={styles.input}
        autoComplete="off"
      />

      {isLoading && (
        <div className={styles.loading}>Searching...</div>
      )}

      {showResults && results.length > 0 && (
        <ul className={styles.results}>
          {results.map((result) => (
            <li
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className={styles.resultItem}
            >
              <div className={styles.resultName}>{result.name}</div>
              <div className={styles.resultType}>{result.type}</div>
            </li>
          ))}
        </ul>
      )}

      {showResults && results.length === 0 && !isLoading && query.length >= 2 && (
        <div className={styles.noResults}>No locations found</div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
