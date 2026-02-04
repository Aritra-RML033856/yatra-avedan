import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  BusinessCenter,
  Assignment,
  CheckCircle,
  People,
  Analytics,
  AdminPanelSettings,
  Business,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactElement;
  roles?: string[];
}

const NavigationBar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileDialogOpen(true);
  };

  const handleProfileDialogClose = () => {
    setProfileDialogOpen(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
  };

  const handleLogout = () => {
    logout();
    handleProfileDialogClose();
    window.location.href = '/signin';
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');

    try {
      await axios.post(`${API_BASE_URL}/api/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully!');
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Define navigation items with role restrictions
  const navItems: NavItem[] = [
    {
      to: '/new-request',
      label: 'New Request',
      icon: <Business sx={{ mr: 1 }} />,
    },
    {
      to: '/my-trips',
      label: 'My Trips',
      icon: <Assignment sx={{ mr: 1 }} />,
    },
    {
      to: '/approvals',
      label: 'Approvals',
      icon: <CheckCircle sx={{ mr: 1 }} />,
      roles: ['user', 'travel_admin', 'super_admin'],
    },
    {
      to: '/travel-management',
      label: 'Travel Management',
      icon: <BusinessCenter sx={{ mr: 1 }} />,
      roles: ['travel_admin', 'super_admin'],
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: <Analytics sx={{ mr: 1 }} />,
      roles: ['travel_admin', 'super_admin'],
    },
    {
      to: '/user-management',
      label: 'User Management',
      icon: <AdminPanelSettings sx={{ mr: 1 }} />,
      roles: ['super_admin'],
    },
    {
      to: '/about',
      label: 'About Us',
      icon: <People sx={{ mr: 1 }} />,
    }
  ];

  if (!user) return null; // Don't show navbar if not authenticated

  return (
    <AppBar
      position="sticky"
      sx={{
        top: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent white
        backdropFilter: 'blur(12px)', // Enhanced glass effect
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      }}
    >
      <Toolbar>
        {/* Logo/Brand */}
        <Box
          component={Link}
          to="/"
          sx={{
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            '&:hover': {
              opacity: 0.9,
            },
          }}
        >
          <Box
            component="img"
            src="/YatraAvedan_navbar.png"
            alt="TripFlow Logo"
            sx={{
              height: 32,
              width: 'auto',
              maxWidth: 120,
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback to text if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = 'block';
              }
            }}
          />
<Typography
  variant="h5"
  noWrap
  component="div"
  sx={{
    mr: 2,
    display: { xs: 'none', md: 'flex' },
    fontFamily: '"Poppins", sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.02rem',
    textDecoration: 'none',
    lineHeight: 1,
    ml: 1,
    alignItems: 'baseline',

    // Gradient text
    background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 50%, #f97316 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',

    // fallback color for very old browsers (will be ignored by browsers that support the gradient clip)
    color: '#334155',
  }}
>
  यात्रा
  <Box
    component="span"
    sx={{
      ml: 0.5,
      fontWeight: 600,
      // different accent gradient for the second word
      background: 'linear-gradient(90deg, #ea580c 0%, #ffb400 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      // fallback color
      color: '#ea580c',
    }}
  >
    Avedan
  </Box>
</Typography>
        </Box>

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, display: 'flex', ml: 4 }}>
          {navItems.map((item) => {
            const isAllowed = !item.roles || item.roles.includes(user.role);
            const isActive = location.pathname === item.to;

            return isAllowed ? (
              <Button
                key={item.to}
                component={Link}
                to={item.to}
                startIcon={item.icon}
                sx={{
                  color: isActive ? 'primary.main' : 'text.primary',
                  mx: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  position: 'relative',
                  textTransform: 'none',
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.05)',
                    color: 'primary.main',
                    '&::after': {
                      width: '100%',
                    },
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    width: isActive ? '100%' : '0%',
                    height: '2px',
                    backgroundColor: 'primary.main',
                    borderRadius: '1px',
                    transform: 'translateX(-50%)',
                    transition: 'width 0.3s ease-in-out',
                  },
                }}
              >
                {item.label}
              </Button>
            ) : null;
          })}
        </Box>

        {/* User Info and Profile Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            label={user.role.replace('_', ' ').toUpperCase()}
            color={
              user.role === 'super_admin' ? 'error' :
              user.role === 'travel_admin' ? 'warning' :
              'primary'
            }
            size="small"
            sx={{ mr: 2 }}
            variant="outlined"
          />
          <Typography variant="body1" sx={{ mr: 2, color: 'text.primary' }}>
            Welcome, {user.username}
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            sx={{ color: 'text.primary' }}
          >
            <AccountCircle />
          </IconButton>
        </Box>

        {/* My Profile Dialog */}
        <Dialog
          open={profileDialogOpen}
          onClose={handleProfileDialogClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle
            sx={{
              p: 3,
              pb: 2,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 40%, #0f172a 100%)',
              color: 'primary.contrastText',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  width: 56,
                  height: 56,
                  fontSize: 26,
                  boxShadow: '0 8px 20px rgba(15,23,42,0.35)',
                }}
              >
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  My Profile
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Manage your account settings
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Chip
                    label={user?.role?.replace('_', ' ').toUpperCase() || 'N/A'}
                    color={
                      user?.role === 'super_admin' ? 'error' :
                      user?.role === 'travel_admin' ? 'warning' :
                      'default'
                    }
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(15,23,42,0.2)',
                      color: 'primary.contrastText',
                      borderColor: 'rgba(148,163,184,0.4)',
                    }}
                    variant="outlined"
                  />
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {user?.department || 'N/A'} • {user?.designation || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            {/* User Information Section */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: '#f9fafb',
              }}
            >
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ color: 'text.primary', fontWeight: 600 }}
              >
                User Information
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user?.username || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    User ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user?.userid || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Email Address
                  </Typography>
                  <Typography variant="body1">
                    {user?.email || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Role
                  </Typography>
                  <Chip
                    label={user?.role?.replace('_', ' ').toUpperCase() || 'N/A'}
                    color={
                      user?.role === 'super_admin' ? 'error' :
                      user?.role === 'travel_admin' ? 'warning' :
                      'primary'
                    }
                    size="small"
                    sx={{ mt: 0.5 }}
                    variant="outlined"
                  />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Password Change Section */}
            <Box
              sx={{
                mb: 1,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
              }}
            >
              <Typography
                variant="subtitle1"
                gutterBottom
                sx={{ color: 'text.primary', fontWeight: 600 }}
              >
                Change Password
              </Typography>

              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}

              <TextField
                fullWidth
                type={showCurrentPassword ? 'text' : 'password'}
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showCurrentPassword ? 'Hide' : 'Show'}>
                        <IconButton
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <TextField
                  fullWidth
                  type={showNewPassword ? 'text' : 'password'}
                  label="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  sx={{ mb: { xs: 2, sm: 0 } }}
                  helperText="Must be at least 6 characters long"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={showNewPassword ? 'Hide' : 'Show'}>
                          <IconButton
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            edge="end"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  type={showNewPassword ? 'text' : 'password'}
                  label="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                />
              </Box>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                  startIcon={changingPassword ? <CircularProgress size={20} /> : null}
                >
                  {changingPassword ? 'Updating...' : 'Change Password'}
                </Button>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ flexGrow: 1, color: 'text.secondary', fontSize: 12 }}>
              © {new Date().getFullYear()} TripFlow
            </Box>
            <Button onClick={handleProfileDialogClose} color="inherit">
              Close
            </Button>
            <Button
              onClick={handleLogout}
              startIcon={<ExitToApp />}
              color="error"
              variant="contained"
            >
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar;
