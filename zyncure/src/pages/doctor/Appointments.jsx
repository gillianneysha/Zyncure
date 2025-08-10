import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight, Settings, AlertTriangle, Mail, Phone, MapPin, X } from 'lucide-react';
import { doctorAppointmentService } from '../../services/DoctorAppointmentService';
import { doctorAvailabilityService } from '../../services/DoctorAvailabilityService';
import DoctorAvailabilityManager from '../../components/DoctorAvailabilityManager';

const DoctorAppointments = () => {
  const [doctorData, setDoctorData] = useState({
    name: "Loading...",
    id: null,
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const appointmentsPerPage = 2;
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [patientDetails, setPatientDetails] = useState(null);
  const [appointmentsByDate, setAppointmentsByDate] = useState({});
  const [showAvailabilityManager, setShowAvailabilityManager] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return '';
    
    try {
      if (timeString.includes('AM') || timeString.includes('PM')) {
        return timeString;
      }
      
      let timePart;
      
      if (timeString.includes(' ')) {
        const parts = timeString.split(' ');
        timePart = parts[1]; 
      } else {
        timePart = timeString;
      }
      
      const timeComponents = timePart.split(':');
      let hours = parseInt(timeComponents[0]);
      const minutes = parseInt(timeComponents[1]);
      
      let finalTime;
      
      if (hours === 0) {
        finalTime = `12:${minutes.toString().padStart(2, '0')} AM`;
      } else if (hours < 12) {
        finalTime = `${hours}:${minutes.toString().padStart(2, '0')} AM`;
      } else if (hours === 12) {
        finalTime = `12:${minutes.toString().padStart(2, '0')} PM`;
      } else {
        finalTime = `${hours - 12}:${minutes.toString().padStart(2, '0')} PM`;
      }
      
      return finalTime;
      
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const formatDateForStorage = (date) => {
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const dateString = formatDateForStorage(selectedDate);
      const { data, error } = await doctorAppointmentService.getDoctorAppointments(dateString, statusFilter);
      
      if (error) {
        setError(`Error loading appointments: ${error}`);
        setAppointments([]);
      } else {
        setAppointments(data || []);
        // Count pending appointments for notification
        const pending = (data || []).filter(apt => apt.status === 'pending' || apt.status === 'requested').length;
        setPendingCount(pending);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    loadDoctorProfile();
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const loadDoctorProfile = async () => {
    try {
      const { data, error } = await doctorAppointmentService.getDoctorProfile();
      if (error) {
        setError(`Error loading doctor profile: ${error}`);
      } else if (data) {
        setDoctorData({
          name: data.name || 'Doctor',
          id: data.id,
          email: data.email,
          contact_no: data.contact_no
        });
      }
    } catch (err) {
      setError('Failed to load doctor profile');
      console.error('Error loading doctor profile:', err);
    }
  };

  const loadAppointmentsForCalendar = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const { data, error } = await doctorAppointmentService.getDoctorAppointmentsByDateRange(
        formatDateForStorage(firstDay),     
        formatDateForStorage(lastDay)       
      );
      
      if (!error && data) {
        const appointmentsByDate = {};
        data.forEach(apt => {
          const date = apt.date;
          if (!appointmentsByDate[date]) {
            appointmentsByDate[date] = [];
          }
          appointmentsByDate[date].push(apt);
        });
        setAppointmentsByDate(appointmentsByDate);
      }
    } catch (err) {
      console.error('Error loading calendar appointments:', err);
    }
  }, [currentDate]);

  useEffect(() => {
    if (doctorAppointmentService.getDoctorAppointmentsByDateRange) {
      loadAppointmentsForCalendar();
    }
  }, [currentDate, loadAppointmentsForCalendar]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCurrentPage(1); 
    setError('');
  };

  const handleMonthNavigate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

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

  const handleConfirmAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      const { error } = await doctorAppointmentService.updateAppointmentStatus(appointmentId, 'confirmed');
      if (error) {
        setError(`Failed to confirm appointment: ${error}`);
      } else {
        await loadAppointments();
        setError('');
      }
    } catch (err) {
      setError('Failed to confirm appointment');
      console.error('Error confirming appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleAppointment = async (appointmentId) => {
    const reason = prompt('Please provide a reason for rescheduling (optional):');
    
    setLoading(true);
    try {
      const { error } = await doctorAppointmentService.rescheduleAppointment(appointmentId, reason);
      if (error) {
        setError(`Failed to reschedule appointment: ${error}`);
      } else {
        await loadAppointments();
        setError('');
      }
    } catch (err) {
      setError('Failed to reschedule appointment');
      console.error('Error rescheduling appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    const reason = prompt('Please provide a reason for cancellation (optional):');
    
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await doctorAppointmentService.cancelAppointment(appointmentId, reason);
      if (error) {
        setError(`Failed to cancel appointment: ${error}`);
      } else {
        await loadAppointments();
        setError('');
      }
    } catch (err) {
      setError('Failed to cancel appointment');
      console.error('Error cancelling appointment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);

    try {
      const { data, error } = await doctorAppointmentService.getPatientDetails(appointment.patient_id);
      if (error) {
        console.error('Error loading patient details:', error);
        setPatientDetails(null);
      } else {
        setPatientDetails(data);
      }
    } catch (err) {
      console.error('Error loading patient details:', err);
      setPatientDetails(null);
    }
  };

  const getAppointmentsForDate = () => {
    return appointments;
  };

  const getFilteredAppointments = () => {
    return appointments;
  };

  const getPaginatedAppointments = () => {
    const filteredAppointments = getFilteredAppointments();
    const startIndex = (currentPage - 1) * appointmentsPerPage;
    const endIndex = startIndex + appointmentsPerPage;
    return filteredAppointments.slice(startIndex, endIndex);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': 
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'rescheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      
      const dateString = date.toISOString().split('T')[0];
      const dayAppointments = appointmentsByDate[dateString] || [];
      const hasAppointments = dayAppointments.length > 0;
      const pendingAppointments = dayAppointments.filter(apt => 
        apt.status === 'pending' || apt.status === 'requested'
      ).length;

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
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
              <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
              {pendingAppointments > 0 && (
                <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
              )}
            </div>
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

  const selectedDateAppointments = appointments.filter((apt) => {
    const selectedDateString = formatDateForStorage(selectedDate);
    // Check both appointment_date (for confirmed) and requested_date (for requested)
    const appointmentDate = apt.appointment_date || apt.requested_date || apt.date;
    return appointmentDate === selectedDateString;
  });

  const filteredAppointments = getFilteredAppointments();
  const paginatedAppointments = getPaginatedAppointments();
  const confirmedCount = selectedDateAppointments.filter(apt => apt.status === 'confirmed').length;
  const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);

  const getStatusCounts = () => {
    const counts = {};
    selectedDateAppointments.forEach(apt => {
      const status = apt.status === 'requested' ? 'pending' : apt.status;
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const getHeaderText = () => {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = selectedDate.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return "Today's Schedule";
    } else if (isTomorrow) {
      return "Tomorrow's Schedule";
    } else {
      return `Schedule for ${selectedDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })}`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">
          {doctorData.name} - {getHeaderText()}
        </h1>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {pendingCount} Pending Confirmation{pendingCount !== 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={() => setShowAvailabilityManager(true)}
            className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Availability
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-600">Loading...</p>
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
                <span className="text-gray-600">Selected Date:</span>
                <span className="font-semibold">{selectedDateAppointments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmed:</span>
                <span className="font-semibold text-green-600">{confirmedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-semibold text-yellow-600">{statusCounts.pending || 0}</span>
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
                      ? `${selectedDateAppointments.length} Total Appointments` 
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
                      status === 'rescheduled' ? 'bg-purple-500' :
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
                    {loading ? 'Loading appointments...' :
                     statusFilter === 'all' 
                      ? 'No appointments scheduled for this date'
                      : `No ${statusFilter} appointments found`
                    }
                  </p>
                </div>
              ) : (
                paginatedAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`border rounded-lg p-4 transition-all ${
                      appointment.status === 'pending' || appointment.status === 'requested'
                        ? 'border-yellow-300 bg-yellow-50 shadow-md'
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-sm font-semibold ${
                          appointment.status === 'pending' || appointment.status === 'requested'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {formatTimeForDisplay(appointment.time)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {appointment.patient_name}
                          </h3>
                          {(appointment.status === 'pending' || appointment.status === 'requested') && (
                            <p className="text-xs text-yellow-600 font-medium">
                              ⏳ Awaiting your confirmation
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status === 'requested' ? 'Pending' : 
                         appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
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
                      
                      {(appointment.status === 'pending' || appointment.status === 'requested') && (
                        <button
                          onClick={() => handleConfirmAppointment(appointment.id)}
                          disabled={loading}
                          className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Confirm
                        </button>
                      )}
                      
                      {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                        <>
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
                        </>
                      )}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-lg font-semibold">
                    {new Date(selectedAppointment.date || new Date()).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Visit
                </label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800">{selectedAppointment.reason || 'No reason provided'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status
                </label>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAppointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  selectedAppointment.status === 'pending' || selectedAppointment.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                  selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  selectedAppointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  selectedAppointment.status === 'rescheduled' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedAppointment.status === 'requested' ? 'Pending Confirmation' : 
                   selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                </span>
              </div>

              {/* Patient Information Section */}
              {patientDetails && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Patient Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Email</span>
                      </div>
                      <p className="text-gray-800">{patientDetails.email || 'Not provided'}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Phone</span>
                      </div>
                      <p className="text-gray-800">{patientDetails.contact_no || 'Not provided'}</p>
                    </div>
                    
                    {patientDetails.birthdate && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Date of Birth</span>
                        </div>
                        <p className="text-gray-800">
                          {new Date(patientDetails.birthdate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    
                    {patientDetails.address && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Address</span>
                        </div>
                        <p className="text-gray-800">{patientDetails.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Appointment History Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Appointment Requested</p>
                      <p className="text-xs text-blue-600">
                        {selectedAppointment.created_at ? 
                          new Date(selectedAppointment.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Date not available'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {selectedAppointment.status === 'confirmed' && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-green-800">Appointment Confirmed</p>
                        <p className="text-xs text-green-600">
                          {selectedAppointment.updated_at ? 
                            new Date(selectedAppointment.updated_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Date not available'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {(selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'rescheduled') && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          Appointment {selectedAppointment.status === 'cancelled' ? 'Cancelled' : 'Rescheduled'}
                        </p>
                        <p className="text-xs text-red-600">
                          {selectedAppointment.updated_at ? 
                            new Date(selectedAppointment.updated_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Date not available'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Notes Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Patient ID</span>
                    </div>
                    <p className="text-gray-800 font-mono text-sm">{selectedAppointment.patient_id}</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Appointment ID</span>
                    </div>
                    <p className="text-gray-800 font-mono text-sm">{selectedAppointment.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                
                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'requested') && (
                  <div className="flex gap-2">
                  <button
  onClick={() => {
    handleConfirmAppointment(selectedAppointment.id);
    setShowDetailsModal(false);
  }}
  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
>
  Confirm Appointment
</button>
                    <button
  onClick={() => {
    handleRescheduleAppointment(selectedAppointment.id);
    setShowDetailsModal(false);
  }}
  className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
>
  Request Reschedule
</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability Manager Modal */}
      {showAvailabilityManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Manage Your Availability</h2>
                <button
                  onClick={() => setShowAvailabilityManager(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <DoctorAvailabilityManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;