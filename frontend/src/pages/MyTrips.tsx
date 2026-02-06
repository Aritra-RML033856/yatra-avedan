import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  IconButton,
  Alert,
  Stack,
  TextField,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloseIcon from '@mui/icons-material/Close';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import HotelIcon from '@mui/icons-material/Hotel';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import TrainIcon from '@mui/icons-material/Train';
import DoneIcon from '@mui/icons-material/Done';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';

interface ItineraryItem {
  id: number;
  type: 'flight' | 'hotel' | 'car' | 'train';
  trip_id: number;
  details: any;
}

interface FileUpload {
  id: number;
  trip_id: number;
  uploaded_by: number;
  file_type: string;
  filename: string;
  filepath: string;
  uploaded_at: string;
}

interface Trip {
  id: number;
  reference_no: string;
  trip_name: string;
  status: string;
  option_selected: string | null;
  created_at: string;
  business_purpose: string;
  travel_type: string;
  destination_country: string | null;
  visa_required: boolean | null;
  itineraries: ItineraryItem[];
  files: FileUpload[];
  is_visa_request?: boolean;
  expected_journey_date?: string;
}

const MyTrips: React.FC = () => {
  const { user, token } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [rescheduleTrip, setRescheduleTrip] = useState<Trip | null>(null);
  const [rescheduleItineraries, setRescheduleItineraries] = useState<ItineraryItem[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReasonDialog, setCancelReasonDialog] = useState(false);
  const [cancelTripId, setCancelTripId] = useState<number | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/trips/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTrips(response.data);
      } catch (error) {
        console.error('Error fetching trips:', error);
      }
    };
    if (token) fetchTrips();
  }, [token]);

  const handleViewTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setDialogOpen(true);
  };



  const refreshTrips = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/trips/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };



  const handleDownloadFile = (filepath: string, filename: string) => {
    // Use the dedicated download API to preserve original filename with extension
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/api/download?filepath=${encodeURIComponent(filepath)}&filename=${encodeURIComponent(filename)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'SELECT_OPTION': return 'info';
      case 'OPTION_SELECTED': return 'warning';
      case 'BOOKED': return 'primary';
      case 'CLOSED': return 'default';
      case 'VISA_PENDING': return 'warning';
      case 'VISA_UPLOADED': return 'success';
      case 'CANCELLATION_PENDING': return 'warning';
      case 'CANCELLED': return 'error';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <DoneIcon />;
      case 'SELECT_OPTION': return <ScheduleIcon />;
      case 'OPTION_SELECTED': return <BusinessCenterIcon />;
      case 'RM_PENDING': return <AssignmentIcon />;
      case 'TRAVEL_ADMIN_PENDING': return <AssignmentIcon />;
      case 'BOOKED': return <ReceiptIcon />;
      case 'CLOSED': return <CheckCircleIcon />;
      case 'VISA_PENDING': return <AssignmentIcon />;
      case 'VISA_UPLOADED': return <CheckCircleIcon />;
      default: return <AssignmentIcon />;
    }
  };

  const handleOpenReschedule = (trip: Trip) => {
    setRescheduleTrip(trip);
    // Deep clone the itineraries for editing
    setRescheduleItineraries(JSON.parse(JSON.stringify(trip.itineraries)));
    setRescheduleDialog(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTrip || !rescheduleItineraries.length) return;
    try {
      await axios.post(`${API_BASE_URL}/api/trips/${rescheduleTrip.id}/reschedule`, {
        itineraries: rescheduleItineraries
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRescheduleDialog(false);
      setRescheduleTrip(null);
      setRescheduleItineraries([]);
      refreshTrips();
      alert('Trip rescheduled successfully! Travel Admin will upload new options.');
    } catch (error: any) {
      alert('Error rescheduling trip: ' + (error.response?.data?.error || error.message));
    }
  };

  const isTripCancellable = (trip: Trip) => {
    // Check if trip is already cancelled or closed
    if (['CANCELLED', 'CANCELLATION_PENDING', 'CLOSED', 'REJECTED'].includes(trip.status)) {
      return false;
    }
    
    // Check last journey date
    let lastDate: Date | null = null;
    for (const it of trip.itineraries) {
      let dateStr = null;
      if (it.type === 'flight') {
         // Use returnDate if exists, else departureDate
         dateStr = it.details.returnDate || it.details.departureDate;
      } else if (it.type === 'hotel') {
         // Calculate check-out? Or just use checkin + duration? Assuming checkin for now as "journey date"
         // Requirement says "last journey date". Let's stick to start dates if end dates absent.
         // Actually hotel checkin is safer or maybe checkin + nights logic in backend. 
         // For simplicity and robustness, let's look for explicit dates available.
         dateStr = it.details.checkinDate;
      } else if (it.type === 'train') {
         dateStr = it.details.departDate || it.details.departureDate; // check fields
      }
      
      if (dateStr) {
        const d = new Date(dateStr);
        if (!lastDate || d > lastDate) {
          lastDate = d;
        }
      }
    }

    if (!lastDate) return true; // If no dates, assume cancellable? Or false? Let's say true.
    
    // Check if today is before lastDate
    const today = new Date();
    today.setHours(0,0,0,0);
    lastDate.setHours(0,0,0,0);
    return today <= lastDate;
  };

  const handleOpenCancel = (trip: Trip) => {
    setCancelTripId(trip.id);
    setRescheduleTrip(trip); // reuse for reschedule logic if chosen
    setRescheduleItineraries(JSON.parse(JSON.stringify(trip.itineraries)));
    setCancelDialogOpen(true);
  };

  const handleProceedToCancel = () => {
    setCancelDialogOpen(false);
    setCancelReasonDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTripId || !cancellationReason.trim()) return;
    
    try {
      await axios.post(`${API_BASE_URL}/api/trips/${cancelTripId}/cancel`, {
        reason: cancellationReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCancelReasonDialog(false);
      setCancelTripId(null);
      setCancellationReason('');
      refreshTrips();
      alert('Cancellation request submitted successfully.');
    } catch (error: any) {
      console.error('Error cancelling trip:', error);
      alert('Error cancelling trip: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleProceedToMMT = (trip: Trip) => {
    // Construct the context payload based on trip itineraries
    const context = trip.itineraries.map(it => {
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
    const mmtUrl = `${baseUrl}:4000/?trip_id=${trip.id}&redirect_url=${baseUrl}:3000/mmt-callback&emp_id=${user?.userid || 'EMP001'}&rm=false&ta=false&context=${contextStr}`;
    
    // Open MMT
    window.open(mmtUrl, '_blank');
  };

  const updateRescheduleItinerary = (index: number, field: string, value: any) => {
    const updated = [...rescheduleItineraries];
    updated[index].details[field] = value;
    setRescheduleItineraries(updated);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Trips
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        View your trip requests, select options, and track bookings
      </Typography>

      {trips.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          You have no trips yet.
        </Alert>
      ) : (
        <Stack spacing={3}>
          {trips.map((trip) => (
            <Card elevation={3} key={trip.id}>
              <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(trip.status)}
                    <Box>
                      <Typography variant="h6" component="div">
                        {trip.trip_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ref: {trip.reference_no}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={trip.status.replace('_', ' ')}
                    color={getStatusColor(trip.status) as any}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                {/* Trip Info */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created: {new Date(trip.created_at).toLocaleDateString()}
                  </Typography>
                  {trip.option_selected && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Selected Option:</strong> {trip.option_selected}
                      </Typography>
                    </Box>
                  )}
                  {trip.is_visa_request && trip.expected_journey_date && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <strong>Expected Journey Date:</strong> {new Date(trip.expected_journey_date).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleViewTrip(trip)}
                    startIcon={<VisibilityIcon />}
                  >
                    View Details
                  </Button>

                  {trip.status === 'SELECT_OPTION' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                       <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          onClick={() => handleProceedToMMT(trip)}
                          startIcon={<FlightTakeoffIcon />}
                        >
                          Proceed to MMT
                        </Button>

                    </Box>
                  )}

                  {trip.status === 'BOOKED' && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      onClick={() => handleOpenReschedule(trip)}
                    >
                      Reschedule
                    </Button>
                  )}

                  {/* Close Trip Button Removed as per requirement (Auto-Close implemented) */}


                  {/* CANCEL TRIP BUTTON */}
                  {isTripCancellable(trip) && (
                    <Button
                      variant="contained"
                      size="small"
                      color="error"
                      onClick={() => handleOpenCancel(trip)}
                    >
                      CANCEL TRIP
                    </Button>
                  )}
                </Box>

                {/* Files Display */}
                {trip.files && trip.files.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Attached Files:</strong>
                    </Typography>

                    {/* Visa Document */}
                    {trip.files.filter(f => f.file_type === 'visa').length > 0 && (
                      <Box sx={{ mb: 2 }}>
                         <Typography variant="body2" color="success.main" sx={{ mb: 1, fontWeight: 'medium' }}>
                           🛂 Visa Document:
                         </Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {trip.files
                              .filter(f => f.file_type === 'visa')
                              .map((file, index) => (
                                <Chip
                                  key={index}
                                  icon={<CloudDownloadIcon />}
                                  label={`Download Visa: ${file.filename}`}
                                  color="success"
                                  variant="outlined"
                                  onClick={() => handleDownloadFile(file.filepath, file.filename)}
                                  clickable
                                />
                              ))}
                         </Box>
                      </Box>
                    )}

                    {/* Travel Options (Images) */}
                    {trip.files.filter(f => f.file_type === 'travel_options').length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="primary" sx={{ mb: 1, fontWeight: 'medium' }}>
                          📸 Travel Options:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {trip.files
                            .filter(f => f.file_type === 'travel_options')
                           // ... map logic ...
                            .map((file, index) => (
                              <Box key={index} sx={{ display: 'inline-block' }}>
                                <img
                                  src={`${API_BASE_URL}/${file.filepath}`}
                                  alt={file.filename}
                                  style={{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleDownloadFile(file.filepath, file.filename)}
                                  onError={(e) => {
                                    // If image fails to load, show as download link
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (target.nextElementSibling) {
                                      target.nextElementSibling.textContent = '📄 ' + file.filename;
                                    }
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    textAlign: 'center',
                                    mt: 0.5,
                                    maxWidth: '60px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {file.filename.split('.')[0]}
                                </Typography>
                              </Box>
                            ))}
                        </Box>
                      </Box>
                    )}

                    {/* Receipts/Other Files (Download Links) */}
                    {trip.files.filter(f => f.file_type !== 'travel_options' && f.file_type !== 'visa').length > 0 && (
                      <Box>
                        <Typography variant="body2" color="primary" sx={{ mb: 1, fontWeight: 'medium' }}>
                          📄 Receipts & Documents:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {trip.files
                            .filter(f => f.file_type !== 'travel_options' && f.file_type !== 'visa')
                            .map((file, index) => (
                              <Chip
                                key={index}
                                icon={<CloudDownloadIcon />}
                                label={file.filename}
                                size="small"
                                onClick={() => handleDownloadFile(file.filepath, file.filename)}
                                clickable
                              />
                            ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}



      {/* Detailed Trip Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Trip Details: {selectedTrip?.reference_no}
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {selectedTrip && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTrip.trip_name}
              </Typography>

              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip
                      label={selectedTrip.status.replace('_', ' ')}
                      color={getStatusColor(selectedTrip.status) as any}
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Travel Type</Typography>
                    <Typography>{selectedTrip.travel_type}</Typography>
                  </Box>
                </Box>
                {selectedTrip.business_purpose && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Business Purpose</Typography>
                    <Typography>{selectedTrip.business_purpose}</Typography>
                  </Box>
                )}
              </Box>

              {selectedTrip.itineraries && selectedTrip.itineraries.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Itinerary ({selectedTrip.itineraries.length} items)
                  </Typography>
                  <Stack spacing={2}>
                    {selectedTrip.itineraries.map((itinerary, index) => (
                      <Paper elevation={1} sx={{ p: 2 }} key={index}>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {itinerary.type === 'flight' && <FlightTakeoffIcon />}
                          {itinerary.type === 'hotel' && <HotelIcon />}
                          {itinerary.type === 'car' && <DriveEtaIcon />}
                          {itinerary.type === 'train' && <TrainIcon />}
                          {itinerary.type.toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {itinerary.type === 'hotel' ? (
                            `Location: ${itinerary.details.location || ''}`
                          ) : itinerary.type === 'car' ? (
                            `From: ${itinerary.details.pickupLocation || ''} → To: ${itinerary.details.dropoffLocation || ''}`
                          ) : (
                            `From: ${itinerary.details.departFrom || ''} → To: ${itinerary.details.arriveAt || ''}`
                          )}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {selectedTrip.files && selectedTrip.files.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Attached Files ({selectedTrip.files.length})
                  </Typography>
                  <Stack spacing={1}>
                    {selectedTrip.files.map((file, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {file.filename}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<CloudDownloadIcon />}
                          onClick={() => handleDownloadFile(file.filepath, file.filename)}
                        >
                          Download
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Trip Query</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to reschedule this trip instead?
            Cancelling will completely remove this request.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
             setCancelDialogOpen(false);
             if (rescheduleTrip) handleOpenReschedule(rescheduleTrip);
          }}>
            Reschedule
          </Button>
          <Button onClick={handleProceedToCancel} color="error" variant="contained">
            Proceed to Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancellation Reason Dialog */}
      <Dialog open={cancelReasonDialog} onClose={() => setCancelReasonDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancellation Reason</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Please provide a reason for cancelling this trip. This will be sent to the Travel Admin.
          </Typography>
          <TextField
             autoFocus
             margin="dense"
             label="Reason for Cancellation"
             fullWidth
             multiline
             rows={3}
             value={cancellationReason}
             onChange={(e) => setCancellationReason(e.target.value)}
             variant="outlined"
             required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelReasonDialog(false)}>Back</Button>
          <Button onClick={handleConfirmCancel} color="error" variant="contained" disabled={!cancellationReason.trim()}>
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onClose={() => setRescheduleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Reschedule Trip: {rescheduleTrip?.reference_no}
          <IconButton
            onClick={() => setRescheduleDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {rescheduleTrip && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {rescheduleTrip.trip_name}
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                You can only modify date and time fields. All other itinerary details will remain unchanged.
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Note:</strong> Rescheduling will reset this trip to "Approved" status. Travel Admin will need to upload new options, and you'll select from them again.
              </Alert>

              {rescheduleItineraries.map((itinerary, index) => (
                <Paper elevation={1} sx={{ p: 3, mb: 3 }} key={index}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {itinerary.type === 'flight' && <FlightTakeoffIcon />}
                    {itinerary.type === 'hotel' && <HotelIcon />}
                    {itinerary.type === 'car' && <DriveEtaIcon />}
                    {itinerary.type === 'train' && <TrainIcon />}
                    {itinerary.type.toUpperCase()} {index + 1}
                  </Typography>

                  {/* Display read-only fields */}
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Current Details:</strong>
                    </Typography>
                    {itinerary.type === 'flight' && (
                      <Typography variant="body2">
                        From: {itinerary.details.departFrom} → To: {itinerary.details.arriveAt}
                      </Typography>
                    )}
                    {itinerary.type === 'hotel' && (
                      <Typography variant="body2">
                        Location: {itinerary.details.location}
                      </Typography>
                    )}
                    {itinerary.type === 'car' && (
                      <Typography variant="body2">
                        From: {itinerary.details.pickupLocation} → To: {itinerary.details.dropoffLocation}
                      </Typography>
                    )}
                    {itinerary.type === 'train' && (
                      <Typography variant="body2">
                        From: {itinerary.details.departFrom} → To: {itinerary.details.arriveAt}
                      </Typography>
                    )}
                  </Box>

                  {/* Editable date/time fields */}
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Editable Date/Time Fields:
                  </Typography>

                  {itinerary.type === 'flight' && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Departure Date"
                        type="date"
                        value={itinerary.details.departureDate || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'departureDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Departure Time"
                        type="time"
                        value={itinerary.details.departTime || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'departTime', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      {itinerary.details.tripType === 'roundtrip' && (
                        <>
                          <TextField
                            sx={{ minWidth: 200, flex: 1 }}
                            label="Return Date"
                            type="date"
                            value={itinerary.details.returnDate || ''}
                            onChange={(e) => updateRescheduleItinerary(index, 'returnDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            size="small"
                          />
                          <TextField
                            sx={{ minWidth: 200, flex: 1 }}
                            label="Return Time"
                            type="time"
                            value={itinerary.details.returnTime || ''}
                            onChange={(e) => updateRescheduleItinerary(index, 'returnTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            variant="outlined"
                            size="small"
                          />
                        </>
                      )}
                    </Box>
                  )}

                  {itinerary.type === 'hotel' && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Check-in Date"
                        type="date"
                        value={itinerary.details.checkinDate || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'checkinDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Check-in Time"
                        type="time"
                        value={itinerary.details.checkinTime || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'checkinTime', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Check-out Date"
                        type="date"
                        value={itinerary.details.checkoutDate || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'checkoutDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Check-out Time"
                        type="time"
                        value={itinerary.details.checkoutTime || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'checkoutTime', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  )}

                  {itinerary.type === 'car' && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Pick-up Date"
                        type="date"
                        value={itinerary.details.pickupDate || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'pickupDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Pick-up Time"
                        type="time"
                        value={itinerary.details.pickupTime || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'pickupTime', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Drop-off Date"
                        type="date"
                        value={itinerary.details.dropoffDate || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'dropoffDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Drop-off Time"
                        type="time"
                        value={itinerary.details.dropoffTime || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'dropoffTime', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  )}

                  {itinerary.type === 'train' && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Departure Date"
                        type="date"
                        value={itinerary.details.departureDate || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'departureDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        sx={{ minWidth: 200, flex: 1 }}
                        label="Departure Time"
                        type="time"
                        value={itinerary.details.departTime || ''}
                        onChange={(e) => updateRescheduleItinerary(index, 'departTime', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setRescheduleDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRescheduleSubmit}
            variant="contained"
            color="primary"
          >
            Reschedule Trip
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyTrips;
