import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Container,
  Typography,
  Paper,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  Button,
  Box,
  Card,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  useTheme,
  Alert,
  Stack
} from '@mui/material';
import { FlightTakeoff, Hotel, Train } from '@mui/icons-material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AirportAutocomplete from '../components/AirportAutocomplete';
import FormStep from '../components/FormStep';
import ItineraryCard from '../components/ItineraryCard';
import { PageTransition, AnimatedButton, StaggerContainer } from '../components/AnimatedComponents';
import { CustomDatePicker, TimeSelect } from '../components/CustomPickers';
import { toast, Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import ItineraryReview from '../components/ItineraryReview';
import PillOptionGroup from '../components/PillOptionGroup';
import HotelAutocomplete from '../components/HotelAutocomplete';
import CarCityAutocomplete from '../components/CarCityAutocomplete';
import TrainStationAutocomplete from '../components/TrainStationAutocomplete';

// ----------------------------------------------------------------------

interface ItineraryItem {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'train';
  details: any;
}

const NewRequest: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Form State
  const [activeStep, setActiveStep] = useState(0);
  const [tripName, setTripName] = useState('');
  const [travelType, setTravelType] = useState<'Domestic' | 'International'>('Domestic');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [visaRequired, setVisaRequired] = useState<boolean | ''>('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationTriggered, setValidationTriggered] = useState(false);

  // Data State
  const [countries, setCountries] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  // Visa Dialog State
  const [visaDialogOpen, setVisaDialogOpen] = useState(false);
  const [visaCountry, setVisaCountry] = useState('');
  const [visaDate, setVisaDate] = useState('');
  const [visaPurpose, setVisaPurpose] = useState('');
  
  const bottomRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when a new item is added to ensure visibility
    if (itineraries.length > 0) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [itineraries.length]);

  // ----------------------------------------------------------------------

  // Lazy fetch countries data
  const fetchCountries = async () => {
    if (countries.length > 0) return;

    setCountriesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/countries`);
      const countryNames = response.data.map((country: { name: string; code: string }) => country.name);
      setCountries(countryNames);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      toast.error('Failed to load country list');
    } finally {
      setCountriesLoading(false);
    }
  };

  // ----------------------------------------------------------------------

  const addItinerary = (type: 'flight' | 'hotel' | 'car' | 'train') => {
    // For international travel, require destination country before adding flights
    if (type === 'flight' && travelType === 'International' && !destinationCountry) {
      toast.error('Please select a destination country first');
      return;
    }
    // Append new item to the bottom (standard logical order)
    const newItem: ItineraryItem = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        details: {}
    };
    setItineraries(prev => [...prev, newItem]);
    toast.success(`Added new ${type} item`);
  };

  const updateItinerary = (index: number, key: string, value: any) => {
    setItineraries(prev => prev.map((item, i) =>
      i === index
        ? { ...item, details: { ...item.details, [key]: value } }
        : item
    ));
  };

  const removeItinerary = (index: number) => {
    setItineraries(prev => prev.filter((_, i) => i !== index));
    toast.success('Removed itinerary item');
  };

  // ----------------------------------------------------------------------

  const handleVisaSubmit = async () => {
    setValidationTriggered(true);
    if (!visaCountry || !visaDate || !visaPurpose) {
      toast.error('Please fill all required fields');
      return;
    }

    const tripData = {
      tripName: `Visa Request - ${visaCountry}`,
      travelType: 'International',
      destinationCountry: visaCountry,
      visaRequired: true,
      businessPurpose: visaPurpose,
      itineraries: [], 
      isVisaRequest: true,
      expectedJourneyDate: visaDate
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/trips/create`, tripData);
      toast.success(`Visa Request submitted! Ref: ${response.data.data.referenceNo}`);
      setVisaDialogOpen(false);
      setVisaCountry('');
      setVisaDate('');
      setVisaPurpose('');
    } catch (err: any) {
      toast.error('Error submitting visa request: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSubmit = async (intent: 'save' | 'mmt_redirect') => {
    setValidationTriggered(true);
    if (!tripName || itineraries.length === 0) {
      toast.error('Please fill all required fields and add at least one itinerary');
      return;
    }

    if (travelType === 'International' && (!destinationCountry || visaRequired === '')) {
      toast.error('Please complete international travel details');
      return;
    }

    setIsSubmitting(true);
    const tripData = {
      tripName,
      travelType,
      destinationCountry: travelType === 'International' ? destinationCountry : '',
      visaRequired: travelType === 'International' ? (visaRequired === true) : false,
      businessPurpose,
      itineraries,
      intent
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/trips/create`, tripData);
      
      const referenceNo = response.data.data.referenceNo;
      const tripId = response.data.data.tripId;
      
      if (intent === 'mmt_redirect') {
          toast.success(`Redirecting to MMT Portal... (Ref: ${referenceNo})`);
          
          // Construct the context payload based on trip itineraries
          const context = itineraries.map(it => {
            const details = it.details;
            let contextItem: any = { type: it.type };

            if (it.type === 'flight') {
              contextItem = {
                ...contextItem,
                tripType: details.tripType,
                departFrom: details.departFrom,
                arriveAt: details.arriveAt,
                departureDate: details.departureDate,
                returnDate: details.returnDate,
                classPreference: details.classPreference,
                seatPreference: details.seatPreference,
                mealPreference: details.mealPreference
              };
            } else if (it.type === 'hotel') {
              contextItem = {
                ...contextItem,
                location: details.location?.cityName || details.location,
                checkinDate: details.checkinDate,
                checkinTime: details.checkinTime,
                checkoutDate: details.checkoutDate,
                checkoutTime: details.checkoutTime
              };
            } else if (it.type === 'car') {
              contextItem = {
                ...contextItem,
                pickupLocation: details.pickupLocation?.cityName || details.pickupLocation,
                dropoffLocation: details.dropoffLocation?.cityName || details.dropoffLocation,
                pickupDate: details.pickupDate,
                pickupTime: details.pickupTime,
                carType: details.carType,
                fuelType: details.fuelType
              };
            } else if (it.type === 'train') {
              contextItem = {
                ...contextItem,
                departFrom: details.departFrom?.stnCode || details.departFrom,
                arriveAt: details.arriveAt?.stnCode || details.arriveAt,
                departureDate: details.departureDate,
                classPreference: details.classPreference
              };
            }
            return contextItem;
          });

          // Serialize context
          const contextStr = encodeURIComponent(JSON.stringify(context));
          
          // Construct URL
          const baseUrl = `${window.location.protocol}//${window.location.hostname}`;
          const mmtUrl = `${baseUrl}:4000/?trip_id=${tripId}&redirect_url=${baseUrl}:3000/mmt-callback&emp_id=${user?.userid || 'EMP001'}&rm=false&ta=false&context=${contextStr}`;
          
          setTimeout(() => {
              window.open(mmtUrl, '_blank');
              navigate('/my-trips');
          }, 1000);
      } else {
          toast.success(`Trip Request Saved! Ref: ${referenceNo}`);
          navigate('/my-trips');
      }

      // Reset form (though navigation happens)
      setTripName('');
      setTravelType('Domestic');
      setDestinationCountry('');
      setVisaRequired('');
      setBusinessPurpose('');
      setItineraries([]);
      setActiveStep(0);
      setValidationTriggered(false);
    } catch (err: any) {
      toast.error('Error creating trip: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------

  // Step Validation Logic
  const isStepValid = () => {
    if (activeStep === 0) {
        if (!tripName) return false;
        if (travelType === 'International' && (!destinationCountry || visaRequired === '')) return false;
        return true;
    }
    if (activeStep === 1) {
        if (itineraries.length === 0) return false;
        
        // Validate each item
        for (const item of itineraries) {
            if (!item.details) return false;
            
            if (item.type === 'flight') {
                if (!item.details.departFrom || !item.details.arriveAt || !item.details.departureDate || !item.details.departTime) return false;
                if (item.details.tripType === 'roundtrip' && (!item.details.returnDate || !item.details.returnTime)) return false;
            } else if (item.type === 'hotel') {
                if (!item.details.location || !item.details.checkinDate || !item.details.checkinTime || !item.details.checkoutDate || !item.details.checkoutTime) return false;
            } else if (item.type === 'car') {
                if (!item.details.pickupLocation || !item.details.dropoffLocation || !item.details.pickupDate || !item.details.pickupTime) return false;
            } else if (item.type === 'train') {
                if (!item.details.departFrom || !item.details.arriveAt || !item.details.departureDate) return false;
            }
        }
        return true;
    }
    return true;
  };

  const handleNext = () => {
    setValidationTriggered(true);
    if (!isStepValid()) {
        toast.error('Please fill all required fields before proceeding');
        return;
    }

    if (activeStep === 2) {
        // Validation only - Submit is handled by buttons directly now
        // But if this function is called (e.g. by Enter key?), default to save
        // Actually, we should probably remove handleSubmit call here and let buttons call specific intents
        // But for compatibility with FormStep's onNext which might call this...
        // FormStep might render the Next button as "Finish" on last step.
        // We need to check FormStep implementation. 
        // Assuming we will override the buttons in STEP 2 block below.
        // Just return here to avoid double submit if FormStep has its own button
    } else {
        setValidationTriggered(false);
        setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear the fields for this step?')) {
        if (activeStep === 0) {
            setTripName('');
            setTravelType('Domestic');
            setDestinationCountry('');
            setVisaRequired('');
            setBusinessPurpose('');
        } else if (activeStep === 1) {
            setItineraries([]);
        }
        // No clear action for Step 2 (Review)
        setValidationTriggered(false);
        toast.success('Current step cleared');
    }
  };

  // ----------------------------------------------------------------------

  if (!user) return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h6" color="textSecondary">
        Please login to access this page.
      </Typography>
    </Container>
  );

  const steps = ['Trip Details', 'Itinerary', 'Review'];

  return (
    <PageTransition>
      <Toaster position="top-right" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
              New Trip Request
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Plan your travel details and submit for approval
            </Typography>
          </Box>
          <AnimatedButton 
            variant="contained" 
            color="secondary" 
            onClick={() => setVisaDialogOpen(true)}
            startIcon={<AssignmentIcon />}
            sx={{ px: 3, py: 1, borderRadius: 2 }}
          >
            Visa Only Request
          </AnimatedButton>
        </Box>

        {/* Main Form Stepper */}
        <FormStep
          steps={steps}
          activeStep={activeStep}
          onBack={handleBack}
          onClear={handleClearAll}
          onNext={handleNext}
          isLastStep={activeStep === steps.length - 1}
          isValid={isStepValid()}
          isSubmitting={isSubmitting}
          hideButtons={activeStep === 2}
        >
          {/* STEP 0: Trip Details */}
          {activeStep === 0 && (
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, height: '100%', bgcolor: 'primary.lighter', color: 'primary.darker' }}>
                        <Typography variant="h6" gutterBottom>Traveler Info</Typography>
                        <Stack spacing={2}>
                            <TextField label="Name" value={user.username} InputProps={{ readOnly: true }} variant="standard" fullWidth />
                            <TextField label="ID" value={user.userid} InputProps={{ readOnly: true }} variant="standard" fullWidth />
                            <TextField label="Designation" value={user.designation} InputProps={{ readOnly: true }} variant="standard" fullWidth />
                            <TextField label="Department" value={user.department} InputProps={{ readOnly: true }} variant="standard" fullWidth />
                        </Stack>
                    </Paper>
                </Grid>
                
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3 }}>
                       <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Trip Name"
                                    value={tripName}
                                    onChange={(e) => setTripName(e.target.value)}
                                    required
                                    placeholder="e.g., Q3 Client Meeting in London"
                                    variant="outlined"
                                    error={validationTriggered && !tripName}
                                    helperText={validationTriggered && !tripName ? "Trip Name is required" : ""}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <FormControl component="fieldset">
                                    <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>Travel Type</FormLabel>
                                    <RadioGroup
                                    row
                                    value={travelType}
                                    onChange={(e) => setTravelType(e.target.value as 'Domestic' | 'International')}
                                    >
                                        <Card variant="outlined" sx={{ mr: 2, mb: 1, border: travelType === 'Domestic' ? `2px solid ${theme.palette.primary.main}` : '1px solid #ddd' }}>
                                            <FormControlLabel 
                                                value="Domestic" 
                                                control={<Radio />} 
                                                label="Domestic" 
                                                sx={{ m: 0, px: 2, py: 1 }}
                                            />
                                        </Card>
                                        <Card variant="outlined" sx={{ mb: 1, border: travelType === 'International' ? `2px solid ${theme.palette.primary.main}` : '1px solid #ddd' }}>
                                            <FormControlLabel 
                                                value="International" 
                                                control={<Radio />} 
                                                label="International" 
                                                sx={{ m: 0, px: 2, py: 1 }}
                                            />
                                        </Card>
                                    </RadioGroup>
                                </FormControl>
                            </Grid>

                            {travelType === 'International' && (
                                <Grid size={{ xs: 12 }} container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Autocomplete
                                            options={countries}
                                            value={destinationCountry}
                                            onChange={(_, newValue) => setDestinationCountry(newValue || '')}
                                            onOpen={fetchCountries}
                                            loading={countriesLoading}
                                            renderInput={(params) => (
                                            <TextField 
                                                {...params} 
                                                label="Destination Country" 
                                                required 
                                                variant="outlined" 
                                                error={validationTriggered && !destinationCountry}
                                                helperText={validationTriggered && !destinationCountry ? "Required" : ""}
                                            />
                                            )}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControl component="fieldset" error={validationTriggered && visaRequired === ''}>
                                            <FormLabel component="legend" required>Visa Required?</FormLabel>
                                            <RadioGroup
                                            row
                                            value={visaRequired}
                                            onChange={(e) => setVisaRequired(e.target.value === 'true')}
                                            >
                                            <FormControlLabel value={true} control={<Radio />} label="Yes" />
                                            <FormControlLabel value={false} control={<Radio />} label="No" />
                                            </RadioGroup>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            )}

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Business Purpose"
                                    value={businessPurpose}
                                    onChange={(e) => setBusinessPurpose(e.target.value)}
                                    multiline
                                    rows={4}
                                    placeholder="Describe the purpose of your trip..."
                                    inputProps={{ maxLength: 250 }}
                                    helperText={`${businessPurpose.length}/250 characters`}
                                />
                            </Grid>
                       </Grid>
                    </Paper>
                </Grid>
            </Grid>
          )}

          {/* STEP 1: Itinerary Builder */}
          {activeStep === 1 && (
            <Box>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {[
                        { type: 'flight', icon: <FlightTakeoff />, label: 'Add Flight', color: 'primary' },
                        { type: 'hotel', icon: <Hotel />, label: 'Add Hotel', color: 'secondary' },
                        // { type: 'car', icon: <DirectionsCar />, label: 'Add Car', color: 'warning' },
                        { type: 'train', icon: <Train />, label: 'Add Train', color: 'info' },
                    ].map((btn) => (
                        <Grid size={{ xs: 6, md: 4 }} key={btn.type}>
                            <AnimatedButton
                                fullWidth
                                variant="outlined"
                                color={btn.color as any}
                                startIcon={btn.icon}
                                onClick={() => addItinerary(btn.type as any)}
                                sx={{ py: 2, height: '100%', borderStyle: 'dashed', borderWidth: 2 }}
                            >
                                {btn.label}
                            </AnimatedButton>
                        </Grid>
                    ))}
                </Grid>

                {itineraries.length === 0 ? (
                    <Paper 
                        sx={{ 
                            p: 6, 
                            textAlign: 'center', 
                            bgcolor: 'background.neutral', 
                            borderStyle: 'dashed', 
                            borderColor: 'text.disabled',
                        }}
                    >
                        <AssignmentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">No itinerary items yet</Typography>
                        <Typography variant="body2" color="text.secondary">Select an option above to start building your trip.</Typography>
                    </Paper>
                ) : (
                    <StaggerContainer key={`itineraries-${itineraries.length}`}>
                        {itineraries.map((item, index) => (
                            <ItineraryCard
                                key={item.id}
                                item={item}
                                index={index}
                                onRemove={() => removeItinerary(index)}
                            >
                                {item.type === 'flight' && (
                                    <FlightItineraryForm
                                        item={item}
                                        index={index}
                                        onUpdate={updateItinerary}
                                        travelType={travelType.toLowerCase() as 'domestic' | 'international'}
                                        destinationCountry={destinationCountry}
                                        validationTriggered={validationTriggered}
                                    />
                                )}
                                {item.type === 'hotel' && (
                                    <HotelItineraryForm 
                                        item={item} 
                                        index={index} 
                                        onUpdate={updateItinerary} 
                                        validationTriggered={validationTriggered} 
                                        travelType={travelType.toLowerCase() as 'domestic' | 'international'}
                                        destinationCountry={destinationCountry}
                                    />
                                )}
                                {item.type === 'car' && (
                                    <CarItineraryForm item={item} index={index} onUpdate={updateItinerary} validationTriggered={validationTriggered} />
                                )}
                                {item.type === 'train' && (
                                    <TrainItineraryForm item={item} index={index} onUpdate={updateItinerary} validationTriggered={validationTriggered} />
                                )}
                            </ItineraryCard>
                        ))}
                    </StaggerContainer>
                )}
                <div ref={bottomRef} />
            </Box>
          )}

          {/* STEP 2: Review */}
          {activeStep === 2 && (
            <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Please review your trip details carefully before submitting.
                    </Alert>
                </Grid>

                {/* Left Column: Trip Details Summary */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3, height: '100%', bgcolor: 'primary.lighter', color: 'primary.darker' }}>
                         <Typography variant="h6" gutterBottom sx={{ color: 'inherit', borderBottom: 1, borderColor: 'primary.main', pb: 1, mb: 3 }}>
                            Trip Summary
                         </Typography>
                         
                         <Stack spacing={2.5}>
                             <Box>
                                <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 0.5 }}>Trip Name</Typography>
                                <Typography variant="body1" fontWeight="bold">{tripName}</Typography>
                             </Box>

                             <Box>
                                <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 0.5 }}>Type</Typography>
                                <Chip 
                                    label={travelType} 
                                    color="primary" 
                                    size="small" 
                                    variant="filled"
                                    sx={{ bgcolor: 'primary.main', color: 'common.white' }} 
                                />
                             </Box>

                             {travelType === 'International' && (
                                <>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 0.5 }}>Destination</Typography>
                                        <Typography variant="body1" fontWeight="bold">{destinationCountry}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 0.5 }}>Visa Status</Typography>
                                        <Typography variant="body1" fontWeight="bold">{visaRequired ? 'Required' : 'Not Required'}</Typography>
                                    </Box>
                                </>
                             )}

                             <Box>
                                <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 0.5 }}>Business Purpose</Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'rgba(255,255,255,0.4)', p: 1.5, borderRadius: 1 }}>
                                    "{businessPurpose || 'None provided'}"
                                </Typography>
                             </Box>
                         </Stack>
                    </Paper>
                </Grid>

                {/* Right Column: Itineraries & Actions */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Itinerary Details <Chip label={itineraries.length} size="small" color="default" sx={{ ml: 1, fontWeight: 'bold' }} />
                        </Typography>
                        
                        {itineraries.length === 0 ? (
                             <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'background.neutral' }}>
                                <Typography color="text.secondary">No itinerary items added.</Typography>
                             </Paper>
                        ) : (
                            itineraries.map((item, idx) => (
                                <ItineraryReview key={item.id} item={item} index={idx} />
                            ))
                        )}
                    </Box>

                    {/* Action Buttons */}
                     <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                        <Button 
                            variant="outlined" 
                            color="inherit" 
                            onClick={handleBack}
                            disabled={isSubmitting}
                            size="large"
                        >
                            Back
                        </Button>
                        <Button 
                            variant="outlined" 
                            color="primary" 
                            onClick={() => handleSubmit('save')}
                            disabled={isSubmitting}
                            startIcon={isSubmitting ? null : <AssignmentIcon />}
                            size="large"
                        >
                            Save Only
                        </Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={() => handleSubmit('mmt_redirect')}
                            disabled={isSubmitting}
                            endIcon={isSubmitting ? null : <FlightTakeoff />}
                            size="large"
                            sx={{ px: 3 }}
                        >
                            Save & Next (MMT)
                        </Button>
                     </Stack>
                </Grid>
            </Grid>
          )}

        </FormStep>

        {/* Visa Request Dialog */}
        <Dialog 
            open={visaDialogOpen} 
            onClose={() => setVisaDialogOpen(false)} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{ component: motion.div, initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 } } as any}
        >
          <DialogTitle>Request Visa Only</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <Autocomplete
                options={countries}
                value={visaCountry}
                onChange={(_, newValue) => setVisaCountry(newValue || '')}
                onOpen={fetchCountries}
                loading={countriesLoading}
                renderInput={(params) => <TextField {...params} label="Destination Country" required variant="outlined" error={validationTriggered && !visaCountry} helperText={validationTriggered && !visaCountry ? "Required" : ""} />}
              />
              <CustomDatePicker
                label="Expected Journey Date"
                value={visaDate}
                onChange={(val) => setVisaDate(val || '')}
                required
                error={validationTriggered && !visaDate}
                helperText={validationTriggered && !visaDate ? "Required" : ""}
              />
              <TextField
                label="Business Purpose"
                value={visaPurpose}
                onChange={(e) => setVisaPurpose(e.target.value)}
                required
                multiline
                rows={3}
                error={validationTriggered && !visaPurpose}
                helperText={validationTriggered && !visaPurpose ? "Required" : ""}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setVisaDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVisaSubmit} variant="contained" color="primary">Submit Request</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </PageTransition>
  );
};

// ----------------------------------------------------------------------
// Sub-components for Itinerary Forms (Preserved and styled)
// ----------------------------------------------------------------------

const FlightItineraryForm: React.FC<{
  item: ItineraryItem;
  index: number;
  onUpdate: (index: number, key: string, value: any) => void;
  travelType: 'domestic' | 'international';
  destinationCountry?: string;
  validationTriggered: boolean;
}> = ({ item, index, onUpdate, travelType, destinationCountry, validationTriggered }) => {
  const [tripType, setTripType] = useState(item.details.tripType || 'oneway');


  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
         <FormControl component="fieldset">
            <FormLabel component="legend">Trip Type</FormLabel>
            <RadioGroup row value={tripType} onChange={(e) => { setTripType(e.target.value); onUpdate(index, 'tripType', e.target.value); }}>
               <FormControlLabel value="oneway" control={<Radio />} label="One Way" />
               <FormControlLabel value="roundtrip" control={<Radio />} label="Round Trip" />
            </RadioGroup>
         </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
         <AirportAutocomplete label="Depart From" value={item.details.departFrom || ''} onChange={(val) => onUpdate(index, 'departFrom', val)} travelType={travelType} destinationCountry={destinationCountry} required error={validationTriggered && !item.details.departFrom} helperText={validationTriggered && !item.details.departFrom ? "Required" : ""} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
         <AirportAutocomplete label="Arrive At" value={item.details.arriveAt || ''} onChange={(val) => onUpdate(index, 'arriveAt', val)} travelType={travelType} destinationCountry={destinationCountry} required error={validationTriggered && !item.details.arriveAt} helperText={validationTriggered && !item.details.arriveAt ? "Required" : ""} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
         <CustomDatePicker label="Departure Date" value={item.details.departureDate || ''} onChange={(val) => onUpdate(index, 'departureDate', val)} required error={validationTriggered && !item.details.departureDate} helperText={validationTriggered && !item.details.departureDate ? "Required" : ""} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
          <TimeSelect label="Time Preference" value={item.details.departTime || ''} onChange={(val) => onUpdate(index, 'departTime', val)} required error={validationTriggered && !item.details.departTime} helperText={validationTriggered && !item.details.departTime ? "Required" : ""} />
      </Grid>
      
      {tripType === 'roundtrip' && (
        <>
            <Grid size={{ xs: 12, md: 6 }}>
                <CustomDatePicker label="Return Date" value={item.details.returnDate || ''} onChange={(val) => onUpdate(index, 'returnDate', val)} required error={validationTriggered && !item.details.returnDate} helperText={validationTriggered && !item.details.returnDate ? "Required" : ""} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <TimeSelect label="Return Time Preference" value={item.details.returnTime || ''} onChange={(val) => onUpdate(index, 'returnTime', val)} required error={validationTriggered && !item.details.returnTime} helperText={validationTriggered && !item.details.returnTime ? "Required" : ""} />
            </Grid>
        </>
      )}
{/* 
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Class Preference</FormLabel>
          <RadioGroup
            row
            value={item.details.classPreference || ''}
            onChange={(e) => onUpdate(index, 'classPreference', e.target.value)}
          >
            <FormControlLabel value="Economy" control={<Radio />} label="Economy" />
            <FormControlLabel value="Premium Economy" control={<Radio />} label="Premium Economy" />
            <FormControlLabel value="Business" control={<Radio />} label="Business" />
            <FormControlLabel value="First" control={<Radio />} label="First" />
          </RadioGroup>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Seat Preference</FormLabel>
            <RadioGroup row value={item.details.seatPreference || ''} onChange={(e) => onUpdate(index, 'seatPreference', e.target.value)}>
                <FormControlLabel value="Window" control={<Radio />} label="Window" />
                <FormControlLabel value="Middle" control={<Radio />} label="Middle" />
                <FormControlLabel value="Aisle" control={<Radio />} label="Aisle" />
            </RadioGroup>
          </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Meal Preference</FormLabel>
            <RadioGroup row value={item.details.mealPreference || ''} onChange={(e) => onUpdate(index, 'mealPreference', e.target.value)}>
                <FormControlLabel value="Veg" control={<Radio />} label="Veg" />
                <FormControlLabel value="Non-Veg" control={<Radio />} label="Non-Veg" />
            </RadioGroup>
          </FormControl>
      </Grid> */}

<Grid container spacing={3} alignItems="flex-start">

  <Grid size={{ xs: 12, md: 4 }}>
      <PillOptionGroup
          label="Class Preference"
          value={item.details.classPreference || ''}
          onChange={(val) => onUpdate(index, 'classPreference', val)}
          options={[
              { value: 'Economy', label: 'Economy' },
              { value: 'Premium Economy', label: 'Premium Economy' },
              { value: 'Business', label: 'Business' },
              { value: 'First', label: 'First' },
          ]}
      />
  </Grid>

  <Grid size={{ xs: 12, md: 4 }}>
    <PillOptionGroup
        label="Seat Preference"
        value={item.details.seatPreference || ''}
        onChange={(val) => onUpdate(index, 'seatPreference', val)}
        options={[
            { value: 'Window', label: 'Window' },
            { value: 'Middle', label: 'Middle' },
            { value: 'Aisle', label: 'Aisle' },
        ]}
    />
  </Grid>

  <Grid size={{ xs: 12, md: 4 }}>
    <PillOptionGroup
        label="Meal Preference"
        value={item.details.mealPreference || ''}
        onChange={(val) => onUpdate(index, 'mealPreference', val)}
        options={[
            { value: 'Veg', label: 'Veg' },
            { value: 'Non-Veg', label: 'Non-Veg' },
        ]}
    />
  </Grid>

</Grid>


      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Special Requests" multiline rows={2} value={item.details.description || ''} onChange={(e) => onUpdate(index, 'description', e.target.value)} />
      </Grid>
    </Grid>
  );
};

const HotelItineraryForm: React.FC<{
  item: ItineraryItem;
  index: number;
  onUpdate: (index: number, key: string, value: any) => void;
  validationTriggered: boolean;
  travelType: 'domestic' | 'international';
  destinationCountry?: string;
}> = ({ item, index, onUpdate, validationTriggered, travelType, destinationCountry }) => {
  return (
    <Grid container spacing={3}>
       <Grid size={{ xs: 12 }}>
          <HotelAutocomplete
            label="Location"
            value={item.details.location || null}
            onChange={(val) => onUpdate(index, 'location', val)}
            travelType={travelType}
            destinationCountry={destinationCountry}
            required
            error={validationTriggered && !item.details.location}
            helperText={validationTriggered && !item.details.location ? "Required" : ""}
          />
       </Grid>
       <Grid size={{ xs: 6, md: 3 }}>
          <CustomDatePicker label="Check-in Date" value={item.details.checkinDate || ''} onChange={(val) => onUpdate(index, 'checkinDate', val)} required error={validationTriggered && !item.details.checkinDate} helperText={validationTriggered && !item.details.checkinDate ? "Required" : ""} />
       </Grid>
       <Grid size={{ xs: 6, md: 3 }}>
          <TimeSelect label="Check-in Time" value={item.details.checkinTime || ''} onChange={(val) => onUpdate(index, 'checkinTime', val)} required error={validationTriggered && !item.details.checkinTime} helperText={validationTriggered && !item.details.checkinTime ? "Required" : ""} />
       </Grid>
       <Grid size={{ xs: 6, md: 3 }}>
          <CustomDatePicker label="Check-out Date" value={item.details.checkoutDate || ''} onChange={(val) => onUpdate(index, 'checkoutDate', val)} required error={validationTriggered && !item.details.checkoutDate} helperText={validationTriggered && !item.details.checkoutDate ? "Required" : ""} />
       </Grid>
       <Grid size={{ xs: 6, md: 3 }}>
          <TimeSelect label="Check-out Time" value={item.details.checkoutTime || ''} onChange={(val) => onUpdate(index, 'checkoutTime', val)} required error={validationTriggered && !item.details.checkoutTime} helperText={validationTriggered && !item.details.checkoutTime ? "Required" : ""} />
       </Grid>
       <Grid size={{ xs: 12, md: 6 }}>
          <FormControl component="fieldset" fullWidth>
             <FormLabel component="legend">Meal Type</FormLabel>
             <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => (
                    <Chip 
                        key={meal} 
                        label={meal} 
                        onClick={() => {
                            const current = item.details.mealType || [];
                            const newMeals = current.includes(meal) ? current.filter((m: string) => m !== meal) : [...current, meal];
                            onUpdate(index, 'mealType', newMeals);
                        }}
                        color={(item.details.mealType || []).includes(meal) ? 'primary' : 'default'}
                        variant={(item.details.mealType || []).includes(meal) ? 'filled' : 'outlined'}
                    />
                ))}
             </Box>
          </FormControl>
       </Grid>
       <Grid size={{ xs: 12, md: 6 }}>
          <PillOptionGroup
            label="Meal Preference"
            value={item.details.mealPreference || ''}
            onChange={(val) => onUpdate(index, 'mealPreference', val)}
            options={[
                { value: 'Veg', label: 'Veg' },
                { value: 'Non-Veg', label: 'Non-Veg' },
            ]}
          />
       </Grid>
       <Grid size={{ xs: 12 }}>
          <TextField fullWidth label="Special Requests" multiline rows={2} value={item.details.description || ''} onChange={(e) => onUpdate(index, 'description', e.target.value)} />
       </Grid>
    </Grid>
  );
};

const CarItineraryForm: React.FC<{
  item: ItineraryItem;
  index: number;
  onUpdate: (index: number, key: string, value: any) => void;
  validationTriggered: boolean;
}> = ({ item, index, onUpdate, validationTriggered }) => {
  return (
    <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
            <CarCityAutocomplete
                label="Pick-up Location"
                value={item.details.pickupLocation || null}
                onChange={(val) => onUpdate(index, 'pickupLocation', val)}
                required
                error={validationTriggered && !item.details.pickupLocation}
                helperText={validationTriggered && !item.details.pickupLocation ? "Required" : ""}
            />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
             <CarCityAutocomplete
                label="Drop-off Location"
                value={item.details.dropoffLocation || null}
                onChange={(val) => onUpdate(index, 'dropoffLocation', val)}
                required
                error={validationTriggered && !item.details.dropoffLocation}
                helperText={validationTriggered && !item.details.dropoffLocation ? "Required" : ""}
            />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
            <CustomDatePicker label="Pick-up Date" value={item.details.pickupDate || ''} onChange={(val) => onUpdate(index, 'pickupDate', val)} required error={validationTriggered && !item.details.pickupDate} helperText={validationTriggered && !item.details.pickupDate ? "Required" : ""} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
            <TimeSelect label="Pick-up Time" value={item.details.pickupTime || ''} onChange={(val) => onUpdate(index, 'pickupTime', val)} required error={validationTriggered && !item.details.pickupTime} helperText={validationTriggered && !item.details.pickupTime ? "Required" : ""} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PillOptionGroup
            label="Car Type"
            value={item.details.carType || ''}
            onChange={(val) => onUpdate(index, 'carType', val)}
            options={[
                { value: 'Sedan', label: 'Sedan' },
                { value: 'SUV', label: 'SUV' },
                { value: 'Compact', label: 'Compact' },
            ]}
          />
        </Grid>
        {/* <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <FormLabel>Fuel Type</FormLabel>
            <Select
                value={item.details.fuelType || ''}
                onChange={(e) => onUpdate(index, 'fuelType', e.target.value)}
                displayEmpty
                size="small"
                sx={{ mt: 0.5 }}
            >
                <MenuItem value="" disabled>Select Fuel</MenuItem>
                <MenuItem value="Petrol">Petrol</MenuItem>
                <MenuItem value="Diesel">Diesel</MenuItem>
                <MenuItem value="CNG">CNG</MenuItem>
                <MenuItem value="Electric">Electric</MenuItem>
            </Select>
          </FormControl>
        </Grid> */}
        <Grid size={{ xs: 12, md: 6 }}>
          <PillOptionGroup
             label="Fuel Type"
             value={item.details.fuelType || ''}
             onChange={(val) => onUpdate(index, 'fuelType', val)}
             options={[
                 { value: 'Petrol', label: 'Petrol' },
                 { value: 'Diesel', label: 'Diesel' },
                 { value: 'CNG', label: 'CNG' },
                 { value: 'Electric', label: 'Electric' },
             ]}
          />
        </Grid>

            <Grid size={{ xs: 12 }}>
             <TextField fullWidth label="Special Requests" multiline rows={2} value={item.details.description || ''} onChange={(e) => onUpdate(index, 'description', e.target.value)} />
        </Grid>
    </Grid>
  );
};

const TrainItineraryForm: React.FC<{
  item: ItineraryItem;
  index: number;
  onUpdate: (index: number, key: string, value: any) => void;
  validationTriggered: boolean;
}> = ({ item, index, onUpdate, validationTriggered }) => {
  return (
    <Grid container spacing={3}>
      {/* Depart / Arrive */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TrainStationAutocomplete
          label="Depart From"
          value={item.details.departFrom || null}
          onChange={(val) => onUpdate(index, 'departFrom', val)}
          required
          error={validationTriggered && !item.details.departFrom}
          helperText={validationTriggered && !item.details.departFrom ? "Required" : ""}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TrainStationAutocomplete
          label="Arrive At"
          value={item.details.arriveAt || null}
          onChange={(val) => onUpdate(index, 'arriveAt', val)}
          required
          error={validationTriggered && !item.details.arriveAt}
          helperText={validationTriggered && !item.details.arriveAt ? "Required" : ""}
        />
      </Grid>

      {/* Same row: Departure Date + Class + Berth */}
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomDatePicker
          label="Departure Date"
          value={item.details.departureDate || ''}
          onChange={(val) => onUpdate(index, 'departureDate', val)}
          required
          error={validationTriggered && !item.details.departureDate}
          helperText={validationTriggered && !item.details.departureDate ? "Required" : ""}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <FormControl fullWidth>
          <FormLabel>Class Preference</FormLabel>
          <Select
            value={item.details.classPreference || ''}
            onChange={(e) => onUpdate(index, 'classPreference', e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>Select Class</MenuItem>
            <MenuItem value="1AC">1AC</MenuItem>
            <MenuItem value="2AC">2AC</MenuItem>
            <MenuItem value="3AC">3AC</MenuItem>
            <MenuItem value="SL">SL</MenuItem>
            <MenuItem value="CC">CC</MenuItem>
            <MenuItem value="EC">EC</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <FormControl fullWidth>
          <FormLabel>Berth Preference</FormLabel>
          <Select
            value={item.details.berthPreference || ''}
            onChange={(e) => onUpdate(index, 'berthPreference', e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>Select Berth</MenuItem>
            <MenuItem value="Lower">Lower</MenuItem>
            <MenuItem value="Middle">Middle</MenuItem>
            <MenuItem value="Upper">Upper</MenuItem>
            <MenuItem value="Side lower">Side lower</MenuItem>
            <MenuItem value="Side upper">Side upper</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* Special Requests */}
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="Special Requests"
          multiline
          rows={2}
          value={item.details.description || ''}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
        />
      </Grid>
    </Grid>
  );
};


export default NewRequest;
