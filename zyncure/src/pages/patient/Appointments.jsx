
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAppointment, setNewAppointment] = useState({
    doctor_id: '',
    time: '',
    reason: '',
    type: 'Consultation'
  });

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        const user = await userService.getUserData();
        if (user) {
          setUserData(user);
          
          const { data: userAppointments, error: appointmentsError } = 
            await appointmentService.getUserAppointments(user.id);
          
          if (appointmentsError) {
            console.error('Error loading appointments:', appointmentsError);
            setError('Failed to load your appointments');
          } else if (userAppointments) {
            setAppointments(userAppointments);
          }
        }

        const { data: connectedDoctors, error: doctorsError } = 
          await appointmentService.getConnectedDoctors();
        
        if (doctorsError) {
          console.error('Error loading doctors:', doctorsError);
          setError('Failed to load connected doctors');
        } else if (connectedDoctors) {
          setDoctors(connectedDoctors);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize appointment system');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

const formatDateForStorage = (date) => {
  // Create a new date object to avoid timezone issues
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setError(''); 
  };

  const handleMonthNavigate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleSetAppointment = () => {
    setError('');
    setShowModal(true);
  };

  const handleSubmitAppointment = async () => {
    setError('');
    setLoading(true);

    try {
      if (!newAppointment.doctor_id || !newAppointment.time || !newAppointment.reason) {
        setError('Please fill in all required fields');
        return false;
      }

      if (newAppointment.reason.trim().length < 10) {
        setError('Please provide a more detailed reason (at least 10 characters)');
        return false;
      }
      const dateStr = formatDateForStorage(selectedDate);
      const { data: availableSlots, error: slotsError } = 
        await appointmentService.getAvailableTimeSlots(newAppointment.doctor_id, dateStr);

      if (slotsError) {
        setError('Failed to verify time slot availability. Please try again.');
        return false;
      }

      if (!availableSlots || !availableSlots.includes(newAppointment.time)) {
        setError('This time slot is no longer available. Please select a different time.');
        return false;
      }

      const appointmentData = {
        ...newAppointment,
        date: dateStr,
        status: 'confirmed',
        patient_id: userData.id
      };

      console.log('Submitting appointment:', appointmentData);

      const { data, error: submitError } = await appointmentService.createAppointment(appointmentData);
      
      if (submitError) {
        console.error('Appointment creation error:', submitError);
        
        if (submitError.includes('no longer available') || 
            submitError.includes('time slot') || 
            submitError.includes('conflict')) {
          setError('This time slot was just booked by someone else. Please select a different time.');
        } else {
          setError(submitError);
        }
        return false;
      }

      if (data && data.length > 0) {
        console.log('Appointment created successfully:', data[0]);
        
        setAppointments(prevAppointments => [...prevAppointments, data[0]]);
        
        setShowModal(false);
        setNewAppointment({
          doctor_id: '',
          time: '',
          reason: '',
          type: 'Consultation'
        });

        setTimeout(async () => {
          const { data: refreshedAppointments } = 
            await appointmentService.getUserAppointments(userData.id);
          if (refreshedAppointments) {
            setAppointments(refreshedAppointments);
          }
        }, 1000);

        return true;
      } else {
        setError('Failed to create appointment. Please try again.');
        return false;
      }

    } catch (err) {
      console.error('Unexpected error during appointment booking:', err);
      setError('An unexpected error occurred. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
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
      
      {/* Global Error Display */}
      {error && !showModal && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
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
            disabled={loading || doctors.length === 0}
            className="w-full mt-6 bg-myHeader text-white py-4 px-6 rounded-2xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Book New Appointment'}
          </button>
          
          {doctors.length === 0 && !loading && (
            <p className="text-sm text-amber-600 mt-2 text-center">
              No connected doctors found. Please connect with doctors first.
            </p>
          )}
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

      {/* Enhanced Appointment Modal */}
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
        loading={loading}
        error={error}
        setError={setError}
      />
    </div>
  );
};

export default PersonalAppointmentTracker;