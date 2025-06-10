import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "./hooks/useUser";
import PatientLayout from "./layouts/PatientLayout";
import DoctorLayout from "./layouts/DoctorLayout";
import Registration from "./pages/Authentication";
import PatientProfile from "./pages/patient/Profile";
import PatientHome from "./pages/patient/Home";
import PatientAppointments from "./pages/patient/Appointments";
import PatientConnections from "./pages/patient/Connections";
import PatientNotifications from "./pages/patient/Notifications";
import PatientHealthRecords from "./pages/patient/Records";
import PatientTracking from "./pages/patient/Tracking";
import PatientHealth from "./pages/patient/YourHealth";


import DoctorHome from "./pages/doctor/Home";
import DoctorPatients from "./pages/doctor/Patients";
import DoctorProfile from "./pages/doctor/Profile";
import DoctorAppointments from "./pages/doctor/Appointments";
import DoctorReports from "./pages/doctor/Reports";
import DoctorConnections from "./pages/doctor/Connections";
import DoctorNotifications from "./pages/doctor/Notifications";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isLoading } = useUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-mySidebar border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated (has token and user data)
  const token = sessionStorage.getItem("token");
  if (!user || !token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user has the required role
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate home based on user's actual role
    const redirectPath = user.role === "patient" ? "/home" : "/doctor";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default function AppRouter() {
  const { user, isLoading } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize with session storage check
    return !!sessionStorage.getItem("token");
  });

  const setToken = useCallback((data) => {
    if (data) {
      sessionStorage.setItem("token", JSON.stringify(data));
      setIsAuthenticated(true);
    } else {
      sessionStorage.removeItem("token");
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const token = sessionStorage.getItem("token");
      const newAuthState = !!(user && token);
      setIsAuthenticated(newAuthState);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-mySidebar border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route - only accessible when not authenticated */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === "patient" ? "/home" : "/doctor"}
              replace
            />
          ) : (
            <Registration setToken={setToken} />
          )
        }
      />

      {/* Protected patient routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute requiredRole="patient">
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientHome />} />
        <Route
          path="profile"
          element={<PatientProfile setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route path="health">
          <Route index element={<PatientHealth />} />
          <Route path="tracking" element={<PatientTracking />} />
          <Route path="records" element={<PatientHealthRecords />} />
        </Route>
        <Route path="connections" element={<PatientConnections />} />
        <Route path="notifications" element={<PatientNotifications />} />
        <Route path="appointments" element={<PatientAppointments />} />
      </Route>

      {/* Protected doctor routes */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorHome />} />
        {/* <Route path="patients" element={<DoctorPatients />} /> */}
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="patients">
          <Route index element={<DoctorPatients />} />
          <Route path="appointments" element={<DoctorAppointments/>} />
          <Route path="reports" element={<DoctorReports />} />
        </Route>
        <Route path="connections" element={<DoctorConnections />} />
        <Route path="notifications" element={<DoctorNotifications />} />
      </Route>

      {/* Catch-all route */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated
                ? user?.role === "patient"
                  ? "/home"
                  : "/doctor"
                : "/"
            }
            replace
          />
        }
      />
    </Routes>
  );
}
