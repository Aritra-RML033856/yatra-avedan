// SignIn.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Link,
  CircularProgress,
} from '@mui/material';
import { styled, keyframes } from '@mui/system';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// Background slow zoom animation (respects reduced-motion via CSS override)
const bgZoom = keyframes`
  0% { transform: scale(1); }
  100% { transform: scale(1.08); }
`;

// Card fade + slight upward move
const fadeInUp = keyframes`
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const StyledContainer = styled('div')(({ theme }) => ({
  width: '100vw',
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',

  // Background image layer
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    backgroundImage: `url('/world-map.png')`, // adjust path if needed
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    animation: `${bgZoom} 18s ease-in-out infinite alternate`,
    transformOrigin: 'center',
    zIndex: 0,
    filter: 'grayscale(50%) brightness(0.6) contrast(0.9)',
  },

  // Dark overlay to focus the card
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(rgba(6,21,38,0.45), rgba(6,21,38,0.45))',
    zIndex: 1,
  },

  // Respect user preference to reduce motion
  '@media (prefers-reduced-motion: reduce)': {
    '&::before': {
      animation: 'none',
      transform: 'none',
    },
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  width: '100%',
  maxWidth: 460,
  position: 'relative',
  zIndex: 2,
  padding: theme.spacing(4),
  boxShadow:
    '0 20px 30px rgba(2,6,23,0.18), 0 8px 10px rgba(2,6,23,0.06)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(250,250,250,0.9))',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.36)',
  borderRadius: theme.spacing(3),
  animation: `${fadeInUp} 560ms cubic-bezier(.2,.9,.3,1)`,
  // reduced motion safety
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
}));

const SignIn: React.FC = () => {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Redirect authenticated users to home page
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        userid,
        password,
        remember,
      });
      // @ts-ignore
      login(response.data.accessToken, response.data.refreshToken, response.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledContainer>
      <StyledCard>
        <CardContent>
          {/* Logo + tagline */}
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Box
              component="img"
              src="/Yatra-Avedan_bg.png"
              alt="Yatra Avedan – Streamlined Requests. Swift Approvals."
              sx={{
                height: { xs: 72, sm: 88, md: 110 }, // bigger logo on larger screens
                maxWidth: '100%',
                objectFit: 'contain',
                opacity: 0,
                animation: 'logoFadeIn 420ms ease forwards',
                '@keyframes logoFadeIn': {
                  from: { opacity: 0, transform: 'translateY(-6px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
                // ensure reduced motion users don't get animation
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                  opacity: 1,
                  transform: 'none',
                },
              }}
            />
            {/* <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 1 }}
              aria-hidden="true"
            >
              Streamlined Requests. Swift Approvals.
            </Typography> */}
          </Box>

          {/* Headline */}
          <Typography
            variant="h6"
            component="h2"
            gutterBottom
            align="center"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Sign in to your account
          </Typography>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              id="userid"
              label="User ID"
              variant="outlined"
              value={userid}
              onChange={(e) => setUserid(e.target.value)}
              required
              margin="normal"
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'User ID',
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.9)',
                },
              }}
            />

            <TextField
              fullWidth
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              margin="normal"
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'Password',
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.9)',
                },
              }}
            />

            {/* small row: remember + forgot */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    color="primary"
                    inputProps={{ 'aria-label': 'Remember me' }}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Remember me</Typography>}
              />

              <Box>
                <Link
                  href="/forgot-password"
                  underline="hover"
                  variant="body2"
                  sx={{ color: 'primary.light' }}
                >
                  Forgot password?
                </Link>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              aria-disabled={loading}
              sx={{
                mt: 3,
                mb: 1,
                py: 1.6,
                fontSize: '1rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                borderRadius: 2,
                // gradient background
                background: 'linear-gradient(90deg,#06b6d4 0%, #2563eb 60%)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(37,99,235,0.18)',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 36px rgba(37,99,235,0.26)',
                },
                '&:disabled': {
                  opacity: 0.7,
                  transform: 'none',
                  boxShadow: 'none',
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} color="inherit" />
                  <span>Signing in…</span>
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Secondary actions */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Need help?
              </Typography>
              <Link href="/about#contact-support" variant="body2">
                Contact support
              </Link>
            </Box>
          </Box>
        </CardContent>
      </StyledCard>
    </StyledContainer>
  );
};

export default SignIn;
