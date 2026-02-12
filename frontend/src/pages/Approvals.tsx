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
  TextField,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tab,
  Tabs,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Send,
  ExpandMore,
  FlightTakeoff,
  Hotel,
  DriveEta,
  Train,
  Person,
  // AccessTime,
  // LocationOn,
  Work,
  Pending,
  Done,
  Close,
} from '@mui/icons-material';

interface ItineraryItem {
  id: number;
  type: 'flight' | 'hotel' | 'car' | 'train';
  trip_id: number;
  details: any;
}

interface Approval {
  id: number;
  trip_id: number;
  approver_role: string;
  timestamp: string;
  action?: string;
  comments?: string;
  action_timestamp?: string;
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
  created_at: string;
  itineraries: ItineraryItem[];
  option_selected?: string;
  total_cost?: number;
  mmt_payload?: any;
}

const Approvals: React.FC = () => {
  const { user, token } = useAuth();
  /* 
    The original filtering logic (client-side) is replaced by server-side filtering & pagination.
    We need to track each tab's count separately if possible, OR just trust the infinite scroll.
    For the counts in tabs, we might need a separate API call or just remove counts if they are expensive.
    However, to increase performance, we should avoid fetching all. 
    We will modify the UI to remove explicit counts or fetch them separately if critical.
    For this task, we will remove the exact counts from the tabs or just show loaded count to simplify, 
    as the main goal is infinite scroll. Or better, we can assume counts are not strictly required 
    or we can implement a separate 'get counts' API later. For now let's focus on the list.
  */

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [comments, setComments] = useState<{ [key: number]: string }>({});
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);

  const getTimeSlotLabel = (time: string) => {
    if (time >= '12:00' && time <= '19:59') return '12AM - 8AM';
    if (time >= '08:00' && time <= '11:59') return '8AM - 12PM';
    if (time >= '12:00' && time <= '19:59') return '12PM - 8PM';
    if (time >= '20:00' || time <= '07:59') return '8PM - 12AM';
    return 'Anytime';
  };
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observer = React.useRef<IntersectionObserver | null>(null);
  
  const lastApprovalElementRef = React.useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/approvals/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  // Update stats when an action is taken
  const refreshStats = () => {
      fetchStats();
  };

  /* 
    Moving getFilterForTab helper inside useCallback or using it directly 
    as it doesn't need to be exposed. 
  */

  const fetchApprovals = React.useCallback(async (pageNum: number, tabIndex: number) => {
    setLoading(true);
    try {
      let filter = 'pending';
      switch(tabIndex) {
        case 0: filter = 'pending'; break;
        case 1: filter = 'approved'; break;
        case 2: filter = 'rejected'; break;
        default: filter = 'pending';
      }
      
      const limit = 20;
      const offset = pageNum * limit;
      
      const response = await axios.get(
        `${API_BASE_URL}/api/approvals?limit=${limit}&offset=${offset}&filter=${filter}`
      );
      
      const newApprovals = response.data;
      if (newApprovals.length < limit) {
         setHasMore(false);
      } else {
         setHasMore(true);
      }

      setApprovals(prev => pageNum === 0 ? newApprovals : [...prev, ...newApprovals]);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      // Reset state when tab changes
      setPage(0);
      setHasMore(true);
      setApprovals([]);
      fetchApprovals(0, tabValue);
      fetchStats();
    }
  }, [token, tabValue, fetchApprovals]);

  useEffect(() => {
    if (page > 0) {
      fetchApprovals(page, tabValue);
    }
  }, [page, tabValue, fetchApprovals]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
     setTabValue(newValue);
  };

  const handleApprovalAction = async (approvalId: number, action: string) => {
    try {
      const comment = comments[approvalId] || '';
      await axios.post(`${API_BASE_URL}/api/approvals/${approvalId}`, {
        action,
        comments: comment
      });
      
      // Refresh list (remove the item from the list locally to avoid refetching whole page)
      setApprovals(prev => prev.filter(a => a.id !== approvalId));
      refreshStats(); // Refresh counts
      
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };
  
  if (!['user', 'travel_admin', 'super_admin'].includes(user?.role || '')) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          You don't have access to this page.
        </Typography>
      </Container>
    );
  }

  // We no longer filter client side. 'approvals' contains the relevant data for current tab.
  const currentApprovals = approvals;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Approval Management
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab
            icon={<Pending />}
            label={`Pending (${stats.pending})`}
            iconPosition="start"
          />
          <Tab
            icon={<Done />}
            label={`Approved (${stats.approved})`}
            iconPosition="start"
          />
          <Tab
            icon={<Close />}
            label={`Rejected (${stats.rejected})`}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {currentApprovals.length === 0 ? (
        <Typography variant="h6" color="textSecondary" sx={{ textAlign: 'center', mt: 8 }}>
          {tabValue === 0 ? 'No pending approvals at this time' :
           tabValue === 1 ? 'No approved applications' :
           'No rejected applications'}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {currentApprovals.map((approval, index) => (
            <div ref={index === currentApprovals.length - 1 ? lastApprovalElementRef : null} key={approval.id}>
            <Card elevation={3}>
              {/* Header Section */}
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Work sx={{ fontSize: 28, color: 'primary.main' }} />
                    <Typography variant="h5" component="h2">
                      {approval.trip_name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {approval.action && (
                      <Chip
                        label={approval.action === 'accept' ? 'APPROVED' : 'REJECTED'}
                        color={approval.action === 'accept' ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}
                    <Chip
                      label={approval.approver_role.toUpperCase()}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Box>

                {/* Basic Information */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 300 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Requester
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ ml: 3 }}>
                      {approval.requester_name} ({approval.requester_id})
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 3, color: 'text.secondary' }}>
                      {approval.designation} - {approval.department}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 300 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Reference No.
                      </Typography>
                      <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {approval.reference_no}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Created: {new Date(approval.created_at).toLocaleString()}
                      </Typography>
                      {approval.action_timestamp && (
                        <Typography variant="body2" color="text.secondary">
                          Decided: {new Date(approval.action_timestamp).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Travel Details */}
                <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                    📋 Trip Details
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <Typography variant="body2" color="text.secondary">Travel Type</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {approval.travel_type}
                        {approval.travel_type === 'International' && (
                          <>
                            {approval.destination_country && (
                              <Chip
                                label={`🌍 ${approval.destination_country}`}
                                size="small"
                              />
                            )}
                            {approval.visa_required && (
                              <Chip
                                label="🛂 Visa Required"
                                size="small"
                                color="warning"
                              />
                            )}
                          </>
                        )}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 300 }}>
                      <Typography variant="body2" color="text.secondary">Business Purpose</Typography>
                      <Typography variant="body1" sx={{
                        mt: 0.5,
                        p: 1,
                        bgcolor: 'white',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'grey.300'
                      }}>
                        {approval.business_purpose}
                      </Typography>
                    </Box>
                  </Box>
                </Box>



                {/* MMT Selection Display */}
                {approval.option_selected && (
                   <Box sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', border: 1, borderColor: '#2196f3', borderRadius: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom sx={{ mb: 1, color: '#1565c0', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ fontSize: 20 }} /> Requester Selected Option (MMT)
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                           {approval.option_selected}
                        </Typography>
                        {approval.total_cost && (
                          <Chip 
                            label={`Est. Cost: ₹${approval.total_cost.toLocaleString('en-IN')}`} 
                            color="success" 
                            variant="filled"
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                      </Box>
                      {/* Show booking ID if available (e.g. for Travel Admin) */}
                      {approval.mmt_payload?.booking_id && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                          MMT Reference: {approval.mmt_payload.booking_id}
                        </Typography>
                      )}
                   </Box>
                )}

                {/* Itinerary Preview */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                    📅 Itinerary Summary ({approval.itineraries.length} items)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {approval.itineraries.map((itinerary, index) => {
                      const icon =
                        itinerary.type === 'flight' ? <FlightTakeoff /> :
                        itinerary.type === 'hotel' ? <Hotel /> :
                        itinerary.type === 'car' ? <DriveEta /> :
                        <Train />;

                      return (
                        <Chip
                          key={itinerary.id}
                          icon={icon}
                          label={`${itinerary.type.toUpperCase()} ${index + 1}`}
                          variant="outlined"
                          size="small"
                        />
                      );
                    })}
                  </Box>
                </Box>

                {/* Comments Display for Completed Approvals */}
                {approval.action && approval.comments && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Comments from {approval.approver_role.toUpperCase()}:
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {approval.comments}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              {/* Expandable Details */}
              <Accordion elevation={0}>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{ backgroundColor: 'grey.50', borderTop: 1, borderColor: 'grey.200' }}
                >
                  <Typography sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                    View Full Trip Details & Itinerary
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ color: 'primary.main' }}>
                    🗺️ Complete Itinerary
                  </Typography>

                  {/* Full Itinerary Display */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {approval.itineraries.map((itinerary, index) => (
                      <Paper elevation={1} sx={{ p: 2, borderLeft: 4, borderColor: 'primary.main' }} key={itinerary.id}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {itinerary.type === 'flight' && <FlightTakeoff />}
                          {itinerary.type === 'hotel' && <Hotel />}
                          {itinerary.type === 'car' && <DriveEta />}
                          {itinerary.type === 'train' && <Train />}
                          {itinerary.type.toUpperCase()}
                        </Typography>

                        {/* Itinerary Details Display - same as before */}
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
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Only show actions for pending approvals */}
              {!approval.action && (
                <Box sx={{ p: 3, borderTop: 1, borderColor: 'grey.200', bgcolor: 'grey.25' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                    Approval Decision
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Comments (Optional)"
                    placeholder="Add any comments for this approval decision..."
                    value={comments[approval.id] || ''}
                    onChange={(e) => setComments({ ...comments, [approval.id]: e.target.value })}
                    sx={{ mt: 2, mb: 3 }}
                    variant="outlined"
                  />

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleApprovalAction(approval.id, 'accept')}
                      size="large"
                      fullWidth
                      sx={{ py: 1.5 }}
                    >
                       Accept
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleApprovalAction(approval.id, 'reject')}
                      size="large"
                      fullWidth
                      sx={{ py: 1.5 }}
                    >
                       Reject
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<Send />}
                      onClick={() => handleApprovalAction(approval.id, 'send_back')}
                      size="large"
                      fullWidth
                      sx={{ py: 1.5 }}
                    >
                       Send Back for Edit
                    </Button>
                  </Stack>
                </Box>
              )}
            </Card>
            </div>
          ))}
            {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>Loading more...</Typography>
            </Box>
            )}
        </Box>
      )}
    </Container>
  );
};

export default Approvals;
