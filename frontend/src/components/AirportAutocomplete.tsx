import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface Airport {
  name: string;
  city: string;
  country: string;
  iata: string;
}

interface AirportAutocompleteProps {
  label: string;
  value: string; // iata code
  onChange: (value: string) => void;
  travelType: 'domestic' | 'international';
  destinationCountry?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({
  label,
  value,
  onChange,
  travelType,
  destinationCountry,
  required = false,
  error = false,
  helperText = '',
}) => {
  const { token } = useAuth();
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [loaded, setLoaded] = useState(false);

  const getCacheKey = () => `airports_${travelType}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Load all airports once per travel type
  const loadAirports = useCallback(async () => {
    const cacheKey = getCacheKey();
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setAllAirports(data);
        setFilteredOptions(data);
        setLoaded(true);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await axios.get<Airport[]>(`${API_BASE_URL}/api/airports`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { travelType },
      });
      const airports = response.data;
      setAllAirports(airports);
      setFilteredOptions(airports);
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: airports, timestamp: Date.now() }));
      setLoaded(true);
    } catch (error) {
      console.error('Error loading airports:', error);
      setAllAirports([]);
      setFilteredOptions([]);
    } finally {
      setLoading(false);
    }
  }, [token, travelType]);

  // Client-side filtering based on current all airports
  const filteredAirports = useMemo(() => {
    if (!inputValue.trim()) {
      return allAirports;
    }

    const query = inputValue.toLowerCase().trim();
    return allAirports.filter(airport => {
      const searchableText = `${airport.name} ${airport.city} ${airport.country} ${airport.iata}`.toLowerCase();
      return searchableText.includes(query);
    }).slice(0, 100); // Limit to 100 results
  }, [allAirports, inputValue]);

  // Debounced backend search
  const searchAirports = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setFilteredOptions(filteredAirports);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await axios.get<Airport[]>(`${API_BASE_URL}/api/airports`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            travelType,
            q: query,
            destinationCountry,
          },
        });
        const searchResults = response.data;
        // Combine local filtered results with backend search results
        const combinedResults = [...filteredAirports, ...searchResults];
        // Remove duplicates based on iata code
        const uniqueResults = combinedResults.filter(
          (airport, index) =>
            index === combinedResults.findIndex(a => a.iata === airport.iata)
        );
        setFilteredOptions(uniqueResults.slice(0, 100));
      } catch (error) {
        // If backend search fails, just use client-side filtering
        setFilteredOptions(filteredAirports);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    [token, travelType, filteredAirports, destinationCountry]
  );

  // Handle input change with immediate local filtering and debounced backend search
  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue);
    // Immediate local filtering
    if (newInputValue.trim() === '') {
      setFilteredOptions(allAirports);
    } else {
      const localFiltered = filteredAirports;
      setFilteredOptions(localFiltered);
    }
    // Debounced backend search
    searchAirports(newInputValue);
  };

  // Handle selection change
  const handleChange = (_event: any, newValue: Airport | null) => {
    setSelectedAirport(newValue);
    onChange(newValue?.iata || '');
  };

  // Handle dropdown open - load airports if not loaded
  const handleOpen = () => {
    if (!loaded) {
      loadAirports();
    }
  };

  // Reset when travel type changes
  React.useEffect(() => {
    setLoaded(false);
    setAllAirports([]);
    setFilteredOptions([]);
    setSelectedAirport(null);
    setInputValue('');
  }, [travelType]);

  // Load initial value if value is present (for editing existing form)
  React.useEffect(() => {
    if (value && allAirports.length > 0 && !selectedAirport) {
      const airport = allAirports.find(a => a.iata === value.toUpperCase());
      if (airport) {
        setSelectedAirport(airport);
        setInputValue(`${airport.name} - ${airport.city}, ${airport.country} (${airport.iata})`);
      }
    }
  }, [value, allAirports, selectedAirport]);

  return (
    <Autocomplete
      sx={{ minWidth: 200, flex: 1 }}
      options={filteredOptions}
      getOptionLabel={(option) => `${option.name} - ${option.city}, ${option.country} (${option.iata})`}
      value={selectedAirport}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      onOpen={handleOpen}
      loading={loading || searchLoading}
      filterOptions={(x) => x} // Disable built-in filtering since we handle it
      freeSolo={false}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          variant="outlined"
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(loading || searchLoading) ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <div>
            <div style={{ fontWeight: 'bold' }}>{option.name}</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              {option.city}, {option.country} - {option.iata}
            </div>
          </div>
        </li>
      )}
    />
  );
};

// Debounce utility
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

export default AirportAutocomplete;
