import { useState, useEffect } from 'react';
import Calendar from '../../components/Calendar';
import AppointmentModal from '../../components/AppointmentModal';
import AppointmentList from '../../components/AppointmentList';
import { appointmentService, userService } from '../../services/AppointmentService';
import RescheduleModal from '../../components/RescheduleModal';
import { supabase } from "../../client";

const PersonalAppointmentTracker = () => {
  const [userData, setUserData] = useState({
    name: "User",
    id: "----",
  });

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('calendar');
  const [newAppointment, setNewAppointment] = useState({
    doctor_id: '',
    time: '',
    reason: ''
  });

  const fetchAppointments = async () => {
    try {
      const { data, error } = await appointmentService.getUserAppointments();

      if (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
        return;
      }

      if (data && Array.isArray(data)) {
        console.log('Fetched appointments:', data);
        setAppointments(data);
      } else {
        console.warn('Invalid appointment data received:', data);
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  // Call this on component mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  const refreshAppointments = async () => {
    if (!userData.id || userData.id === "----") return;

    try {
      // Don't pass userData.id since service uses current authenticated user
      const { data: refreshedAppointments, error: refreshError } =
        await appointmentService.getUserAppointments();

      if (refreshError) {
        setError('Failed to refresh appointments');
        console.error('Refresh error:', refreshError);
      } else if (refreshedAppointments) {
        console.log('Refreshed appointments:', refreshedAppointments);
        setAppointments(refreshedAppointments);
      }
    } catch (err) {
      console.error('Error refreshing appointments:', err);
      setError('Failed to refresh appointments');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        const user = await userService.getUserData();
        if (user) {
          setUserData(user);

          const { data: userAppointments, error: appointmentsError } =
            await appointmentService.getUserAppointments();

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

    const setupNotificationSubscription = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Error getting user:', error);
          return null;
        }

        if (user?.id) {
          const notificationSubscription = supabase
            .channel('appointment_notifications')
            .on('postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
              },
              (payload) => {
                if (payload.new.type.includes('appointment')) {
                  console.log('New appointment notification:', payload.new);
                  // Refresh appointments when there's a new notification
                  refreshAppointments();
                }
              }
            )
            .subscribe();

          return notificationSubscription;
        }
      } catch (err) {
        console.error('Error setting up notification subscription:', err);
        return null;
      }
      return null;
    };

    initializeData();

    let notificationSubscription = null;
    setupNotificationSubscription().then((subscription) => {
      notificationSubscription = subscription;
    });

    return () => {
      if (notificationSubscription) {
        notificationSubscription.unsubscribe();
      }
    };
  }, []);

  const formatDateForStorage = (date) => {
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setError('');
    if (window.innerWidth < 768) {
      setActiveTab('appointments');
    }
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

  const convertTo24Hour = (time12h) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
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

      // Check doctor's availability for the selected time slot
      const { data: availabilityData, error: availabilityError } =
        await appointmentService.getDoctorAvailability(
          newAppointment.doctor_id,
          dateStr,
          newAppointment.time
        );

      if (availabilityError) {
        setError('Failed to verify doctor availability. Please try again.');
        return false;
      }

      if (!availabilityData || !availabilityData.available) {
        setError(availabilityData?.reason || 'This time slot is not available. Please select a different time.');
        return false;
      }

      const appointmentData = {
        med_id: newAppointment.doctor_id,
        patient_id: userData.id,
        requested_date: dateStr,
        requested_time: convertTo24Hour(newAppointment.time), // <-- FIX HERE
        patient_notes: newAppointment.reason,
        status: 'requested',
        duration_minutes: 30
      };

      console.log('Submitting appointment request:', appointmentData);

      const { data, error: submitError } = await appointmentService.requestAppointment(appointmentData);

      if (submitError) {
        console.error('Appointment request error:', submitError);

        if (submitError.includes('no longer available') ||
          submitError.includes('time slot') ||
          submitError.includes('conflict')) {
          setError('This time slot was just requested by someone else. Please select a different time.');
        } else {
          setError(submitError);
        }
        return false;
      }

      if (data && data.length > 0) {
        console.log('Appointment requested successfully:', data[0]);

        setAppointments(prevAppointments => [...prevAppointments, data[0]]);

        setShowModal(false);
        setNewAppointment({
          doctor_id: '',
          time: '',
          reason: ''
        });

        // Show success message
        setError(''); // Clear any existing errors
        // You might want to show a success notification here
        alert('Appointment request submitted successfully! The doctor will review and confirm your appointment.');

        setTimeout(refreshAppointments, 1000);

        return true;
      } else {
        setError('Failed to submit appointment request. Please try again.');
        return false;
      }

    } catch (err) {
      console.error('Unexpected error during appointment request:', err);
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
      reason: ''
    });
  };

  const handleRescheduleRequest = (appointment) => {
    setAppointmentToReschedule(appointment);
    setShowRescheduleModal(true);
    setError('');
  };

  const handleCancelRequest = async (appointment) => {
    // Updated cancellation logic for requested appointments
    if (!canCancelAppointment(appointment)) {
      if (appointment.status === 'requested') {
        setError('You can cancel requested appointments anytime before doctor confirmation.');
      } else {
        setError('Confirmed appointments can only be cancelled up to 24 hours before the scheduled time.');
      }
      return;
    }

    const confirmMessage = appointment.status === 'requested'
      ? 'Are you sure you want to cancel this appointment request?'
      : 'Are you sure you want to cancel this confirmed appointment?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      const { error: cancelError } = await appointmentService.updateAppointment(
        appointment.id,
        { status: 'cancelled' }
      );

      if (cancelError) {
        setError(`Failed to cancel appointment: ${cancelError}`);
      } else {
        setAppointments(prevAppointments =>
          prevAppointments.map(apt =>
            apt.id === appointment.id
              ? { ...apt, status: 'cancelled' }
              : apt
          )
        );
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError('Failed to cancel appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentRemove = (removedAppointment) => {
    setAppointments(prevAppointments =>
      prevAppointments.filter(apt => apt.id !== removedAppointment.id)
    );
  };

  const handleRescheduleComplete = (updatedAppointment) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(apt =>
        apt.id === updatedAppointment.id
          ? updatedAppointment
          : apt
      )
    );

    setShowRescheduleModal(false);
    setAppointmentToReschedule(null);
  };

  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setAppointmentToReschedule(null);
    setError('');
  };

  const canCancelAppointment = (appointment) => {
    // Requested appointments can be cancelled anytime before confirmation
    if (appointment.status === 'requested') {
      return true;
    }

    // Confirmed appointments follow the 24-hour rule
    if (appointment.status === 'confirmed') {
      const now = new Date();

      // Use appointment_date/appointment_time for confirmed appointments
      const appointmentDate = appointment.appointment_date || appointment.requested_date || appointment.date;
      const appointmentTime = appointment.appointment_time || appointment.requested_time || appointment.time;

      if (!appointmentDate || !appointmentTime) {
        return false;
      }

      // Handle time format conversion for proper Date parsing
      let timeForParsing = appointmentTime;
      if (timeForParsing && (timeForParsing.includes('AM') || timeForParsing.includes('PM'))) {
        const [time, period] = timeForParsing.split(' ');
        const [hours, minutes] = time.split(':');
        let hour24 = parseInt(hours);

        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0;
        }

        timeForParsing = `${hour24.toString().padStart(2, '0')}:${minutes}`;
      }

      try {
        const appointmentDateTime = new Date(`${appointmentDate}T${timeForParsing}`);
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        return hoursUntilAppointment > 24;
      } catch (error) {
        console.error('Error parsing appointment date/time:', error);
        return false;
      }
    }

    return false;
  };

  const selectedDateAppointments = appointments.filter((apt) => {
    const selectedDateString = formatDateForStorage(selectedDate);
    // apt.date is a string in YYYY-MM-DD format
    const appointmentDateOnly = apt.date
      ? apt.date.toString().split('T')[0]
      : null;
    return appointmentDateOnly === selectedDateString;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-myHeader mb-4 sm:mb-6">My Appointments</h1>

      {/* Global Error Display */}
      {error && !showModal && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="md:hidden mb-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === 'calendar'
              ? 'bg-myHeader text-white'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors relative ${activeTab === 'appointments'
              ? 'bg-myHeader text-white'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Appointments
            {selectedDateAppointments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {selectedDateAppointments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex gap-8">
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
            {loading ? 'Loading...' : 'Request New Appointment'}
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
            onRescheduleRequest={handleRescheduleRequest}
            onCancelRequest={handleCancelRequest}
            onPermanentRemove={(removedAppointment) => {
              setAppointments(prev => prev.filter(apt => apt.id !== removedAppointment.id));
            }}
            onRefresh={refreshAppointments}
            canCancelAppointment={canCancelAppointment}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
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
              className="w-full bg-myHeader text-white py-3 px-4 rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Request New Appointment'}
            </button>

            {doctors.length === 0 && !loading && (
              <p className="text-sm text-amber-600 text-center px-4">
                No connected doctors found. Please connect with doctors first.
              </p>
            )}

            {/* Quick preview of selected date appointments */}
            {selectedDateAppointments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-blue-700">
                      {selectedDate.toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="text-blue-600 text-sm font-medium hover:text-blue-800"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div>
            <AppointmentList
              selectedDate={selectedDate}
              appointments={appointments}
              doctors={doctors}
              onRescheduleRequest={handleRescheduleRequest}
              onCancelRequest={handleCancelRequest}
              onPermanentRemove={handlePermanentRemove}
              onRefresh={refreshAppointments}
              canCancelAppointment={canCancelAppointment}
            />
          </div>
        )}
      </div>

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

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={handleCloseRescheduleModal}
        appointment={appointmentToReschedule}
        doctors={doctors}
        onRescheduleComplete={handleRescheduleComplete}
      />
    </div>
  );
};

export default PersonalAppointmentTracker;