import { X } from 'lucide-react';

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
  const timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', 
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
  ];

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getAppointmentForSlot = (time) => {
    const dateStr = formatDate(selectedDate);
    return appointments.find(apt => apt.time === time && apt.date === dateStr);
  };

  const handleSubmit = () => {
    if (!newAppointment.doctor_id || !newAppointment.time || !newAppointment.reason) {
      return;
    }
    onSubmit();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-800">Book Appointment</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={28} />
          </button>
        </div>

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
              Select Doctor
            </label>
            <select
              value={newAppointment.doctor_id}
              onChange={(e) => setNewAppointment({
                ...newAppointment, 
                doctor_id: e.target.value ? parseInt(e.target.value) : ''
              })}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
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
              Preferred Time
            </label>
            <select
              value={newAppointment.time}
              onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
            >
              <option value="">Select time...</option>
              {timeSlots.map(time => (
                <option 
                  key={time} 
                  value={time}
                  disabled={getAppointmentForSlot(time)}
                >
                  {time} {getAppointmentForSlot(time) ? '(Booked)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Appointment Type
            </label>
            <select
              value={newAppointment.type}
              onChange={(e) => setNewAppointment({...newAppointment, type: e.target.value})}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
            >
              <option value="Consultation">Consultation</option>
              <option value="Checkup">Checkup</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Reason for Visit
            </label>
            <textarea
              value={newAppointment.reason}
              onChange={(e) => setNewAppointment({...newAppointment, reason: e.target.value})}
              rows="4"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg"
              placeholder="Describe your symptoms or reason for the appointment..."
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-6 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-4 px-6 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors text-lg"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;