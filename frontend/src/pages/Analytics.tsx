import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Skeleton,
  LinearProgress,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Bar,
  Line,
  Pie,
  Doughnut
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement,
} from 'chart.js';
import {
  Flight as FlightIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement,
);

const Analytics: React.FC = () => {
  const { user, token } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<any>({
    statusStats: [],
    monthlyStats: [],
    topDestinations: [],
    travelTypeStats: [],
    monthlySpendStats: [],
    departmentSpendStats: [],
    roleSpendStats: [],
    totalSpend: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnalyticsData(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAnalytics();
  }, [token]);

  if (!['travel_admin', 'super_admin'].includes(user?.role || '')) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          You don't have access to this page.
        </Typography>
      </Container>
    );
  }

  // Calculate summary metrics
  const totalTrips = analyticsData.statusStats.reduce((sum: number, stat: any) => sum + Number(stat.count), 0);
  const activeTrips = analyticsData.statusStats.filter((stat: any) =>
    ['APPROVED', 'SELECT_OPTION', 'OPTION_SELECTED', 'BOOKED'].includes(stat.status)
  ).reduce((sum: number, stat: any) => sum + Number(stat.count), 0) || 0;
  const processingTrips = analyticsData.statusStats.filter((stat: any) =>
    ['PENDING', 'RM_PENDING', 'TRAVEL_ADMIN_PENDING'].includes(stat.status)
  ).reduce((sum: number, stat: any) => sum + Number(stat.count), 0) || 0;
  const bookedTrips = analyticsData.statusStats.find((stat: any) => stat.status === 'BOOKED')?.count || 0;

  const summaryCards = [
    {
      title: 'Total Trips',
      value: totalTrips,
      icon: <FlightIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      bgColor: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
    },
    {
      title: 'In Progress',
      value: processingTrips,
      icon: <ScheduleIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      bgColor: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)'
    },
    {
      title: 'Active Trips',
      value: activeTrips,
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50',
      bgColor: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)'
    },
    {
      title: 'Total Spend',
      value: `₹${analyticsData.totalSpend?.toLocaleString('en-IN') || '0'}`,
      icon: <BusinessIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
      bgColor: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)'
    },
  ];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#333',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 8,
        displayColors: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'nearest' as const,
    },
  };

  const statusChartData = {
    labels: analyticsData.statusStats.map((stat: any) => {
      const labels: { [key: string]: string } = {
        'PENDING': 'Pending',
        'APPROVED': 'Approved',
        'RM_PENDING': 'Reporting Manager Review',
        'TRAVEL_ADMIN_PENDING': 'Travel Admin Review',
        'SELECT_OPTION': 'Option Selected',
        'OPTION_SELECTED': 'Option Selected',
        'BOOKED': 'Booked',
        'CLOSED': 'Closed',
        'REJECTED': 'Rejected',
        'EDIT': 'Needs Edit'
      };
      return labels[stat.status] || stat.status.replace('_', ' ');
    }),
    datasets: [
      {
        label: 'Trips by Status',
        data: analyticsData.statusStats.map((stat: any) => stat.count),
        backgroundColor: [
          '#e0e0e0', // Pending
          '#4caf50', // Approved
          '#ff9800', // Reporting Manager Review
          '#2196f3', // Travel Admin Review
          '#ff5722', // Option Selected
          '#ff5722', // Option Selected
          '#3f51b5', // Booked
          '#607d8b', // Closed
          '#f44336', // Rejected
          '#ffeb3b', // Edit
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const monthlyChartData = {
    labels: analyticsData.monthlyStats.map((stat: any) =>
      new Date(stat.year, stat.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    ),
    datasets: [
      {
        label: 'Monthly Trips',
        data: analyticsData.monthlyStats.map((stat: any) => stat.count),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#1976d2',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#1565c0',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const topDestinationsChartData = {
    labels: analyticsData.topDestinations.map((stat: any) => stat.city),
    datasets: [
      {
        label: 'Number of Trips',
        data: analyticsData.topDestinations.map((stat: any) => stat.count),
        backgroundColor: '#2196f3',
        borderColor: '#1976d2',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
        hoverBackgroundColor: '#1976d2',
        hoverBorderWidth: 2,
      },
    ],
  };

  const travelTypeChartData = {
    labels: analyticsData.travelTypeStats.map((stat: any) =>
      stat.travel_type === 'Domestic' ? 'Domestic 🇮🇳' : 'International 🌍'
    ),
    datasets: [
      {
        label: 'Travel Type Distribution',
        data: analyticsData.travelTypeStats.map((stat: any) => stat.count),
        backgroundColor: [
          'rgba(255, 152, 0, 0.8)',
          'rgba(76, 175, 80, 0.8)',
        ],
        borderColor: [
          '#ff9800',
          '#4caf50',
        ],
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          📊 Analytics Dashboard
        </Typography>

        <LinearProgress sx={{ mb: 4, height: 8, borderRadius: 4 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Paper key={i} sx={{ flex: '1 1 300px', minWidth: 300, borderRadius: 4, overflow: 'hidden' }}>
              <Skeleton variant="rectangular" height={140} />
            </Paper>
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Paper key={i} sx={{ flex: '1 1 600px', minWidth: 600, p: 3, borderRadius: 4 }}>
              <Skeleton variant="text" height={60} />
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mt: 2 }} />
            </Paper>
          ))}
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          ⚠️ Failed to load analytics data
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Please refresh the page or try again later.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>
          <TrendingUpIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Travel request insights and trends
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {summaryCards.map((card, index) => (
          <Card key={index} sx={{
            flex: '1 1 300px',
            minWidth: 300,
            borderRadius: 4,
            background: card.bgColor,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              right: -20,
              bottom: -20,
              width: 100,
              height: 100,
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
            }
          }}>
            <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 600 }}>
                  {card.title}
                </Typography>
                <Box sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {card.icon}
                </Box>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {card.value.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Charts Grid */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Status Distribution */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                <BusinessIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Trip Status Distribution
              </Typography>
            </Box>
            <Box sx={{ height: 350, position: 'relative' }}>
              <Doughnut
                data={statusChartData}
                options={{
                  ...chartOptions,
                  cutout: '60%',
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 12,
                        padding: 15,
                      }
                    }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                <TrendingUpIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Monthly Trends
              </Typography>
            </Box>
            <Box sx={{ height: 350 }}>
              <Line
                data={monthlyChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'top',
                      align: 'end',
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                    },
                    y: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                      beginAtZero: true,
                    }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Top Destinations */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#2196f3', mr: 2 }}>
                <LocationIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Popular Destinations
              </Typography>
            </Box>
            <Box sx={{ height: 350 }}>
              <Bar
                data={topDestinationsChartData}
                options={{
                  ...chartOptions,
                  indexAxis: 'y',
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: false,
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                      beginAtZero: true,
                    },
                    y: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                    }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Travel Types */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#9c27b0', mr: 2 }}>
                <FlightIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Travel Types
              </Typography>
            </Box>
            <Box sx={{ height: 350 }}>
              <Pie
                data={travelTypeChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                      }
                    }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Spending Analysis Section */}
      <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 3, fontWeight: 600, color: '#1976d2' }}>
        💰 Spending Analytics
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {/* Monthly Spend Trends */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#f57c00', mr: 2 }}>
                <TrendingUpIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Monthly Spend Trends
              </Typography>
            </Box>
            <Box sx={{ height: 350 }}>
              <Line
                data={{
                  labels: analyticsData.monthlySpendStats.map((stat: any) =>
                    new Date(stat.year, stat.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  ),
                  datasets: [
                    {
                      label: 'Monthly Spend (₹)',
                      data: analyticsData.monthlySpendStats.map((stat: any) => stat.total_spend),
                      borderColor: '#f57c00',
                      backgroundColor: 'rgba(245, 124, 0, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.3,
                      pointBackgroundColor: '#f57c00',
                      pointBorderColor: '#ffffff',
                      pointBorderWidth: 2,
                      pointRadius: 6,
                      pointHoverRadius: 8,
                    },
                  ],
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      ...chartOptions.plugins.tooltip,
                      callbacks: {
                        label: (context) => `₹${context.parsed?.y?.toLocaleString('en-IN') || '0'}`,
                      },
                    },
                    legend: {
                      position: 'top',
                      align: 'end',
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                    },
                    y: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${value.toLocaleString('en-IN')}`,
                      },
                    }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Department Spend Distribution */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#7b1fa2', mr: 2 }}>
                <BusinessIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Department Spend Distribution
              </Typography>
            </Box>
            <Box sx={{ height: 350 }}>
              <Bar
                data={{
                  labels: analyticsData.departmentSpendStats.map((stat: any) => stat.department),
                  datasets: [
                    {
                      label: 'Total spend per department',
                      data: analyticsData.departmentSpendStats.map((stat: any) => stat.total_spend),
                      backgroundColor: '#7b1fa2',
                      borderColor: '#6200ea',
                      borderWidth: 1,
                      borderRadius: 4,
                      borderSkipped: false,
                      hoverBackgroundColor: '#6200ea',
                    },
                  ],
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: (context) => `₹${context.parsed?.y?.toLocaleString('en-IN') || '0'}`,
                      },
                    },
                    legend: {
                      display: false,
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                    },
                    y: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${value.toLocaleString('en-IN')}`,
                      },
                    }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Role Spend Insights */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#0288d1', mr: 2 }}>
                <LocationIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Spend by User Role
              </Typography>
            </Box>
            <Box sx={{ height: 350 }}>
              <Pie
                data={{
                  labels: analyticsData.roleSpendStats.map((stat: any) =>
                    stat.role === 'user' ? 'Users / Requesters' :
                    stat.role === 'reporting_manager' ? 'Reporting Managers' :
                    stat.role === 'travel_admin' ? 'Travel Admin' :
                    stat.role.replace('_', ' ').toUpperCase()
                  ),
                  datasets: [
                    {
                      label: 'Spend by Role',
                      data: analyticsData.roleSpendStats.map((stat: any) => stat.total_spend),
                      backgroundColor: [
                        '#ff9800', // Users
                        '#2196f3', // Reporting Managers
                        '#4caf50', // Travel Admin
                      ],
                      borderWidth: 3,
                      hoverOffset: 8,
                    },
                  ],
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        label: (context) => `₹${context.parsed?.toLocaleString('en-IN') || '0'}`,
                      },
                    },
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                      }
                    }
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Spend Insights */}
        <Card sx={{ flex: '1 1 600px', minWidth: 600, borderRadius: 4, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: '#d32f2f', mr: 2 }}>
                <TrendingUpIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Spend Insights
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              {analyticsData.departmentSpendStats.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    🏢 Top Spending Department
                  </Typography>
                  <Typography variant="body1">
                    <strong>{analyticsData.departmentSpendStats[0].department}</strong>:
                    ₹{analyticsData.departmentSpendStats[0].total_spend.toLocaleString('en-IN')}
                    ({Math.round(analyticsData.departmentSpendStats[0].trips_count / bookedTrips * 100)}% of trips)
                  </Typography>
                </Box>
              )}

              {analyticsData.roleSpendStats.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    👤 Highest Spending Role
                  </Typography>
                  <Typography variant="body1">
                    <strong>{analyticsData.roleSpendStats[0].role.replace('_', ' ').toUpperCase()}</strong>:
                    ₹{analyticsData.roleSpendStats[0].total_spend.toLocaleString('en-IN')}
                    (Avg: ₹{analyticsData.roleSpendStats[0].avg_spend.toLocaleString('en-IN')})
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  📈 Average Trip Cost
                </Typography>
                <Typography variant="body1">
                  ₹{bookedTrips > 0 ? (analyticsData.totalSpend / bookedTrips).toLocaleString('en-IN') : '0'}
                  (Total booked trips: {bookedTrips})
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, border: '1px solid #ffcdd2' }}>
                <Typography variant="body2" color="error">
                  💡 Insight: Travel spend can be optimized by analyzing patterns and negotiating better rates with vendors.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Export Section */}
      <Paper elevation={4} sx={{ mt: 4, p: 4, borderRadius: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#424242' }}>
          📊 Export Analytics Data
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Download comprehensive reports for detailed analysis
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<DownloadIcon />}
          onClick={() => window.open(`${API_BASE_URL}/api/trips/booked/excel`, '_blank')}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
              boxShadow: '0 6px 20px rgba(25, 118, 210, 0.6)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Download Excel Report
        </Button>
      </Paper>
    </Container>
  );
};

export default Analytics;
