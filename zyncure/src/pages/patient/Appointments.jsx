import { useState, useEffect } from 'react';
import Calendar from '../../components/Calendar';
import AppointmentModal from '../../components/AppointmentModal';
import AppointmentList from '../../components/AppointmentList';
import { appointmentService, userService } from '../../services/AppointmentService';

const PersonalAppointmentTracker = () => {
  const [userData, setUserData] = useState({
    name: "User",
    id: "----",
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    doctor_id: '',
    time: '',
    reason: '',
    type: 'Consultation'
  });

  useEffect(() => {
    const initializeData = async () => {
      // Get user data
      const user = await userService.getUserData();
      if (user) {
        setUserData(user);
        
        // Load user's appointments
        const { data: userAppointments } = await appointmentService.getUserAppointments(user.id);
        if (userAppointments) {
          setAppointments(userAppointments);
        }
      }

      // Load CONNECTED doctors only (changed from getDoctors to getConnectedDoctors)
      const { data: connectedDoctors } = await appointmentService.getConnectedDoctors();
      if (connectedDoctors) {
        setDoctors(connectedDoctors);
      }
    };

    initializeData();
  }, []);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleMonthNavigate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleSetAppointment = () => {
    setShowModal(true);
  };

  const handleSubmitAppointment = async () => {
    if (!newAppointment.doctor_id || !newAppointment.time || !newAppointment.reason) {
      return;
    }

    const appointmentData = {
      ...newAppointment,
      date: selectedDate.toISOString().split('T')[0],
      status: 'confirmed',
      patient_id: userData.id
    };

    const { data, error } = await appointmentService.createAppointment(appointmentData);
    
    if (!error && data) {
      setAppointments([...appointments, data[0]]);
      setShowModal(false);
      setNewAppointment({
        doctor_id: '',
        time: '',
        reason: '',
        type: 'Consultation'
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewAppointment({
      doctor_id: '',
      time: '',
      reason: '',
      type: 'Consultation'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-myHeader mb-4 self-start">My Appointments</h1>
      
      <div className="flex gap-8">
        {/* Left Calendar Section */}
        <div className="w-80">
          <Calendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            appointments={appointments}
            onDateSelect={handleDateSelect}
            onMonthNavigate={handleMonthNavigate}
          />
          
          <button
            onClick={handleSetAppointment}
            className="w-full mt-6 bg-myHeader text-white py-4 px-6 rounded-2xl font-semibold hover:bg-teal-600 transition-colors"
          >
            Book New Appointment
          </button>
        </div>

        {/* Right Appointments Section */}
        <div className="flex-1">
          <AppointmentList
            selectedDate={selectedDate}
            appointments={appointments}
            doctors={doctors}
          />
        </div>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitAppointment}
        selectedDate={selectedDate}
        userData={userData}
        doctors={doctors}
        appointments={appointments}
        newAppointment={newAppointment}
        setNewAppointment={setNewAppointment}
      />
    </div>
  );
};

export default PersonalAppointmentTracker;