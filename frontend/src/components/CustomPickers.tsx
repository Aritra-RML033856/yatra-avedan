import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField, Autocomplete } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';

// ----------------------------------------------------------------------

interface CustomDatePickerProps {
    label: string;
    value: string | null;
    onChange: (date: string | null) => void;
    minDate?: Dayjs;
    required?: boolean;
    error?: boolean;
    helperText?: string;
    sx?: any;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
    label, 
    value, 
    onChange, 
    minDate,
    required = false,
    error = false,
    helperText = '',
    sx 
}) => {
    return (
        <DatePicker
            label={label}
            value={value ? dayjs(value) : null}
            onChange={(newValue) => {
                onChange(newValue ? newValue.format('YYYY-MM-DD') : null);
            }}
            format="DD-MM-YYYY"
            minDate={minDate}
            slotProps={{
                textField: {
                    fullWidth: true,
                    required: required,
                    error: error,
                    helperText: helperText,
                    sx: sx,
                    InputLabelProps: { shrink: true } // Ensure label doesn't overlap
                }
            }}
        />
    );
};

// ----------------------------------------------------------------------

const TIME_SLOTS = (() => {
    const times = [];
    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 30) {
            const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
            const ampm = i < 12 ? 'AM' : 'PM';
            const minute = j === 0 ? '00' : '30';
            const value = `${i.toString().padStart(2, '0')}:${j.toString().padStart(2, '0')}`;
            const label = `${hour}:${minute} ${ampm}`;
            times.push({ value, label });
        }
    }
    return times;
})();

interface TimeSelectProps {
    label?: string;
    value: string;
    onChange: (time: string) => void;
    required?: boolean;
    error?: boolean;
    helperText?: string;
}

export const TimeSelect: React.FC<TimeSelectProps> = ({ 
    label = "Select Time", 
    value, 
    onChange, 
    required = false,
    error = false,
    helperText = ''
}) => {
    const selectedOption = TIME_SLOTS.find(t => t.value === value) || null;

    return (
        <Autocomplete
            options={TIME_SLOTS}
            getOptionLabel={(option) => option.label}
            value={selectedOption}
            onChange={(_, newValue) => {
                onChange(newValue ? newValue.value : '');
            }}
            renderInput={(params) => (
                <TextField 
                    {...params} 
                    label={label} 
                    required={required}
                    error={error}
                    helperText={helperText}
                    fullWidth 
                />
            )}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            disableClearable={required && !!value} // Prevent clearing if required and has value
        />
    );
};
