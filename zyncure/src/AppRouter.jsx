import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
// import { useUser } from './hooks/useUser';
import PatientLayout from './layouts/PatientLayout';
import DoctorLayout from './layouts/DoctorLayout';
import Registration from './pages/Authentication';
// import Login from './pages/Login';

import PatientHome from './pages/patient/Home';
import PatientProfile from './pages/patient/Profile';
import PatientHealth from './pages/patient/YourHealth';
import PatientTracking from './pages/patient/Tracking';
import PatientHealthRecords from './pages/patient/Records';
import PatientConnections from './pages/patient/Connections';
import PatientNotifications from './pages/patient/Notifications';
import PatientAppointments from './pages/patient/Appointments';

import DoctorHome from './pages/doctor/Home';
import DoctorPatients from './pages/doctor/Patients';

// Protected Route component that ensures users can only access routes when authenticated
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const authToken = sessionStorage.getItem('token');
  
  if (!authToken) {
    console.log("No token found, redirecting to login");
    // Redirect to login page if no token, saving current location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

export default function AppRouter() {
  //   const { user } = useUser();  DO NOT REMOVE - ysha
  // This must return { role: 'patient' } or { role: 'doctor' }
  const user = { role: 'patient' }; // temporarily hardcoded for testing !! - ysha
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if user is authenticated on mount and when token changes
  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem('token');
      setIsAuthenticated(!!token);
    };

    // Initial check
    checkAuth();

    // Setup event listener for storage changes (in case token is changed in another tab)
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // Function to set token in sessionStorage and update authentication state
  const setToken = (data) => {
    if (data) {
      sessionStorage.setItem('token', JSON.stringify(data));
      setIsAuthenticated(true);
    } else {
      sessionStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };
  
  if (!user) return <p>Loading...</p>;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Registration setToken={setToken} />} />
      {/* <Route path="/login" element={<Login setToken={setToken} />} /> */}
      
      {/* Protected patient routes */}
      {user.role === 'patient' && (
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <PatientLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PatientHome />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="health">
            <Route index element={<PatientHealth />} />
            <Route path="tracking" element={<PatientTracking />} />
            <Route path="records" element={<PatientHealthRecords />} />
          </Route>
          <Route path="connections" element={<PatientConnections />} />
          <Route path="notifications" element={<PatientNotifications />} />
          <Route path="appointments" element={<PatientAppointments />} />
        </Route>
      )}

      {/* Protected doctor routes */}
      {user.role === 'doctor' && (
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DoctorHome />} />
          <Route path="patients" element={<DoctorPatients />} />
        </Route>
      )}

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/"} />} />
    </Routes>
  );
}