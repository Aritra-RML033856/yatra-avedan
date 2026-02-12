import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRoles }) => {
  const { user, token } = useAuth(); // Assuming 'loading' might be added later, but checking token/user for now.
  const location = useLocation();

  // If we had a loading state in AuthContext, we should check it here.
  // For now, if there is no token, we redirect to login.
  // Note: user might be null initially if logic relies on async fetch, 
  // but AuthContext in this app seems to load from localStorage synchronously on mount 
  // or establishes initial state.
  
  if (!token) {
    // 1. IF user not logged in -> redirect -> Login
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    // 2. ELSE IF user has permission (checked below) ...
    // ... ELSE (no permission) -> redirect -> Dashboard
    return <Navigate to="/" replace />;
  }

  // 3. User has permission -> render page
  return <>{children}</>;
};

export default AuthGuard;
