import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Paper,
  Divider,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  FlightTakeoff,
  Hotel,
  DirectionsCar,
  Train,
  Event,
  AccessTime,
  LocationOn,
  AirlineSeatReclineNormal,
  Restaurant,
  Person
} from '@mui/icons-material';
import dayjs from 'dayjs';

// ----------------------------------------------------------------------

interface ItineraryReviewProps {
  item: {
    type: 'flight' | 'hotel' | 'car' | 'train';
    details: any;
  };
  index: number;
}

const DetailRow: React.FC<{ icon?: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            {icon && <Box sx={{ color: 'text.secondary', mt: 0.3 }}>{icon}</Box>}
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                    {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {value}
                </Typography>
            </Box>
        </Box>
    );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1.5, mt: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: 0.5 }}>
        {title}
    </Typography>
);

const ItineraryReview: React.FC<ItineraryReviewProps> = ({ item, index }) => {
  const theme = useTheme();
  const { type, details } = item;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'flight':
        return { icon: <FlightTakeoff />, color: 'primary', label: 'Flight' };
      case 'hotel':
        return { icon: <Hotel />, color: 'secondary', label: 'Hotel' };
      case 'car':
        return { icon: <DirectionsCar />, color: 'warning', label: 'Car Rental' };
      case 'train':
        return { icon: <Train />, color: 'info', label: 'Train' };
      default:
        return { icon: <FlightTakeoff />, color: 'primary', label: 'Travel' };
    }
  };

  const { icon, color, label } = getTypeConfig(type);
  const mainColor = theme.palette[color as 'primary' | 'secondary' | 'warning' | 'info'].main;

  const formatDate = (dateString: string) => {
      if (!dateString) return '';
      try {
          return dayjs(dateString).format('ddd, MMM D, YYYY');
      } catch (e) {
          return dateString;
      }
  };

  const formatLocation = (loc: any) => {
      if (!loc) return 'N/A';
      if (typeof loc === 'string') return loc;
      // Handle Hotel/Car location object
      if (loc.cityName) return `${loc.cityName}${loc.stateName ? `, ${loc.stateName}` : ''}`;
      return JSON.stringify(loc);
  };

  const formatStation = (stn: any) => {
      if (!stn) return 'N/A';
      if (typeof stn === 'string') return stn;
      // Handle Train station object
      if (stn.stnName && stn.stnCode) return `${stn.stnName} (${stn.stnCode})`;
      return JSON.stringify(stn);
  };

  const renderContent = () => {
      switch (type) {
          case 'flight':
              return (
                  <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                          <SectionHeader title="Journey" />
                          <Stack spacing={2}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                   <Box>
                                        <Typography variant="h6">{details.departFrom}</Typography>
                                        <Typography variant="caption" color="text.secondary">Origin</Typography>
                                   </Box>
                                   <FlightTakeoff sx={{ color: 'text.disabled' }} />
                                   <Box>
                                        <Typography variant="h6">{details.arriveAt}</Typography>
                                        <Typography variant="caption" color="text.secondary">Destination</Typography>
                                   </Box>
                              </Box>
                              <DetailRow icon={<Event fontSize="small" />} label="Departure" value={`${formatDate(details.departureDate)} at ${details.departTime}`} />
                              {details.tripType === 'roundtrip' && (
                                  <DetailRow icon={<Event fontSize="small" />} label="Return" value={`${formatDate(details.returnDate)} at ${details.returnTime}`} />
                              )}
                          </Stack>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                          <SectionHeader title="Preferences" />
                          <Grid container spacing={2}>
                              <Grid size={{ xs: 6 }}>
                                  <DetailRow icon={<AirlineSeatReclineNormal fontSize="small" />} label="Seat" value={details.seatPreference} />
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                  <DetailRow icon={<Restaurant fontSize="small" />} label="Meal" value={details.mealPreference} />
                              </Grid>
                          </Grid>
                          {details.description && (
                              <Box sx={{ mt: 2 }}>
                                <SectionHeader title="Special Requests" />
                                <Typography variant="body2">{details.description}</Typography>
                              </Box>
                          )}
                      </Grid>
                  </Grid>
              );

          case 'hotel':
              return (
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <SectionHeader title="Stay Details" />
                        <Stack spacing={1}>
                            <DetailRow icon={<LocationOn fontSize="small" />} label="Location" value={formatLocation(details.location)} />
                            <Box sx={{ display: 'flex', gap: 3 }}>
                                <DetailRow icon={<Event fontSize="small" />} label="Check-in" value={`${formatDate(details.checkinDate)} ${details.checkinTime}`} />
                                <DetailRow icon={<Event fontSize="small" />} label="Check-out" value={`${formatDate(details.checkoutDate)} ${details.checkoutTime}`} />
                            </Box>
                        </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <SectionHeader title="Preferences" />
                        <Stack spacing={1}>
                             <DetailRow 
                                icon={<Restaurant fontSize="small" />} 
                                label="Meals Included" 
                                value={
                                    details.mealType && details.mealType.length > 0 
                                    ? <Stack direction="row" spacing={0.5} flexWrap="wrap">{details.mealType.map((m: string) => <Chip key={m} label={m} size="small" variant="outlined" />)}</Stack> 
                                    : 'None'
                                } 
                             />
                             <DetailRow label="Dietary Preference" value={details.mealPreference} />
                        </Stack>
                        {details.description && (
                            <Box sx={{ mt: 2 }}>
                                <SectionHeader title="Special Requests" />
                                <Typography variant="body2">{details.description}</Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>
              );

          case 'car':
              return (
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <SectionHeader title="Rental Details" />
                        <Stack spacing={1}>
                            <DetailRow icon={<LocationOn fontSize="small" />} label="Pickup" value={formatLocation(details.pickupLocation)} />
                            <DetailRow icon={<LocationOn fontSize="small" />} label="Dropoff" value={formatLocation(details.dropoffLocation)} />
                            <DetailRow icon={<Event fontSize="small" />} label="Date & Time" value={`${formatDate(details.pickupDate)} ${details.pickupTime}`} />
                        </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <SectionHeader title="Vehicle Info" />
                        <Grid container spacing={2}>
                             <Grid size={{ xs: 6 }}>
                                 <DetailRow icon={<DirectionsCar fontSize="small" />} label="Car Type" value={details.carType} />
                             </Grid>
                             <Grid size={{ xs: 6 }}>
                                 <DetailRow icon={<Person fontSize="small" />} label="Driver" value={details.driverNeeded ? 'Yes' : 'No'} />
                             </Grid>
                        </Grid>
                        {details.description && (
                            <Box sx={{ mt: 2 }}>
                                <SectionHeader title="Special Requests" />
                                <Typography variant="body2">{details.description}</Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>
              );

          case 'train':
                return (
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <SectionHeader title="Journey" />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Box>
                                    <Typography variant="h6">{formatStation(details.departFrom)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Origin</Typography>
                                </Box>
                                <Train sx={{ color: 'text.disabled' }} />
                                <Box>
                                    <Typography variant="h6">{formatStation(details.arriveAt)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Destination</Typography>
                                </Box>
                            </Box>
                            <DetailRow icon={<Event fontSize="small" />} label="Departure Date" value={formatDate(details.departureDate)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <SectionHeader title="Preferences" />
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <DetailRow label="Class" value={details.classPreference} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <DetailRow label="Berth" value={details.berthPreference} />
                                </Grid>
                            </Grid>
                             {details.description && (
                                <Box sx={{ mt: 2 }}>
                                    <SectionHeader title="Special Requests" />
                                    <Typography variant="body2">{details.description}</Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                );

          default:
              return <Typography variant="body2">No details available.</Typography>;
      }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 0,
        mb: 3,
        overflow: 'hidden',
        borderColor: alpha(mainColor, 0.2),
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: alpha(mainColor, 0.08),
          borderBottom: `1px solid ${alpha(mainColor, 0.1)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <Box sx={{ color: mainColor, display: 'flex' }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ color: mainColor, fontWeight: 'bold' }}>
            {label} #{index + 1}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {item.type === 'flight' && (
             <Chip label={details.tripType === 'roundtrip' ? 'Round Trip' : 'One Way'} size="small" color="primary" variant="outlined" sx={{ height: 24 }} />
        )}
      </Box>
      <Box sx={{ p: 3 }}>
        {renderContent()}
      </Box>
    </Paper>
  );
};

export default ItineraryReview;
