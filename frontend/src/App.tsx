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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <BrowserRouter>
            <NavigationBar />
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/about" element={<About />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/new-request" element={<NewRequest />} />
              <Route path="/my-trips" element={<MyTrips />} />
              <Route path="/travel-management" element={<TravelManagement />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/mmt-callback" element={<MMTCallback />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
