import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useUser } from './hooks/useUser';
import PatientLayout from './layouts/PatientLayout';
import DoctorLayout from './layouts/DoctorLayout';
import Registration from './pages/Authentication';

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

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const authToken = sessionStorage.getItem('token');
  
  if (!authToken) {
    console.log("No token found, redirecting to login");
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return children;
};

export default function AppRouter() {
    const { user } = useUser();  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if user is authenticated and when token changes
  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem('token');
      setIsAuthenticated(!!token);
    };

    // check
    checkAuth();

    // event listener for storage changes (in case token is changed in another tab)
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const setToken = (data) => {
    if (data) {
      sessionStorage.setItem('token', JSON.stringify(data));
      setIsAuthenticated(true);
    } else {
      sessionStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };
  
  const navigate = useNavigate();


  useEffect(() => {
  if (!user) return;
  //  navigate if at the root path
  if (location.pathname === '/') {
    if (user.role === 'patient') {
      navigate('/home');
    } else if (user.role === 'doctor') {
      navigate('/doctor');
    }
  }
}, [user, navigate, location]);

  if (!user) return <p>Loading...</p>;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Registration setToken={setToken} />} />
      
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
          path="/doctor" 
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