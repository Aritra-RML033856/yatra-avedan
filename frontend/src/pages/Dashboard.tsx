// Dashboard.tsx (fixed)
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Container,
  // Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
  Skeleton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Assignment,
  CheckCircle,
  People,
  Analytics,
  FlightTakeoff,
  NotificationsActive,
  History,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { motion, Variants } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [kpiData, setKpiData] = useState({ 
    pendingApprovals: 0, 
    myTrips: 0, 
    activeTrips: 0,
    nextTrip: null as any,
    statusStats: [] as any[],
    annualSpend: 0,
    recentActivity: [] as any[] 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setError(null);
        console.log('Fetching KPIs...');
        const response = await axios.get(`${API_BASE_URL}/api/dashboard/kpis`);
        console.log('KPI Data received:', response.data);
        if (response.data) {
           setKpiData(response.data);
        }
      } catch (err: any) {
        console.error('Error fetching KPIs:', err);
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load dashboard data';
        setError(errorMessage);
        
        // Retry logic only for server/network errors
        if (!err.response || err.response.status >= 500) {
             setTimeout(() => {
                if (token) fetchKPIs();
             }, 5000);
        }
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchKPIs();
  }, [token]);

  if (!user) {
    return <Navigate to="/signin" />;
  }

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const quickActions = [
    {
      to: '/new-request',
      label: 'New Trip Request',
      desc: 'Start a new travel application',
      icon: <FlightTakeoff sx={{ fontSize: 40 }} />,
      color: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      iconColor: '#1976d2',
      always: true
    },
    {
      to: '/my-trips',
      label: 'My Trips',
      desc: 'View your history and status',
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
      iconColor: '#7b1fa2',
      always: true
    },
    {
      to: '/approvals',
      label: 'Approvals',
      desc: 'Manage pending requests',
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
      iconColor: '#388e3c',
      always: true
    },
    {
      to: '/analytics',
      label: 'Analytics',
      desc: 'View insights and reports',
      icon: <Analytics sx={{ fontSize: 40 }} />,
      color: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
      iconColor: '#f57c00',
      roles: ['super_admin', 'travel_admin']
    },
    {
      to: '/user-management',
      label: 'User Management',
      desc: 'Manage users & roles',
      icon: <People sx={{ fontSize: 40 }} />,
      color: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)',
      iconColor: '#c2185b',
      roles: ['super_admin']
    },
  ];

  const StatCard = ({ title, value, icon, color }: any) => {
    // Placeholder for trend - in real app, this would come from API
    const trend = Math.random() > 0.5 ? 'up' : 'down';
    const trendValue = Math.floor(Math.random() * 20) + 1;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <Card
          elevation={0}
          sx={{
            height: '100%',
            borderRadius: 4,
            background: color,
            color: '#2d3748',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{
            position: 'absolute',
            right: -20,
            top: -20,
            opacity: 0.1,
            transform: 'rotate(15deg)',
            color: '#2d3748'
          }}>
            {icon}
          </Box>
          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 500, mb: 1, color: '#4a5568' }}>
              {title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h2" sx={{ fontWeight: 700, color: '#1a202c' }}>
                {loading ? <Skeleton width={80} /> : value}
              </Typography>
              {!loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {trend === 'up' ? (
                    <TrendingUp sx={{ color: '#38a169', fontSize: 20 }} />
                  ) : (
                    <TrendingDown sx={{ color: '#e53e3e', fontSize: 20 }} />
                  )}
                  <Typography variant="caption" sx={{ color: trend === 'up' ? '#38a169' : '#e53e3e', fontWeight: 600 }}>
                    {trendValue}%
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const StatusChart = () => {
    if (!kpiData.statusStats || kpiData.statusStats.length === 0) return null;

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Request Status</Typography>
        <Box>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Skeleton width="60%" height={20} sx={{ mb: 0.5 }} />
                <Skeleton width="100%" height={8} />
              </Box>
            ))
          ) : (
            kpiData.statusStats.map((stat: any) => {
              const max = Math.max(...kpiData.statusStats.map((s: any) => parseInt(s.count) || 0));
              const pct = max > 0 ? (parseInt(stat.count) / max) * 100 : 0;
              const barColor =
                stat.status === 'APPROVED' ? '#00C851' :
                stat.status === 'BOOKED' ? '#33b5e5' :
                stat.status === 'REJECTED' ? '#ff4444' : '#ffbb33';

              return (
                <Box key={stat.status} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{stat.status}</Typography>
                    <Typography variant="body2">{stat.count}</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, bgcolor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{
                      width: `${pct}%`,
                      height: '100%',
                      bgcolor: barColor,
                      borderRadius: 4
                    }} />
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Paper>
    );
  };

  const NextTripCard = () => {
    if (!kpiData.nextTrip) return null;
    const trip = kpiData.nextTrip;
    const date = new Date(trip.expected_journey_date);
    const daysLeft = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

    return (
      <Card elevation={0} sx={{ p: 2, borderRadius: 4, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', mb: 4, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
         <CardContent>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
             <Box>
               <Typography variant="overline" sx={{ opacity: 0.8 }}>Next Trip</Typography>
               <Typography variant="h4" sx={{ fontWeight: 700 }}>{trip.destination_country || 'Destination'}</Typography>
               <Typography variant="h6" sx={{ opacity: 0.9 }}>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Typography>
             </Box>
             <Box sx={{ textAlign: 'right' }}>
               <Typography variant="h3" sx={{ fontWeight: 800 }}>{daysLeft}</Typography>
               <Typography variant="body2">days to go</Typography>
             </Box>
           </Box>
         </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{
      flexGrow: 1,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%)',
      pb: 2
    }}>
      <Container maxWidth="xl" sx={{ mt: 0 }}>

        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 800, color: '#1a237e', fontSize: '3rem' }}>
              {getTimeBasedGreeting()}, {user?.username ? user.username.split(' ')[0] : 'User'}
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 400, fontSize: '1.25rem' }}>
              Here's what's happening with your travel requests today.
            </Typography>
          </Box>
        </motion.div>

        {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
        )}

        <motion.div
           variants={containerVariants}
           initial="hidden"
           animate="visible"
        >
          <Grid container spacing={4}>
            
            {/* KPI Section */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <NextTripCard />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <StatCard
                    title="Annual Spend"
                    value={`₹${(kpiData.annualSpend || 0).toLocaleString('en-IN')}`}
                    icon={<Assignment sx={{ fontSize: 100 }} />}
                    color="linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StatCard
                    title="Active Trips"
                    value={kpiData.activeTrips}
                    icon={<FlightTakeoff sx={{ fontSize: 100 }} />}
                    color="linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StatCard
                    title="Pending Approvals"
                    value={kpiData.pendingApprovals}
                    icon={<NotificationsActive sx={{ fontSize: 100 }} />}
                    color="linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StatCard
                    title="Total Trips"
                    value={kpiData.myTrips}
                    icon={<History sx={{ fontSize: 100 }} />}
                    color="linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)"
                  />
                </Grid>
                
                <Grid item xs={12}>
                   <StatusChart />
                </Grid>

                {/* Quick Actions */}
                <Grid item xs={12}>
                  <Typography variant="h5" sx={{ mt: 4, mb: 3, fontWeight: 700, color: '#2d3748' }}>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={3}>
                    {quickActions.map((item) => {
                      const allowed = item.always || (item.roles && user?.role && item.roles.includes(user.role));
                      if (!allowed) return null;
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={item.to}>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Tooltip title={item.desc} arrow>
                              <Card
                                component={Link}
                                to={item.to}
                                sx={{
                                  textDecoration: 'none',
                                  background: 'rgba(255, 255, 255, 0.8)',
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  borderRadius: 4,
                                  height: 160,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  transition: 'all 0.3s ease',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                  '&:hover': {
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                                    borderColor: 'transparent',
                                    transform: 'translateY(-2px)'
                                  }
                                }}
                              >
                              <Box sx={{
                                p: 2,
                                borderRadius: '50%',
                                background: item.color,
                                color: item.iconColor,
                                mb: 2,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                              }}>
                                {React.cloneElement(item.icon as any, { sx: { fontSize: 32 } })}
                              </Box>
                              <Typography variant="h6" sx={{ color: '#2d3748', fontWeight: 600 }}>
                                {item.label}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                                {item.desc}
                              </Typography>
                            </Card>
                            </Tooltip>
                          </motion.div>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Recent Activity Sidebar */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History sx={{ color: 'primary.main' }} /> Recent Activity
                  </Typography>
                  
                  <List>
                    {kpiData.recentActivity.length === 0 ? (
                      <ListItem>
                        <ListItemText 
                          primary="No recent activity" 
                          secondary="Your recent actions will appear here"
                        />
                      </ListItem>
                    ) : (
                      kpiData.recentActivity.map((item, index) => (
                        <React.Fragment key={index}>
                          <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: item.type === 'trip' ? 'primary.light' : 'secondary.light' }}>
                                {item.type === 'trip' ? <FlightTakeoff /> : <CheckCircle />}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {item.description}
                                </Typography>
                              }
                              secondary={
                                <React.Fragment>
                                  <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.primary', mt: 0.5 }}>
                                    {item.trip_name || item.reference_no}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(item.timestamp).toLocaleDateString(undefined, {
                                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                    {item.initiator && ` • by ${item.initiator}`}
                                  </Typography>
                                </React.Fragment>
                              }
                            />
                          </ListItem>
                          {index < kpiData.recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                      ))
                    )}
                  </List>
                </Paper>
              </motion.div>
            </Grid>

          </Grid>
        </motion.div>
      </Container>

      {/* Footer with buildings image - part of page flow (not fixed) */}
<Box
  sx={{
    width: '100%',
    mt: { xs: 3, sm: 4, md: 6 },

    aspectRatio: '16 / 9', // or your image’s real ratio
    maxHeight: {
      xs: 180,
      sm: 220,
      md: 260,
    },

    backgroundImage: 'url(/buildings.png)',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'contain',
    backgroundPosition: 'center',

    marginInline: 'auto',
    opacity: 0.9,
    pointerEvents: 'none',
  }}
/>


    </Box>
  );
};

export default Dashboard;
