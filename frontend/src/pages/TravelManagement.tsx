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
  Alert,
  LinearProgress,
  Stack,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Fade,
  IconButton,
  Popover,
} from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import DateRangePicker, { DateRange } from '../components/DateRangePicker';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonIcon from '@mui/icons-material/Person';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import HotelIcon from '@mui/icons-material/Hotel';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import TrainIcon from '@mui/icons-material/Train';
import DoneIcon from '@mui/icons-material/Done';
import ScheduleIcon from '@mui/icons-material/Schedule';
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
  requester_name: string;
  requester_id: string;
  designation: string;
  department: string;
  travel_type: string;
  destination_country: string | null;
  visa_required: boolean | null;
  business_purpose: string;
  status: string;
  option_selected: string | null;
  created_at: string;
  total_cost?: number;
  requester_email?: string;
  itineraries: ItineraryItem[];
  files: FileUpload[];
}

const TravelManagement: React.FC = () => {
  const { user, token } = useAuth();
  // trips state moved to infinite scroll section
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceiptTrip, setSelectedReceiptTrip] = useState<Trip | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Temp state for the picker dialog
  const [pickerStartDate, setPickerStartDate] = useState('');
  const [pickerEndDate, setPickerEndDate] = useState('');
  const [dateRangePickerOpen, setDateRangePickerOpen] = useState(false);

  const handleApplyDateRange = () => {
    setStartDate(pickerStartDate);
    setEndDate(pickerEndDate);
    setDateRangePickerOpen(false);
  };

  const handleOpenDateRangePicker = () => {
    setPickerStartDate(startDate);
    setPickerEndDate(endDate);
    setDateRangePickerOpen(true);
  };


  const [cost, setCost] = useState('');
  const [selectedReceiptFiles, setSelectedReceiptFiles] = useState<FileList | null>(null);

  const [visaRequests, setVisaRequests] = useState<Trip[]>([]);
  const [visaUploadArgs, setVisaUploadArgs] = useState<{tripId: number, tripName: string} | null>(null);
  const [visaCost, setVisaCost] = useState('');
  const [visaFile, setVisaFile] = useState<File | null>(null);
  
  const [cancelledTrips, setCancelledTrips] = useState<Trip[]>([]);
  const [cancellationConfirmOpen, setCancellationConfirmOpen] = useState(false);
  const [selectedCancellationTrip, setSelectedCancellationTrip] = useState<Trip | null>(null);
  const [cancellationCost, setCancellationCost] = useState('');

  const getTimeSlotLabel = (time: string) => {
    if (time >= '12:00' && time <= '19:59') return '12AM - 8AM';
    if (time >= '08:00' && time <= '11:59') return '8AM - 12PM';
    if (time >= '12:00' && time <= '19:59') return '12PM - 8PM';
    if (time >= '20:00' || time <= '07:59') return '8PM - 12AM';
    return 'Anytime';
  };

  const getDateRangeParams = () => {
    return { startDate: startDate, endDate: endDate };
  };

  const handleDownloadReport = async () => {
    try {
      const { startDate, endDate } = getDateRangeParams();
      const params: any = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await axios.get(`${API_BASE_URL}/api/trips/booked/excel`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateSuffix = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_time';
      link.setAttribute('download', `booked_trips_report_${dateSuffix}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // ... existing code ...

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observer = React.useRef<IntersectionObserver | null>(null);

  const lastTripElementRef = React.useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchTripsForTab = async (pageNum: number, tabIndex: number) => {
    setLoading(true);
    try {
      const limit = 20;
      const offset = pageNum * limit;
      let url = '';
      let params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });

      // Identify Endpoint based on Tab
      // 0: Upload Options -> status=APPROVED
      // 1: Options Given -> status=SELECT_OPTION
      // 2: Upload Receipts -> status=OPTION_SELECTED
      // 3: Booked -> status=BOOKED
      // 4: VISA -> status=VISA_PENDING (handled by separate endpoint generally but can filter)
      // 5: Cancelled -> status=CANCELLATION_PENDING (separate endpoint)

      // We need to map tab to API call
      if (tabIndex === 0) {
        url = `${API_BASE_URL}/api/trips/approved`;
        params.append('status', 'APPROVED');
      } else if (tabIndex === 1) {
        url = `${API_BASE_URL}/api/trips/approved`;
        params.append('status', 'SELECT_OPTION');
      } else if (tabIndex === 2) {
        url = `${API_BASE_URL}/api/trips/approved`;
        params.append('status', 'OPTION_SELECTED');
      } else if (tabIndex === 3) {
        url = `${API_BASE_URL}/api/trips/approved`;
        params.append('status', 'BOOKED');
      } else if (tabIndex === 4) {
        url = `${API_BASE_URL}/api/trips/visa-requests`;
      } else if (tabIndex === 5) {
        url = `${API_BASE_URL}/api/trips/cancelled`;
      }

      const response = await axios.get(`${url}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newTrips = response.data;
      if (newTrips.length < limit) {
         setHasMore(false);
      } else {
         setHasMore(true);
      }

      setTrips(prev => pageNum === 0 ? newTrips : [...prev, ...newTrips]);

    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && (user?.role === 'travel_admin' || user?.role === 'super_admin')) {
        setPage(0);
        setHasMore(true);
        setTrips([]);
        fetchTripsForTab(0, tabValue);
    }
  }, [token, user, tabValue]);

  useEffect(() => {
    if (page > 0) {
      fetchTripsForTab(page, tabValue);
    }
  }, [page]);
  
  const handleViewTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setDialogOpen(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const filterByDate = (trip: Trip) => {
    if (!startDate || !endDate) return true;
    const tripDate = new Date(trip.created_at);
    return tripDate >= new Date(startDate) && tripDate <= new Date(endDate);
  };

  // We are now fetching only relevant trips, so 'trips' state IS the list to show.
  // However, date filtering is client side still? Or should be server side? 
  // Ideally server side, but plan didn't explicitly changing date filter to server side.
  // Mixing client side filter with infinite scroll is tricky.
  // If we filter client side, we might filter out all 20 fetched items and show nothing, effectively breaking scroll.
  // Given the complexity, I will keep date filter client side but apply it to the `trips` list.
  // Note: This is imperfect for infinite scroll (might have gaps), but moving all filtering to backend wasn't in the plan.
  // Wait, if pagination is used, date filtering MUST be server side or it won't work correctly (you might load page 2 but page 1 had matching items that were filtered out... wait no, if you filter client side on a partial list, you just see less items).
  // The problem is if you fetch 20, and all 20 are outside the date range. Then you see nothing, and can't scroll to trigger next load.
  // For proper implementation, date filter should be server side. 
  // I will check if I can easily add date params to the server side call.
  // The server side `generateExcelForBookedTrips` uses date. The others don't seem to yet.
  // For now, I will interpret "optimize data fetching" as primary goal. 
  // If I add date filtering to backend, it involves more changes than planned. 
  // I will stick to client side filter for now, but acknowledge the limitation or try to modify backend if possible.
  // Actually, wait. The user asked for optimization. Client side filtering of infinite scroll is not optimal.
  // BUT the `filterByDate` function exists. 
  // Let's rely on the fact that date filtering is an advanced feature and default is no filter. 
  // If I filter `trips` by date, `currentTrips` will be a subset.
  // If `currentTrips` is empty but `hasMore` is true, the user might be stuck. 
  // A simple fix for "stuck" infinite scroll is to auto-trigger fetch if visible list is empty but hasMore is true. 
  // I will add a check for that.

  const refreshTrips = () => {
      // Re-fetch current tab
      setPage(0);
      setHasMore(true);
      fetchTripsForTab(0, tabValue);
  };
  
  // Apply client-side date filter
  const currentTrips = trips.filter(filterByDate);

  // Auto-fetch if filtered list is empty but we have more (and we are not loading)
  // detailed logic: if currentTrips.length < 5 and hasMore and !loading, fetch next page.
  // This helps bridge the gap if many items are filtered out.
  useEffect(() => {
      if (currentTrips.length < 5 && hasMore && !loading && trips.length > 0) {
          setPage(prev => prev + 1);
      }
  }, [currentTrips.length, hasMore, loading, trips.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'SELECT_OPTION': return 'info';
      case 'OPTION_SELECTED': return 'warning';
      case 'BOOKED': return 'primary';
      case 'VISA_PENDING': return 'warning';
      case 'VISA_UPLOADED': return 'success';
      case 'CANCELLATION_PENDING': return 'warning';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <DoneIcon />;
      case 'SELECT_OPTION': return <ScheduleIcon />;
      case 'OPTION_SELECTED': return <BusinessCenterIcon />;
      case 'BOOKED': return <ReceiptIcon />;
      case 'VISA_PENDING': return <AssignmentIcon />;
      case 'VISA_UPLOADED': return <CheckCircleIcon />;
      case 'CANCELLATION_PENDING': return <AssignmentIcon />;
      case 'CANCELLED': return <AssignmentIcon />;
      default: return <AssignmentIcon />;
    }
  };

  const handleDownloadFile = (filepath: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/api/download?filepath=${encodeURIComponent(filepath)}&filename=${encodeURIComponent(filename)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadVisa = async () => {
    if (!visaUploadArgs || !visaFile || !visaCost) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', visaFile);
      formData.append('totalCost', visaCost);
      await axios.post(`${API_BASE_URL}/api/trips/${visaUploadArgs.tripId}/visa-upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setVisaUploadArgs(null);
      setVisaFile(null);
      setVisaCost('');
      refreshTrips();
      alert('Visa uploaded successfully!');
    } catch (error) {
      console.error('Error uploading visa:', error);
      alert('Failed to upload visa');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadOptions = async (tripId: number, files: FileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('files', file));
      await axios.post(`${API_BASE_URL}/api/trips/${tripId}/options`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      refreshTrips();
    } catch (error) {
      console.error('Error uploading options:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadReceipts = async () => {
      if (!selectedReceiptTrip || !cost || !selectedReceiptFiles) return;
      setUploading(true);
      try {
        const formData = new FormData();
        Array.from(selectedReceiptFiles).forEach(file => {
          formData.append('files', file);
        });
        formData.append('cost', cost);
  
        await axios.post(`${API_BASE_URL}/api/trips/${selectedReceiptTrip.id}/receipts`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
  
        setReceiptDialogOpen(false);
        setSelectedReceiptTrip(null);
        setCost('');
        setSelectedReceiptFiles(null);
        refreshTrips();
      } catch (error) {
        console.error('Error uploading receipts:', error);
        alert('Failed to upload receipts');
      } finally {
        setUploading(false);
      }
    };

  const handleOpenCancellationConfirm = (trip: Trip) => {
    setSelectedCancellationTrip(trip);
    setCancellationCost('');
    setCancellationConfirmOpen(true);
  };

  const handleSubmitCancellation = async () => {
    if (!selectedCancellationTrip || !cancellationCost) return;
    try {
      await axios.post(`${API_BASE_URL}/api/trips/${selectedCancellationTrip.id}/confirm-cancellation`, {
        cancellationCost: parseInt(cancellationCost)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCancellationConfirmOpen(false);
      setSelectedCancellationTrip(null);
      setCancellationCost('');
      refreshTrips();
      alert('Cancellation processed successfully');
    } catch (error: any) {
      console.error('Error confirming cancellation:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };



  if (!user || (user.role !== 'travel_admin' && user.role !== 'super_admin')) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          You don't have access to this page.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Travel Management
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Manage approved trips, upload options, and process bookings
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DateRangeIcon />}
            onClick={handleOpenDateRangePicker}
            sx={{ minWidth: 150 }}
          >
            {startDate && endDate
              ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
              : 'Select Date Range'
            }
          </Button>

          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label={`Upload Options`} />
          <Tab label={`Options Given`} />
          <Tab label={`Upload Receipts`} />
          <Tab label={`Booked`} />
          <Tab label={`VISA`} />
          <Tab label={`Cancelled`} />
        </Tabs>
      </Box>

      {currentTrips.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No trips in this category.
        </Alert>
      ) : (
        <Stack spacing={3}>
          {currentTrips.map((trip, index) => (
            <div ref={index === currentTrips.length - 1 ? lastTripElementRef : null} key={trip.id}>
            <Card elevation={3}>
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

                {/* Requester Info */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                    <strong>{trip.requester_name}</strong> ({trip.requester_id}) - {trip.designation}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {trip.department} • {trip.travel_type}
                    {trip.destination_country && ` • ${trip.destination_country}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created: {new Date(trip.created_at).toLocaleDateString()}
                  </Typography>
                  {trip.option_selected && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Selected Option:</strong> {trip.option_selected}
                      </Typography>
                      {trip.total_cost && (
                        <Typography variant="body2" color="primary" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                          <strong>Total Trip Cost:</strong> ₹{trip.total_cost.toLocaleString('en-IN')}
                        </Typography>
                      )}
                      {trip.status === 'CANCELLED' && (trip as any).cancellation_cost && (
                        <Typography variant="body2" color="error" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                          <strong>Cancellation Cost:</strong> ₹{(trip as any).cancellation_cost.toLocaleString('en-IN')}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {trip.status === 'CANCELLATION_PENDING' && (
                     <Alert severity="warning" sx={{ mt: 1 }}>
                       <strong>Cancellation Requested!</strong>
                       <br/>
                       Reason: {(trip as any).cancellation_reason}
                     </Alert>
                  )}
                  {trip.status === 'CANCELLED' && (
                     <Alert severity="error" sx={{ mt: 1 }}>
                       <strong>Cancelled</strong>
                       <br/>
                       Reason: {(trip as any).cancellation_reason}
                     </Alert>
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

                  {/* Travel Admin Actions */}
                  {trip.status === 'APPROVED' && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files && files.length > 0) {
                            handleUploadOptions(trip.id, files);
                          }
                        };
                        input.click();
                      }}
                    >
                      Upload Options
                    </Button>
                  )}

                  {trip.status === 'OPTION_SELECTED' && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ReceiptIcon />}
                      onClick={() => {
                        setSelectedReceiptTrip(trip);
                        setCost('');
                        setSelectedReceiptFiles(null);
                        setReceiptDialogOpen(true);
                      }}
                    >
                      Upload Receipts
                    </Button>
                  )}

                  {trip.status === 'VISA_PENDING' && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                      onClick={() => setVisaUploadArgs({ tripId: trip.id, tripName: trip.trip_name })}
                    >
                      Upload Visa
                    </Button>
                  )}

                  {trip.status === 'CANCELLATION_PENDING' && (
                    <Button
                      variant="contained"
                      size="small"
                      color="error"
                      onClick={() => handleOpenCancellationConfirm(trip)}
                    >
                      CONFIRM CANCEL
                    </Button>
                  )}
                </Box>

                {/* Files Display */}
                {trip.files && trip.files.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Attached Files:</strong>
                    </Typography>

                    {/* Travel Options (Images) */}
                    {trip.files.filter(f => f.file_type === 'travel_options').length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="primary" sx={{ mb: 1, fontWeight: 'medium' }}>
                          📸 Travel Options:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {trip.files
                            .filter(f => f.file_type === 'travel_options')
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
                    {trip.files.filter(f => f.file_type !== 'travel_options').length > 0 && (
                      <Box>
                        <Typography variant="body2" color="primary" sx={{ mb: 1, fontWeight: 'medium' }}>
                          📄 Receipts & Documents:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {trip.files
                            .filter(f => f.file_type !== 'travel_options')
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
            </div>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>Loading more...</Typography>
            </Box>
          )}
        </Stack>
      )}

      {/* Visa Upload Dialog */}
      <Dialog open={!!visaUploadArgs} onClose={() => setVisaUploadArgs(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Visa for {visaUploadArgs?.tripName}</DialogTitle>
        <DialogContent>
           <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
             <TextField
                label="Visa Cost (₹)"
                type="number"
                value={visaCost}
                onChange={(e) => setVisaCost(e.target.value)}
                fullWidth
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                }}
             />
             <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
                sx={{ height: 60 }}
             >
                {visaFile ? visaFile.name : 'Select Visa File'}
                <input
                  type="file"
                  hidden
                  onChange={(e) => setVisaFile(e.target.files?.[0] || null)}
                />
             </Button>
           </Box>
        </DialogContent>
        <DialogActions>
           <Button onClick={() => setVisaUploadArgs(null)}>Cancel</Button>
           <Button 
             onClick={handleUploadVisa} 
             variant="contained" 
             disabled={!visaFile || !visaCost || uploading}
           >
             {uploading ? 'Uploading...' : 'Submit'}
           </Button>
        </DialogActions>
      </Dialog>

      {/* Detailed Trip Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Trip Details: {selectedTrip?.reference_no}
        </DialogTitle>

        <DialogContent>
          {selectedTrip && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTrip.trip_name}
              </Typography>

              {/* Trip Information */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  Requester & Travel Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Requester</Typography>
                    <Typography>{selectedTrip.requester_name} ({selectedTrip.requester_id})</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedTrip.designation}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Department</Typography>
                    <Typography>{selectedTrip.department}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Travel Type</Typography>
                    <Typography>{selectedTrip.travel_type}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip
                      label={selectedTrip.status.replace('_', ' ')}
                      color={getStatusColor(selectedTrip.status) as any}
                      size="small"
                    />
                  </Box>
                </Box>
                {selectedTrip.business_purpose && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">Business Purpose</Typography>
                    <Typography>{selectedTrip.business_purpose}</Typography>
                  </Box>
                )}
              </Box>

              {/* Itinerary Details */}
              {selectedTrip.itineraries && selectedTrip.itineraries.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    🗺️ Complete Itinerary ({selectedTrip.itineraries.length} items)
                  </Typography>
                  <Stack spacing={3}>
                    {selectedTrip.itineraries.map((itinerary, index) => (
                      <Paper elevation={1} sx={{ p: 3, borderLeft: 4, borderColor: 'primary.main' }} key={index}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {itinerary.type === 'flight' && <FlightTakeoffIcon />}
                          {itinerary.type === 'hotel' && <HotelIcon />}
                          {itinerary.type === 'car' && <DriveEtaIcon />}
                          {itinerary.type === 'train' && <TrainIcon />}
                          {itinerary.type.toUpperCase()}
                        </Typography>

                        {/* Itinerary Details Display */}
                        <Box sx={{ mt: 2 }}>
                          {itinerary.type === 'flight' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Typography variant="body2" sx={{ display: 'flex', gap: 2 }}>
                                <strong>From:</strong> {itinerary.details.departFrom || 'N/A'}
                                <strong>To:</strong> {itinerary.details.arriveAt || 'N/A'}
                              </Typography>
                              <Typography variant="body2" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <span><strong>Departure:</strong> {itinerary.details.departureDate || 'N/A'}</span>
                                <span><strong>Time:</strong> {itinerary.details.departTime ? `${itinerary.details.departTime} (${getTimeSlotLabel(itinerary.details.departTime)})` : 'N/A'}</span>
                              </Typography>
                              {itinerary.details.tripType === 'roundtrip' && itinerary.details.returnDate && (
                                <Typography variant="body2" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                  <span><strong>Return:</strong> {itinerary.details.returnDate}</span>
                                  <span><strong>Time:</strong> {itinerary.details.returnTime ? `${itinerary.details.returnTime} (${getTimeSlotLabel(itinerary.details.returnTime)})` : 'N/A'}</span>
                                </Typography>
                              )}
                              <Typography variant="body2" sx={{ display: 'flex', gap: 4 }}>
                                <span><strong>Seat:</strong> {itinerary.details.seatPreference || 'N/A'}</span>
                                <span><strong>Meal:</strong> {itinerary.details.mealPreference || 'N/A'}</span>
                              </Typography>
                              {itinerary.details.description && (
                                <Typography variant="body2">
                                  <strong>Notes:</strong> {itinerary.details.description}
                                </Typography>
                              )}
                            </Box>
                          )}

                          {itinerary.type === 'hotel' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Typography variant="body2">
                                <strong>Location:</strong> {itinerary.details.location || 'N/A'}
                              </Typography>
                              <Typography variant="body2" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <span><strong>Check-in:</strong> {itinerary.details.checkinDate || 'N/A'} at {itinerary.details.checkinTime || 'N/A'}</span>
                                <span><strong>Check-out:</strong> {itinerary.details.checkoutDate || 'N/A'} at {itinerary.details.checkoutTime || 'N/A'}</span>
                              </Typography>
                              <Typography variant="body2">
                                <strong>Meals:</strong> {itinerary.details.mealType?.join(', ') || 'N/A'}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Meal Preference:</strong> {itinerary.details.mealPreference || 'N/A'}
                              </Typography>
                              {itinerary.details.description && (
                                <Typography variant="body2">
                                  <strong>Notes:</strong> {itinerary.details.description}
                                </Typography>
                              )}
                            </Box>
                          )}

                          {itinerary.type === 'car' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Typography variant="body2" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <span><strong>From:</strong> {itinerary.details.pickupLocation || 'N/A'}</span>
                                <span><strong>To:</strong> {itinerary.details.dropoffLocation || 'N/A'}</span>
                              </Typography>
                              <Typography variant="body2" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <span><strong>Pick-up:</strong> {itinerary.details.pickupDate || 'N/A'} at {itinerary.details.pickupTime || 'N/A'}</span>
                                <span><strong>Drop-off:</strong> {itinerary.details.dropoffDate || 'N/A'} at {itinerary.details.dropoffTime || 'N/A'}</span>
                              </Typography>
                              <Typography variant="body2">
                                <strong>Car Type:</strong> {itinerary.details.carType || 'N/A'}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Driver Required:</strong> {itinerary.details.driverNeeded ? 'Yes' : 'No'}
                              </Typography>
                              {itinerary.details.description && (
                                <Typography variant="body2">
                                  <strong>Notes:</strong> {itinerary.details.description}
                                </Typography>
                              )}
                            </Box>
                          )}

                          {itinerary.type === 'train' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Typography variant="body2" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <span><strong>From:</strong> {itinerary.details.departFrom || 'N/A'}</span>
                                <span><strong>To:</strong> {itinerary.details.arriveAt || 'N/A'}</span>
                              </Typography>
                              <Typography variant="body2">
                                <strong>Departure:</strong> {itinerary.details.departureDate || 'N/A'} at {itinerary.details.departTime ? `${itinerary.details.departTime} (${getTimeSlotLabel(itinerary.details.departTime)})` : 'N/A'}
                              </Typography>
                              <Typography variant="body2" sx={{ display: 'flex', gap: 4 }}>
                                <span><strong>Class:</strong> {itinerary.details.classPreference || 'N/A'}</span>
                                <span><strong>Berth:</strong> {itinerary.details.berthPreference || 'N/A'}</span>
                              </Typography>
                              {itinerary.details.description && (
                                <Typography variant="body2">
                                  <strong>Notes:</strong> {itinerary.details.description}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Files */}
              {selectedTrip.files && selectedTrip.files.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Attached Files ({selectedTrip.files.length})
                  </Typography>
                  <Stack spacing={1}>
                    {selectedTrip.files.map((file, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {file.filename} ({file.file_type})
                        </Typography>
                        <Button
                          size="small"
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

      {/* Admin Cancellation Confirmation Dialog */}
      <Dialog open={cancellationConfirmOpen} onClose={() => setCancellationConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            You are confirming the cancellation for <strong>{selectedCancellationTrip?.trip_name}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Requester Reason: {selectedCancellationTrip && (selectedCancellationTrip as any).cancellation_reason}
          </Typography>
          <TextField
            label="Cancellation Charges (₹)"
            type="number"
            fullWidth
            value={cancellationCost}
            onChange={(e) => setCancellationCost(e.target.value)}
            helperText="Enter any cancellation fees charged by vendors. Enter 0 if none."
            required
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancellationConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitCancellation} 
            color="error" 
            variant="contained"
            disabled={!cancellationCost}
          >
            Confirm & Close Trip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Upload Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Upload Receipts & Set Cost for {selectedReceiptTrip?.reference_no}
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {selectedReceiptTrip && (
            <Stack spacing={3}>
              {/* Trip Summary */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  📋 Trip Summary
                </Typography>
                <Typography variant="body2">
                  Requester: <strong>{selectedReceiptTrip.requester_name}</strong>
                </Typography>
                <Typography variant="body2">
                  Trip: {selectedReceiptTrip.trip_name}
                </Typography>
                <Typography variant="body2">
                  Selected Option: {selectedReceiptTrip.option_selected}
                </Typography>
              </Box>

              {/* Cost Input */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  💰 Enter Total Trip Cost (₹)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Cost (₹)"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  inputProps={{
                    min: '1',
                    step: '1'
                  }}
                  helperText="Enter the total cost of the trip (integers only)"
                  sx={{ mb: 2 }}
                  variant="outlined"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                  }}
                />
              </Box>

              {/* File Upload */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  📎 Upload Receipt Files
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  sx={{
                    minHeight: 120,
                    flexDirection: 'column',
                    gap: 1,
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    }
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="body1" color="primary">
                    Click to Upload Receipt Files
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReceiptFiles ? `${selectedReceiptFiles.length} file(s) selected` : 'Accepts all file formats'}
                  </Typography>
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => setSelectedReceiptFiles(e.target.files)}
                  />
                </Button>

                {selectedReceiptFiles && selectedReceiptFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      📁 Selected Files ({selectedReceiptFiles.length}):
                    </Typography>
                    {Array.from(selectedReceiptFiles).map((file, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, mb: 1 }}>
                        <AssignmentIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>{file.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setReceiptDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const costNum = parseInt(cost, 10);
              if (!selectedReceiptTrip || !cost || isNaN(costNum) || costNum <= 0 || !Number.isInteger(costNum)) {
                alert('Please enter a valid integer cost and upload at least one receipt file.');
                return;
              }

              setUploading(true);
              try {
                const formData = new FormData();
                formData.append('totalCost', cost);

                if (selectedReceiptFiles) {
                  Array.from(selectedReceiptFiles).forEach(file => {
                    formData.append('files', file);
                  });
                }

                await axios.post(`${API_BASE_URL}/api/trips/${selectedReceiptTrip.id}/receipts`, formData, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                  }
                });

                setReceiptDialogOpen(false);
                refreshTrips();
                alert('Receipts uploaded and trip cost set successfully!');
              } catch (error: any) {
                alert(`Upload failed: ${error.response?.data?.error || error.message}`);
              }
              setUploading(false);
            }}
            variant="contained"
            disabled={!cost || parseInt(cost, 10) <= 0 || !Number.isInteger(parseInt(cost, 10)) || !selectedReceiptFiles || selectedReceiptFiles.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Finalize'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Range Picker Dialog */}
      <Dialog 
        open={dateRangePickerOpen} 
        onClose={() => setDateRangePickerOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { maxWidth: '800px' } }} // Wider dialog for side-by-side calendars
      >
        <DialogTitle>Select Date Range</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <DateRangePicker
              value={[
                 pickerStartDate ? dayjs(pickerStartDate) : null,
                 pickerEndDate ? dayjs(pickerEndDate) : null
              ]}
              onChange={(newValue) => {
                 setPickerStartDate(newValue[0] ? newValue[0].format('YYYY-MM-DD') : '');
                 setPickerEndDate(newValue[1] ? newValue[1].format('YYYY-MM-DD') : '');
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
             setPickerStartDate('');
             setPickerEndDate('');
          }}>Clear Selection</Button>
          <Button onClick={() => setDateRangePickerOpen(false)}>Cancel</Button>
          <Button onClick={handleApplyDateRange} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {uploading && <LinearProgress />}
    </Container>
  );
};

export default TravelManagement;
