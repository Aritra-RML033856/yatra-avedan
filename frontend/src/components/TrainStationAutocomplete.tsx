
import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export interface TrainStation {
  stnCode: string;
  stnName: string;
  stnCity?: string;
}

interface TrainStationAutocompleteProps {
  label: string;
  value: TrainStation | null;
  onChange: (value: TrainStation | null) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const TrainStationAutocomplete: React.FC<TrainStationAutocompleteProps> = ({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText = '',
}) => {
  const { token } = useAuth();
  const [options, setOptions] = useState<TrainStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const searchStations = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get<TrainStation[]>(`${API_BASE_URL}/api/locations/trains`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: query },
        });
        setOptions(response.data);
      } catch (error) {
        console.error('Error searching train stations:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [token]
  );

  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue);
    searchStations(newInputValue);
  };

  const handleChange = (_event: any, newValue: TrainStation | null) => {
    onChange(newValue);
  };

  return (
    <Autocomplete
      sx={{ minWidth: 200, flex: 1 }}
      options={options}
      getOptionLabel={(option) => `${option.stnName} (${option.stnCode})`}
      value={value}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      isOptionEqualToValue={(option, value) => option.stnCode === value.stnCode}
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
        <li {...props} key={option.stnCode}>
          <div>
            <div style={{ fontWeight: 'bold' }}>{option.stnName}</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
               {option.stnCode} {option.stnCity ? `- ${option.stnCity}` : ''}
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

export default TrainStationAutocomplete;
