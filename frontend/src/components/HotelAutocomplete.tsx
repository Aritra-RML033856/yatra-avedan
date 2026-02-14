
import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export interface HotelCity {
  cityCode: string;
  cityName: string;
  stateId?: string;
  stateName?: string;
  countryId?: string;
  countryName?: string;
}

interface HotelAutocompleteProps {
  label: string;
  value: HotelCity | null;
  onChange: (value: HotelCity | null) => void;
  travelType: 'domestic' | 'international';
  destinationCountry?: string; // New prop
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const HotelAutocomplete: React.FC<HotelAutocompleteProps> = ({
  label,
  value,
  onChange,
  travelType,
  destinationCountry, // Destructure
  required = false,
  error = false,
  helperText = '',
}) => {
  const { token } = useAuth();
  const [options, setOptions] = useState<HotelCity[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Debounced backend search
  const searchHotels = useMemo(
    () => debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get<HotelCity[]>(`${API_BASE_URL}/api/locations/hotels`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            travelType,
            q: query,
            destinationCountry, // Pass to API
          },
        });
        setOptions(response.data);
      } catch (error) {
        console.error('Error searching hotels:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [token, travelType, destinationCountry]
  );

  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue);
    searchHotels(newInputValue);
  };

  const handleChange = (_event: any, newValue: HotelCity | null) => {
    onChange(newValue);
  };

  // Reset when travel type changes
  React.useEffect(() => {
    setOptions([]);
    setInputValue('');
    onChange(null);
  }, [travelType, onChange]);

  return (
    <Autocomplete
      sx={{ minWidth: 200, flex: 1 }}
      options={options}
      getOptionLabel={(option) => {
          let label = option.cityName;
          if (option.stateName) label += `, ${option.stateName}`;
          if (option.countryName && option.countryName !== 'India') label += `, ${option.countryName}`;
          return label;
      }}
      value={value}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      isOptionEqualToValue={(option, value) => option.cityCode === value.cityCode}
      loading={loading}
      filterOptions={(x) => x} 
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
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.cityCode}>
          <div>
            <div style={{ fontWeight: 'bold' }}>{option.cityName}</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              {option.stateName ? `${option.stateName}, ` : ''}{option.countryName}
            </div>
          </div>
        </li>
      )}
    />
  );
};

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

export default HotelAutocomplete;
