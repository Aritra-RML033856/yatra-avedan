import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import NavigationBar from './components/NavigationBar';
import SignIn from './components/SignIn';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import MyTrips from './pages/MyTrips';
import TravelManagement from './pages/TravelManagement';
import Approvals from './pages/Approvals';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import About from './pages/About';
import MMTCallback from './pages/MMTCallback';
import NotFound from './pages/NotFound';
import AuthGuard from './components/AuthGuard';
import './App.css';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <BrowserRouter>
            <NavigationBar />
            <Routes>
              {/* Public Routes */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/about" element={<About />} />
              <Route path="/mmt-callback" element={<MMTCallback />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <AuthGuard>
                    <Dashboard />
                  </AuthGuard>
                }
              />
              <Route
                path="/new-request"
                element={
                  <AuthGuard>
                    <NewRequest />
                  </AuthGuard>
                }
              />
              <Route
                path="/my-trips"
                element={
                  <AuthGuard>
                    <MyTrips />
                  </AuthGuard>
                }
              />
              <Route
                path="/travel-management"
                element={
                  <AuthGuard requiredRoles={['travel_admin', 'super_admin']}>
                    <TravelManagement />
                  </AuthGuard>
                }
              />
              <Route
                path="/approvals"
                element={
                  <AuthGuard>
                    <Approvals />
                  </AuthGuard>
                }
              />
              <Route
                path="/analytics"
                element={
                  <AuthGuard requiredRoles={['travel_admin', 'super_admin']}>
                    <Analytics />
                  </AuthGuard>
                }
              />
              <Route
                path="/user-management"
                element={
                  <AuthGuard requiredRoles={['super_admin']}>
                    <UserManagement />
                  </AuthGuard>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
