import { Routes, Route, Navigate } from 'react-router-dom';
// import { useUser } from './hooks/useUser';
// Make sure this returns a user with a 'role'
import PatientLayout from './layouts/PatientLayout';
import DoctorLayout from './layouts/DoctorLayout';

import PatientHome from './pages/patient/Home';
import PatientProfile from './pages/patient/Profile';
import PatientHealth from './pages/patient/YourHealth';
import PatientConnections from './pages/patient/Connections';
import PatientNotifications from './pages/patient/Notifications';
import PatientAppointments from './pages/patient/Appointments';

import DoctorHome from './pages/doctor/Home';
import DoctorPatients from './pages/doctor/Patients';

export default function AppRouter() {
  //   const { user } = useUser();  DO NOT REMOVE - ysha
  // This must return { role: 'patient' } or { role: 'doctor' }
  const user = { role: 'patient' }; // temporarily hardcoded for testing !! - ysha

  if (!user) return <p>Loading...</p>;

  return (
    <Routes>
      {user.role === 'patient' && (
        <Route path="/" element={<PatientLayout />}>
          <Route index element={<PatientHome />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="health" element={<PatientHealth />} />
          <Route path="connections" element={<PatientConnections />} />
          <Route path="notifications" element={<PatientNotifications />} />
          <Route path="appointments" element={<PatientAppointments />} />
        </Route>
      )}

      {user.role === 'doctor' && (
        <Route path="/" element={<DoctorLayout />}>
          <Route index element={<DoctorHome />} />
          <Route path="patients" element={<DoctorPatients />} />
        </Route>
      )}

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}