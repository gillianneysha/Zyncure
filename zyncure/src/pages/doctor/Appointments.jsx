import { useState } from 'react';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const DoctorAppointments = () => {
  const [doctorData] = useState({
    name: "Dr. Smith",
    id: "DOC001",
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const appointmentsPerPage = 2;
  
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      time: '8:00 AM',
      patient_name: 'Maria Santos',
      patient_id: 'PAT001',
      type: 'Checkup',
      status: 'confirmed',
      reason: 'Regular health checkup',
      contact: '+63 912 345 6789'
    },
    {
      id: 2,
      time: '8:30 AM',
      patient_name: 'Bethany Ramos',
      patient_id: 'PAT002',
      type: 'Checkup',
      status: 'confirmed',
      reason: 'Follow-up consultation',
      contact: '+63 912 345 6790'
    },
    {
      id: 3,
      time: '9:30 AM',
      patient_name: 'Julie Salazar',
      patient_id: 'PAT003',
      type: 'Checkup',
      status: 'confirmed',
      reason: 'Annual physical examination',
      contact: '+63 912 345 6791'
    },
    {
      id: 4,
      time: '10:00 AM',
      patient_name: 'Kimberly Tan',
      patient_id: 'PAT004',
      type: 'Checkup',
      status: 'confirmed',
      reason: 'Blood pressure monitoring',
      contact: '+63 912 345 6792'
    },
    {
      id: 5,
      time: '10:30 AM',
      patient_name: 'Roberto Cruz',
      patient_id: 'PAT005',
      type: 'Consultation',
      status: 'pending',
      reason: 'Diabetes management',
      contact: '+63 912 345 6793'
    },
    {
      id: 6,
      time: '11:00 AM',
      patient_name: 'Angela Lopez',
      patient_id: 'PAT006',
      type: 'Follow-up',
      status: 'confirmed',
      reason: 'Post-surgery checkup',
      contact: '+63 912 345 6794'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Calendar functionality
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCurrentPage(1); // Reset to first page when changing date
    setStatusFilter('all'); // Reset filter when changing date
    setError('');
  };

  const handleMonthNavigate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Filter functionality
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  // Pagination functions
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const selectedDateAppointments = getAppointmentsForDate();
    const totalPages = Math.ceil(selectedDateAppointments.length / appointmentsPerPage);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Appointment actions
  const handleConfirmAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      // API call would go here
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'confirmed' }
            : apt
        )
      );
    } catch {
      setError('Failed to confirm appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      // API call would go here
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'pending_reschedule' }
            : apt
        )
      );
    } catch {
      setError('Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      // API call would go here
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'cancelled' }
            : apt
        )
      );
    } catch {
      setError('Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Get appointments for selected date
  const getAppointmentsForDate = () => {
    // In real implementation, filter by selectedDate
    return appointments;
  };

  // Get filtered appointments
  const getFilteredAppointments = () => {
    const selectedDateAppointments = getAppointmentsForDate();
    if (statusFilter === 'all') {
      return selectedDateAppointments;
    }
    return selectedDateAppointments.filter(apt => apt.status === statusFilter);
  };

  // Get paginated appointments
  const getPaginatedAppointments = () => {
    const filteredAppointments = getFilteredAppointments();
    const startIndex = (currentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    return filteredAppointments.slice(startIndex, endIndex);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Simple calendar component
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const hasAppointments = appointments.some(() => {
        // In real implementation, check if appointment date matches this day
        return day === 19; // Mock data for March 19
      });

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(date)}
          className={`
            p-1 text-sm rounded transition-colors relative
            ${isSelected 
              ? 'bg-teal-500 text-white' 
              : isToday 
                ? 'bg-teal-100 text-teal-800' 
                : 'hover:bg-gray-100'
            }
          `}
        >
          {day}
          {hasAppointments && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-400 rounded-full"></div>
          )}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => handleMonthNavigate(-1)}
            className="p-1 hover:bg-gray-100 rounded text-sm"
          >
            ←
          </button>
          <h3 className="font-semibold">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => handleMonthNavigate(1)}
            className="p-1 hover:bg-gray-100 rounded text-sm"
          >
            →
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-1 text-xs font-medium text-gray-500 text-center">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const selectedDateAppointments = getAppointmentsForDate();
  const filteredAppointments = getFilteredAppointments();
  const paginatedAppointments = getPaginatedAppointments();
  const confirmedCount = selectedDateAppointments.filter(apt => apt.status === 'confirmed').length;
  const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);

  // Get status counts for filter badges
  const getStatusCounts = () => {
    const counts = {};
    selectedDateAppointments.forEach(apt => {
      counts[apt.status] = (counts[apt.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-myHeader mb-4">
        {doctorData.name} - Today's Schedule
      </h1>
      
      {/* Global Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <div className="flex gap-8">
        {/* Left Calendar Section */}
        <div className="w-80">
          {renderCalendar()}
          
          <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-2">Quick Stats</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Today's:</span>
                <span className="font-semibold">{selectedDateAppointments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmed:</span>
                <span className="font-semibold text-green-600">{confirmedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Appointments Section */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-teal-500 text-white p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">
                    {statusFilter === 'all' 
                      ? `${confirmedCount} Confirmed Appointments` 
                      : `${filteredAppointments.length} ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Appointments`
                    }
                  </h2>
                  {totalPages > 1 && (
                    <p className="text-teal-100 text-xs mt-1">
                      Page {currentPage} of {totalPages} ({filteredAppointments.length} filtered)
                    </p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="text-teal-100">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleStatusFilterChange('all')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({selectedDateAppointments.length})
                </button>
                
                {Object.entries(statusCounts).map(([status, count]) => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilterChange(status)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                      statusFilter === status
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      status === 'confirmed' ? 'bg-green-500' :
                      status === 'pending' ? 'bg-yellow-500' :
                      status === 'cancelled' ? 'bg-red-500' :
                      status === 'completed' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></span>
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* Appointments List */}
            <div className="p-4 space-y-3 min-h-[300px]">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto mb-3 w-10 h-10 text-gray-300" />
                  <p className="text-sm">
                    {statusFilter === 'all' 
                      ? 'No appointments scheduled for this date'
                      : `No ${statusFilter} appointments found`
                    }
                  </p>
                </div>
              ) : (
                paginatedAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-semibold">
                          {appointment.time}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {appointment.patient_name}
                          </h3>
                          <p className="text-gray-600 text-sm">{appointment.type}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>

                    <div className="mb-3 text-sm">
                      <p className="text-gray-700">
                        <strong>Reason:</strong> {appointment.reason}
                      </p>
                      <p className="text-gray-700 mt-1">
                        <strong>Patient ID:</strong> {appointment.patient_id}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleViewDetails(appointment)}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors flex items-center gap-1 text-sm"
                      >
                        <FileText className="w-3 h-3" />
                        Details
                      </button>
                      
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => handleConfirmAppointment(appointment.id)}
                          disabled={loading}
                          className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Confirm
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleRescheduleAppointment(appointment.id)}
                        disabled={loading}
                        className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
                        <Clock className="w-3 h-3" />
                        Reschedule
                      </button>
                      
                      <button
                        onClick={() => handleCancelAppointment(appointment.id)}
                        disabled={loading}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
                      >
                        <XCircle className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 pb-6">
                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-teal-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Appointment Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-lg font-semibold">{selectedAppointment.patient_name}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Time
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="text-lg font-semibold">{selectedAppointment.time}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient ID
                  </label>
                  <span className="text-gray-600">{selectedAppointment.patient_id}</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact
                  </label>
                  <span className="text-gray-600">{selectedAppointment.contact}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Type
                </label>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
                  {selectedAppointment.type}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Visit
                </label>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedAppointment.reason}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleConfirmAppointment(selectedAppointment.id);
                  setShowDetailsModal(false);
                }}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;