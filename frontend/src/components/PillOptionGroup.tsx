import React from 'react';
import { ToggleButton, ToggleButtonGroup, FormControl, FormLabel, styled } from '@mui/material';

interface Option {
  value: string;
  label: string;
}

interface PillOptionGroupProps {
  label?: string;
  options: Option[];
  value: string | any;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  gap: '8px',
  flexWrap: 'wrap',
  '& .MuiToggleButton-root': {
    border: `1px solid ${theme.palette.divider} !important`,
    borderRadius: '24px !important',
    padding: '6px 20px',
    color: theme.palette.text.secondary,
    textTransform: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: '#fff',
      borderColor: `${theme.palette.primary.main} !important`,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    },
  },
}));

const PillOptionGroup: React.FC<PillOptionGroupProps> = ({ 
  label, 
  options, 
  value, 
  onChange,
  error,
  helperText 
}) => {
  const handleAlignment = (
    event: React.MouseEvent<HTMLElement>,
    newValue: string | null,
  ) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <FormControl component="fieldset" fullWidth error={error}>
      {label && <FormLabel component="legend" sx={{ mb: 1.5, fontSize: '0.9rem' }}>{label}</FormLabel>}
      <StyledToggleButtonGroup
        value={value}
        exclusive
        onChange={handleAlignment}
        aria-label={label}
      >
        {options.map((option) => (
          <ToggleButton key={option.value} value={option.value} aria-label={option.label}>
            {option.label}
          </ToggleButton>
        ))}
      </StyledToggleButtonGroup>
      {helperText && <FormLabel sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>{helperText}</FormLabel>}
    </FormControl>
  );
};

export default PillOptionGroup;
