
import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export interface CarCity {
  cityCode: string;
  cityName: string;
  stateId?: string;
  stateName?: string;
}

interface CarCityAutocompleteProps {
  label: string;
  value: CarCity | null;
  onChange: (value: CarCity | null) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const CarCityAutocomplete: React.FC<CarCityAutocompleteProps> = ({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText = '',
}) => {
  const { token } = useAuth();
  const [options, setOptions] = useState<CarCity[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const searchCities = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get<CarCity[]>(`${API_BASE_URL}/api/locations/cars`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: query },
        });
        setOptions(response.data);
      } catch (error) {
        console.error('Error searching car cities:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [token]
  );

  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue);
    searchCities(newInputValue);
  };

  const handleChange = (_event: any, newValue: CarCity | null) => {
    onChange(newValue);
  };

  return (
    <Autocomplete
      sx={{ minWidth: 200, flex: 1 }}
      options={options}
      getOptionLabel={(option) => `${option.cityName}, ${option.stateName}`}
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
            <div style={{ fontSize: '0.8em', color: '#666' }}>{option.stateName}</div>
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

export default CarCityAutocomplete;
