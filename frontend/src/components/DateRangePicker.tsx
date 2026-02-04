import React, { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { Box, Button, Stack, Typography, Divider, styled } from '@mui/material';

export type DateRange<T> = [T | null, T | null];

interface DateRangePickerProps {
  value: DateRange<Dayjs>;
  onChange: (newValue: DateRange<Dayjs>) => void;
}

// Custom styled day for range highlighting
const CustomPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) => prop !== 'isRangeStart' && prop !== 'isRangeEnd' && prop !== 'isInRange',
})<{ isRangeStart?: boolean; isRangeEnd?: boolean; isInRange?: boolean }>(
  ({ theme, isRangeStart, isRangeEnd, isInRange }) => ({
    ...(isInRange && {
      borderRadius: 0,
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.primary.light,
      },
    }),
    ...(isRangeStart && {
      borderRadius: '50% 0 0 50%',
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      '&:hover': {
          backgroundColor: theme.palette.primary.dark,
      },
      // If it's both start and end (single day range)
      '&.Mui-selected': {
           borderRadius: '50% 0 0 50%', // Override generic select style if needed
      }
    }),
    ...(isRangeEnd && {
      borderRadius: '0 50% 50% 0',
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
       '&:hover': {
          backgroundColor: theme.palette.primary.dark,
      },
    }),
    ...((isRangeStart && isRangeEnd) && {
        borderRadius: '50%',
    }),
  }),
) as React.ComponentType<PickersDayProps & { isRangeStart?: boolean; isRangeEnd?: boolean; isInRange?: boolean }>;


function DaySlot(props: PickersDayProps & { selectedRange?: DateRange<Dayjs> }) {
  const { day, selectedRange = [null, null], ...other } = props;
  const [start, end] = selectedRange;

  const isStart = start && day.isSame(start, 'day');
  const isEnd = end && day.isSame(end, 'day');
  const isInRange = start && end && ((day.isAfter(start, 'day') && day.isBefore(end, 'day')));

  return (
    <CustomPickersDay
      {...other}
      day={day}
      disableMargin
      isRangeStart={!!isStart}
      isRangeEnd={!!isEnd}
      isInRange={!!isInRange}
      selected={false} // We handle visual selection manually via custom props
    />
  );
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [startDate, endDate] = value;
  // State to track the reference month for the left calendar
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(startDate || dayjs());

  useEffect(() => {
    if (startDate) {
        setCurrentMonth(startDate);
    }
  }, [startDate]);

  const handleDateClick = (newDate: Dayjs | null) => {
    if (!newDate) {
      return;
    }
    let newStart = startDate;
    let newEnd = endDate;

    if (!startDate || (startDate && endDate)) {
        // Start new selection
        newStart = newDate;
        newEnd = null;
    } else if (startDate && !endDate) {
        // Complete the range
        if (newDate.isBefore(startDate)) {
            newStart = newDate;
            newEnd = startDate;
        } else {
            newEnd = newDate;
        }
    }
    onChange([newStart, newEnd]);
  };

  const handleShortcut = (range: DateRange<Dayjs>) => {
    onChange(range);
    if (range[0]) {
        setCurrentMonth(range[0]);
    }
  };

  const handleMonthChange = (newMonth: Dayjs) => {
    setCurrentMonth(newMonth);
  };

  const shortcuts = [
    {
      label: 'Till Date',
      getValue: (): DateRange<Dayjs> => [dayjs('2025-10-01'), dayjs().endOf('day')],
    },
    {
      label: 'This Week',
      getValue: (): DateRange<Dayjs> => [dayjs().day(0), dayjs().day(6).endOf('day')],
    },
    {
      label: 'Last Week',
      getValue: (): DateRange<Dayjs> => [
        dayjs().subtract(1, 'week').day(0),
        dayjs().subtract(1, 'week').day(6).endOf('day'),
      ],
    },
    {
      label: 'Last 7 Days',
      getValue: (): DateRange<Dayjs> => [dayjs().subtract(6, 'day'), dayjs().endOf('day')],
    },
    {
      label: 'Current Month',
      getValue: (): DateRange<Dayjs> => [dayjs().startOf('month'), dayjs().endOf('month')],
    },
    {
      label: 'Last Month',
      getValue: (): DateRange<Dayjs> => [
        dayjs().subtract(1, 'month').date(26),
        dayjs().date(25).endOf('day'),
      ],
    },
    {
      label: 'Reset',
      getValue: (): DateRange<Dayjs> => [null, null],
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Shortcuts Sidebar */}
        <Stack
          direction={{ xs: 'row', md: 'column' }}
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{
            p: 2,
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: 'divider',
            minWidth: { md: 140 },
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
                mb: 1, 
                fontWeight: 'bold',
                width: '100%',
                display: { xs: 'none', md: 'block' } // Hide label on mobile to save space, or keep it? Let's keep it but make it full width
            }}
          >
            SHORTCUTS
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
                width: '100%',
                fontWeight: 'bold',
                display: { xs: 'block', md: 'none' },
                mb: 0.5
            }}
          >
            SHORTCUTS
          </Typography>
          {shortcuts.map((shortcut) => (
            <Button
              key={shortcut.label}
              variant="outlined"
              size="small"
              onClick={() => handleShortcut(shortcut.getValue())}
              sx={{ 
                  justifyContent: { xs: 'center', md: 'flex-start' }, 
                  textAlign: { xs: 'center', md: 'left' },
                  flexGrow: { xs: 1, md: 0 },
                  width: { md: '100%' }
              }}
            >
              {shortcut.label}
            </Button>
          ))}
        </Stack>
        
        {/* Main Content Area */}
<Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    /* prevent the page from showing a horizontal scrollbar */
    overflowX: 'hidden',
  }}
>
  {/* Header */}
  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
    <Typography variant="h6" align="center" color="primary">
      {startDate ? startDate.format('MMM D, YYYY') : 'Start Date'} {' — '}
      {endDate ? endDate.format('MMM D, YYYY') : 'End Date'}
    </Typography>
  </Box>

  {/* Calendars Area */}
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      p: 1,
      gap: 2,
      justifyContent: 'center',
      alignItems: 'stretch',
      width: '100%',
    }}
  >
    {/* Left calendar wrapper - allow shrinking (minWidth: 0) so it won't force overflow */}
    <Box sx={{ flex: '1 1 0', minWidth: 0, maxWidth: { xs: '100%', md: 520 } }}>
      <DateCalendar
        value={null as any}
        referenceDate={currentMonth}
        onMonthChange={handleMonthChange}
        onChange={(newValue) => handleDateClick(newValue as any)}
        views={['day'] as const}
        disableHighlightToday={false}
        showDaysOutsideCurrentMonth
        slots={{ day: DaySlot as any }}
        slotProps={{ day: { selectedRange: value } as any }}
        sx={{ width: '100%' }}
      />
    </Box>

    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

    {/* Right calendar wrapper */}
    <Box sx={{ flex: '1 1 0', minWidth: 0, maxWidth: { xs: '100%', md: 520 } }}>
      <DateCalendar
        value={null as any}
        referenceDate={currentMonth.add(1, 'month')}
        onMonthChange={(newMonth) => handleMonthChange(newMonth.subtract(1, 'month'))}
        onChange={(newValue) => handleDateClick(newValue as any)}
        views={['day'] as const}
        disableHighlightToday={false}
        showDaysOutsideCurrentMonth
        slots={{ day: DaySlot as any }}
        slotProps={{ day: { selectedRange: value } as any }}
        sx={{ width: '100%' }}
      />
    </Box>
  </Box>
</Box>

      </Box>
    </LocalizationProvider>
  );
}
