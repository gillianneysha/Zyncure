import { useState, useEffect } from 'react';
import { appointmentService } from '../services/AppointmentService';

const RescheduleModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  doctors = [], 
  onRescheduleComplete 
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // G (today)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  //  (3 months from now)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  
  useEffect(() => {
    if (isOpen) {
      setSelectedDate('');
      setSelectedTime('');
      setAvailableSlots([]);
      setError('');
    }
  }, [isOpen]);

  
  useEffect(() => {
    if (selectedDate && appointment) {
      loadAvailableSlots();
    }
  }, [selectedDate, appointment]);

  const loadAvailableSlots = async () => {
  if (!selectedDate || !appointment?.doctor_id) return;
  
  setLoadingSlots(true);
  setSelectedTime('');
  
  try {
    // Get available time slots from the service
    const slotsResult = await appointmentService.getAvailableTimeSlots(appointment.doctor_id, selectedDate);
    
    if (slotsResult.error) {
      setError('Failed to load available time slots');
      setAvailableSlots([]);
    } else {
      // The service already returns filtered available slots
      const availableTimeSlots = slotsResult.data || [];
      
      // Transform to the format expected by the modal
      const slotsWithStatus = availableTimeSlots.map(slot => ({
        time: slot.time, // This is already in 12-hour format from the service
        available: true, // All returned slots are available
        booked: false    // Service already filtered out booked slots
      }));
      
      setAvailableSlots(slotsWithStatus);
      
      if (slotsWithStatus.length === 0) {
        setError('No available time slots for this date');
      } else {
        setError('');
      }
    }
  } catch (err) {
    console.error('Error loading slots:', err);
    setError('Failed to load available time slots');
    setAvailableSlots([]);
  } finally {
    setLoadingSlots(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }

    
    const selectedSlot = availableSlots.find(slot => slot.time === selectedTime);
if (!selectedSlot || !selectedSlot.available) {
  setError('Selected time slot is no longer available. Please choose a different time.');
  await loadAvailableSlots(); 
  return;
}

    setLoading(true);
    setError('');

    try {
      
      // const { data: currentSlots } = await appointmentService.getAvailableTimeSlots(
      //   appointment.doctor_id, 
      //   selectedDate
      // );
      
      // if (!currentSlots || !currentSlots.includes(selectedTime)) {
      //   setError('This time slot was just booked by someone else. Please select a different time.');
      //   await loadAvailableSlots();
      //   return;
      // }

      
      const updateData = {
        date: selectedDate,
        time: selectedTime,
        status: 'confirmed'
      };

      const { data, error: updateError } = await appointmentService.updateAppointment(
        appointment.id, 
        updateData
      );

      if (updateError) {
        setError(updateError);
        return;
      }

      
      onRescheduleComplete?.(data?.[0] || { ...appointment, ...updateData });
      
      
      onClose();
      
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      setError('Failed to reschedule appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);
    setError('');
    onClose();
  };

  if (!isOpen || !appointment) return null;

  const doctor = doctors.find(d => d.id === appointment.doctor_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-myHeader text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Reschedule Appointment</h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Current Appointment Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Current Appointment</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Doctor:</span> {doctor?.name || 'Unknown'}</p>
              <p><span className="font-medium">Date:</span> {new Date(appointment.date).toLocaleDateString()}</p>
              <p><span className="font-medium">Time:</span> {appointment.time}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {appointment.status}
                </span>
              </p>
            </div>
          </div>

       
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Date Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select New Date *
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDateStr}
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Time Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select New Time *
            </label>
            
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                <span className="ml-2 text-gray-600">Loading available times...</span>
              </div>
            ) : selectedDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot) => {
  const isAvailable = slot.available;
  const isSelected = selectedTime === slot.time;
  
  return (
    <button
      key={slot.time}
      type="button"
      onClick={() => isAvailable ? setSelectedTime(slot.time) : null}
      disabled={loading || !isAvailable}
      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
        isSelected
          ? 'bg-teal-600 text-white border-teal-600'
          : isAvailable
            ? 'bg-white text-gray-700 border-gray-300 hover:border-teal-500 hover:bg-teal-50'
            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
      }`}
    >
      {slot.time}
    </button>
  );
})}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No available time slots for this date</p>
                  <p className="text-sm mt-1">Please select a different date</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Please select a date first</p>
              </div>
            )}
          </div>

          {/* Available slots summary */}
          {selectedDate && !loadingSlots && availableSlots.length > 0 && (
            <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p>
                {availableSlots.filter(slot => slot.available && !slot.booked).length} available, {' '}
                {availableSlots.filter(slot => slot.booked).length} booked, {' '}
                {availableSlots.filter(slot => !slot.available && !slot.booked).length} unavailable
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedDate || !selectedTime || loadingSlots}
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Rescheduling...
                </>
              ) : (
                'Reschedule Appointment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;