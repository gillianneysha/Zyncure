import { useState } from 'react';

const AppointmentList = ({ 
  selectedDate, 
  appointments = [], 
  doctors = [],
  emptyStateMessage = "No appointments scheduled for this date",
  emptyStateSubtext = "Click \"Book New Appointment\" to schedule one",
  onRescheduleRequest,
  onCancelRequest
}) => {
  const [expandedAppointment, setExpandedAppointment] = useState(null);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getStatusConfig = (status) => {
    const configs = {
      confirmed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '✓',
        label: 'Confirmed'
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⏳',
        label: 'Pending'
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '✕',
        label: 'Cancelled'
      },
      rescheduled: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '📅',
        label: 'Rescheduled'
      },
      completed: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '✅',
        label: 'Completed'
      }
    };
    return configs[status] || configs.pending;
  };

  const canReschedule = (appointment) => {
    return ['cancelled', 'rescheduled'].includes(appointment.status) || 
           (appointment.status === 'confirmed' && new Date(`${appointment.date}T${appointment.time}`) > new Date());
  };

  const canCancel = (appointment) => {
    return appointment.status === 'confirmed' && 
           new Date(`${appointment.date}T${appointment.time}`) > new Date();
  };

  const selectedDateAppointments = appointments.filter(apt => 
    apt.date === formatDate(selectedDate)
  );

  const toggleExpanded = (appointmentId) => {
    setExpandedAppointment(expandedAppointment === appointmentId ? null : appointmentId);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border">
      <div className="bg-myHeader text-white p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">My Schedule</h2>
          <span className="text-lg font-medium">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
        <p className="text-teal-100 mt-1">
          {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''} scheduled
        </p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {selectedDateAppointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">{emptyStateMessage}</p>
            <p className="text-sm mt-2">{emptyStateSubtext}</p>
          </div>
        ) : (
          selectedDateAppointments.map((appointment) => {
            const doctor = doctors.find(d => d.id === appointment.doctor_id);
            const statusConfig = getStatusConfig(appointment.status);
            const isExpanded = expandedAppointment === appointment.id;
            const needsAction = ['cancelled', 'rescheduled'].includes(appointment.status);
            
            return (
              <div
                key={appointment.id}
                className={`transition-all duration-200 ${
                  needsAction 
                    ? 'bg-red-50 border-l-4 border-l-red-400' 
                    : appointment.status === 'confirmed'
                    ? 'bg-teal-50 border-l-4 border-l-teal-500'
                    : 'bg-gray-50 border-l-4 border-l-gray-400'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="text-gray-600 font-bold text-lg min-w-[100px]">
                        {appointment.time}
                      </div>
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-lg">
                            {doctor?.name || 'Unknown Doctor'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {doctor?.specialty || 'General Practice'}
                          </span>
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-teal-600 font-medium">
                            {appointment.type}
                          </span>
                          <span className="text-sm text-gray-500 line-clamp-1">
                            {appointment.reason}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color} flex items-center gap-1`}>
                        <span>{statusConfig.icon}</span>
                        {statusConfig.label}
                      </span>
                      
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleExpanded(appointment.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Action Alert for Cancelled/Rescheduled */}
                  {needsAction && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-red-600 mt-0.5">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-red-800">
                            {appointment.status === 'cancelled' ? 'Appointment Cancelled' : 'Appointment Rescheduled'}
                          </h4>
                          <p className="text-sm text-red-700 mt-1">
                            {appointment.status === 'cancelled' 
                              ? 'This appointment has been cancelled. Would you like to reschedule?'
                              : 'This appointment has been rescheduled. Please book a new time slot.'}
                          </p>
                          <button
                            onClick={() => onRescheduleRequest?.(appointment)}
                            className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reschedule Appointment
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Appointment ID:</span>
                          <span className="ml-2 text-gray-600">#{appointment.id}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Type:</span>
                          <span className="ml-2 text-gray-600">{appointment.type}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Reason:</span>
                          <p className="mt-1 text-gray-600">{appointment.reason}</p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      {appointment.status === 'confirmed' && (
                        <div className="mt-4 flex gap-3">
                          {canReschedule(appointment) && (
                            <button
                              onClick={() => onRescheduleRequest?.(appointment)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Reschedule
                            </button>
                          )}
                          {canCancel(appointment) && (
                            <button
                              onClick={() => onCancelRequest?.(appointment)}
                              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AppointmentList;