import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { appointmentService } from '../services/AppointmentService';

const AppointmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  userData,
  doctors = [],
  newAppointment,
  setNewAppointment,
  loading: parentLoading = false,
  error: parentError = '',
  setError: setParentError
}) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [refreshingSlots, setRefreshingSlots] = useState(false);
  const [localError, setLocalError] = useState('');
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  const isLoading = parentLoading || localLoading;
  const displayError = parentError || localError;

  const formatDate = useCallback((date) => {
    return date.toISOString().split('T')[0];
  }, []);

  // Refresh available slots function with enhanced error handling
  const refreshAvailableSlots = useCallback(async (showRefreshingIndicator = true) => {
    if (!newAppointment.doctor_id || !selectedDate) {
      setAvailableTimeSlots([]);
      return;
    }

    if (showRefreshingIndicator) {
      setRefreshingSlots(true);
    }
    
    try {
      const dateStr = formatDate(selectedDate);
      console.log(`Fetching available slots for doctor ${newAppointment.doctor_id} on ${dateStr}`);
      
      const { data: slots, error } = await appointmentService.getAvailableTimeSlots(
        newAppointment.doctor_id, 
        dateStr
      );
      
      if (error) {
        console.error('Error fetching time slots:', error);
        setLocalError('Failed to load available time slots. Please try again.');
        setAvailableTimeSlots([]);
      } else {
        console.log('Available slots:', slots);
        setAvailableTimeSlots(slots || []);
        setLocalError(''); // Clear 
        setLastRefreshTime(new Date());
        
        // If currently selected time is no longer available, clear !
        if (newAppointment.time && slots && !slots.includes(newAppointment.time)) {
          setNewAppointment(prev => ({ ...prev, time: '' }));
          setLocalError('Your selected time is no longer available. Please choose a different time.');
        }
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setLocalError('Failed to load available time slots. Please try again.');
      setAvailableTimeSlots([]);
    } finally {
      if (showRefreshingIndicator) {
        setRefreshingSlots(false);
      }
    }
  }, [newAppointment.doctor_id, selectedDate, formatDate, newAppointment.time, setNewAppointment]);

  // Auto-refresh slots every 30 seconds when modal is open and doctor is selected
  useEffect(() => {
    if (!isOpen || !newAppointment.doctor_id) return;

    const interval = setInterval(() => {
      refreshAvailableSlots(false); //refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isOpen, newAppointment.doctor_id, refreshAvailableSlots]);

  // Update available time slots when doctor or date changes
  useEffect(() => {
    refreshAvailableSlots();
  }, [refreshAvailableSlots]);

  // Reset time when doctor changes
  useEffect(() => {
    if (newAppointment.doctor_id) {
      setNewAppointment(prev => ({ ...prev, time: '' }));
      setLocalError('');
    }
  }, [newAppointment.doctor_id, setNewAppointment]);

  // Clear errors when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalError('');
      if (setParentError) {
        setParentError('');
      }
    }
  }, [isOpen, setParentError]);

  const handleSubmit = async () => {
    setLocalError('');
    if (setParentError) {
      setParentError('');
    }
    
    // Validate 
    if (!newAppointment.doctor_id || !newAppointment.time || !newAppointment.reason) {
      setLocalError('Please fill in all required fields');
      return;
    }

    // Validate 
    if (newAppointment.reason.trim().length < 10) {
      setLocalError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }

    // Double-check if selected time is still available
    if (!availableTimeSlots.includes(newAppointment.time)) {
      setLocalError('Selected time slot is no longer available. Please choose a different time.');
      await refreshAvailableSlots(); // Refresh the slots
      return;
    }

    setLocalLoading(true);
    
    try {
      // Final check before submission
      const dateStr = formatDate(selectedDate);
      const { data: currentSlots } = await appointmentService.getAvailableTimeSlots(
        newAppointment.doctor_id, 
        dateStr
      );
      
      if (!currentSlots || !currentSlots.includes(newAppointment.time)) {
        setLocalError('This time slot was just booked by someone else. Please select a different time.');
        await refreshAvailableSlots();
        return;
      }

      const result = await onSubmit();
      
      if (result !== false) {
        console.log('Appointment booked successfully');
      }
    } catch (err) {
      console.error('Appointment booking error:', err);
      setLocalError('Failed to book appointment. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClose = () => {
    setLocalError('');
    setAvailableTimeSlots([]);
    setLastRefreshTime(null);
    if (setParentError) {
      setParentError('');
    }
    onClose();
  };

  const handleDoctorChange = (doctorId) => {
    setNewAppointment({
      ...newAppointment, 
      doctor_id: doctorId,
      time: '' 
    });
    setLocalError(''); 
  };

  const handleTimeChange = (time) => {
    setNewAppointment({...newAppointment, time});
    setLocalError(''); 
  };

  if (!isOpen) return null;

  const selectedDoctor = doctors.find(d => d.id === newAppointment.doctor_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-800">Book Appointment</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <X size={28} />
          </button>
        </div>

        {displayError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 text-sm">{displayError}</p>
            </div>
          </div>
        )}

        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">Booking for:</p>
          <p className="font-semibold text-gray-800">{userData.name}</p>
          <p className="text-sm text-gray-600">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Doctor *
            </label>
            <select
              value={newAppointment.doctor_id}
              onChange={(e) => handleDoctorChange(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
              disabled={isLoading}
            >
              <option value="">Choose a doctor...</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
            {doctors.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No connected doctors found. Please connect with doctors first.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Preferred Time *
              </label>
              {newAppointment.doctor_id && (
                <div className="flex items-center gap-2">
                  {lastRefreshTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>
                        Updated {new Date().getTime() - lastRefreshTime.getTime() < 60000 
                          ? 'just now' 
                          : `${Math.floor((new Date().getTime() - lastRefreshTime.getTime()) / 60000)}m ago`}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => refreshAvailableSlots(true)}
                    disabled={refreshingSlots}
                    className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800 disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={refreshingSlots ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              )}
            </div>
            <select
              value={newAppointment.time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
              disabled={isLoading || !newAppointment.doctor_id || refreshingSlots}
            >
              <option value="">
                {!newAppointment.doctor_id 
                  ? 'Select a doctor first...' 
                  : refreshingSlots 
                    ? 'Loading times...'
                    : availableTimeSlots.length === 0
                      ? 'No available times'
                      : 'Select time...'}
              </option>
              {availableTimeSlots.map(time => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {newAppointment.doctor_id && !refreshingSlots && availableTimeSlots.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No available time slots for this date. Please select a different date.
              </p>
            )}
            {refreshingSlots && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Checking available times...
              </p>
            )}
            {selectedDoctor && availableTimeSlots.length > 0 && (
              <p className="text-sm text-green-600 mt-2">
                {availableTimeSlots.length} time slot{availableTimeSlots.length !== 1 ? 's' : ''} available with {selectedDoctor.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Appointment Type
            </label>
            <select
              value={newAppointment.type}
              onChange={(e) => setNewAppointment({...newAppointment, type: e.target.value})}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
              disabled={isLoading}
            >
              <option value="Consultation">Consultation</option>
              <option value="Checkup">Checkup</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Reason for Visit *
            </label>
            <textarea
              value={newAppointment.reason}
              onChange={(e) => setNewAppointment({...newAppointment, reason: e.target.value})}
              rows="4"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
              placeholder="Describe your symptoms or reason for the appointment... (minimum 10 characters)"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {newAppointment.reason.length}/10 minimum characters
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleClose}
            className="flex-1 py-4 px-6 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-lg"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-4 px-6 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={
              isLoading || 
              !newAppointment.doctor_id || 
              !newAppointment.time || 
              !newAppointment.reason ||
              newAppointment.reason.trim().length < 10 ||
              refreshingSlots ||
              availableTimeSlots.length === 0
            }
          >
            {isLoading && <RefreshCw size={16} className="animate-spin" />}
            {isLoading ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;