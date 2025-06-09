import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { appointmentService } from '../services/AppointmentService';

const AppointmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  userData,
  doctors = [],
  appointments = [],
  newAppointment,
  setNewAppointment
}) => {
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // All available time slots
  const allTimeSlots = useMemo(() => [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', 
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
  ], []);

  const formatDate = useCallback((date) => {
    return date.toISOString().split('T')[0];
  }, []);

  // Move this function before the useEffect
  const getAvailableSlotsFromAppointments = useCallback(() => {
    const dateStr = formatDate(selectedDate);
    const bookedSlots = appointments
      .filter(apt => 
        apt.date === dateStr && 
        apt.doctor_id === newAppointment.doctor_id &&
        apt.status !== 'cancelled'
      )
      .map(apt => apt.time);
    
    return allTimeSlots.filter(slot => !bookedSlots.includes(slot));
  }, [selectedDate, appointments, newAppointment.doctor_id, allTimeSlots, formatDate]);

  // Update available time slots when doctor or date changes
  useEffect(() => {
    const updateAvailableSlots = async () => {
      if (newAppointment.doctor_id && selectedDate) {
        setLoading(true);
        try {
          const dateStr = formatDate(selectedDate);
          const { data: slots, error } = await appointmentService.getAvailableTimeSlots(
            newAppointment.doctor_id, 
            dateStr
          );
          
          if (error) {
            console.error('Error fetching time slots:', error);
            // Fall back to checking against existing appointments
            setAvailableTimeSlots(getAvailableSlotsFromAppointments());
          } else {
            // Convert 24-hour format to 12-hour format for display
            const formattedSlots = slots.map(slot => {
              const [hours, minutes] = slot.split(':');
              const hour = parseInt(hours);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour % 12 || 12;
              return `${displayHour}:${minutes} ${ampm}`;
            });
            setAvailableTimeSlots(formattedSlots);
          }
        } catch (err) {
          console.error('Error fetching available slots:', err);
          setAvailableTimeSlots(getAvailableSlotsFromAppointments());
        } finally {
          setLoading(false);
        }
      } else {
        setAvailableTimeSlots(allTimeSlots);
      }
    };
    updateAvailableSlots();
  }, [newAppointment.doctor_id, selectedDate, getAvailableSlotsFromAppointments, formatDate, allTimeSlots]);

  const getAppointmentForSlot = (time) => {
    const dateStr = formatDate(selectedDate);
    return appointments.find(apt => 
      apt.time === time && 
      apt.date === dateStr && 
      apt.doctor_id === newAppointment.doctor_id &&
      apt.status !== 'cancelled'
    );
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!newAppointment.doctor_id || !newAppointment.time || !newAppointment.reason) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await onSubmit();
    } catch  {
      setError('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setAvailableTimeSlots(allTimeSlots);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-800">Book Appointment</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <X size={28} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
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
              onChange={(e) => {
                setNewAppointment({
                  ...newAppointment, 
                  doctor_id: e.target.value,
                  time: '' // Reset time when doctor changes
                });
              }}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
              disabled={loading}
            >
              <option value="">Choose a doctor...</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Preferred Time *
            </label>
            <select
              value={newAppointment.time}
              onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
              disabled={loading || !newAppointment.doctor_id}
            >
              <option value="">
                {!newAppointment.doctor_id ? 'Select a doctor first...' : 'Select time...'}
              </option>
              {availableTimeSlots.map(time => {
                const isBooked = getAppointmentForSlot(time);
                return (
                  <option 
                    key={time} 
                    value={time}
                    disabled={isBooked}
                  >
                    {time} {isBooked ? '(Booked)' : ''}
                  </option>
                );
              })}
            </select>
            {loading && newAppointment.doctor_id && (
              <p className="text-sm text-gray-500 mt-2">Loading available times...</p>
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
              disabled={loading}
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
              placeholder="Describe your symptoms or reason for the appointment..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={handleClose}
            className="flex-1 py-4 px-6 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-lg"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-4 px-6 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !newAppointment.doctor_id || !newAppointment.time || !newAppointment.reason}
          >
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;