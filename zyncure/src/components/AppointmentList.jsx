const AppointmentList = ({ 
  selectedDate, 
  appointments = [], 
  doctors = [],
  emptyStateMessage = "No appointments scheduled for this date",
  emptyStateSubtext = "Click \"Book New Appointment\" to schedule one"
}) => {
  const formatDate = (date) => {
  // Use local date string to avoid timezone conversion
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

  const selectedDateAppointments = appointments.filter(apt => 
    apt.date === formatDate(selectedDate)
  );

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
            
            return (
              <div
                key={appointment.id}
                className="p-6 bg-teal-50 border-l-4 border-l-teal-500"
              >
                <div className="flex items-center gap-6">
                  <div className="text-gray-600 font-bold text-lg min-w-[100px]">
                    {appointment.time}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800 text-lg">
                        {doctor?.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {doctor?.specialty}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-teal-600 font-medium">
                        {appointment.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {appointment.reason}
                      </span>
                    </div>
                  </div>
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