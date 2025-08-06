import React, { useState, useEffect, useCallback } from 'react';
import { Search, MoreHorizontal, UserPlus, Check, UserMinus, UserCheck, X, Clock, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../client';
import { useNotifications } from '../../hooks/useNotifications';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Remove",
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>

          {/* Message */}
          <p className="text-gray-600 mb-6">{message}</p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuccessModal = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = "OK",
  autoClose = true,
  autoCloseDelay = 3000,
  variant = "success"
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const isWarning = variant === "warning";
  const iconBgColor = isWarning ? "bg-orange-100" : "bg-green-100";
  const iconColor = isWarning ? "text-orange-600" : "text-green-600";
  const buttonColor = isWarning ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`p-3 ${iconBgColor} rounded-full mb-4`}>
              {isWarning ? (
                <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
              ) : (
                <CheckCircle className={`w-6 h-6 ${iconColor}`} />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
          </div>

          {/* Full-width button */}
          <button
            onClick={onClose}
            className={`w-full py-3 ${buttonColor} text-white rounded-lg font-medium transition-colors`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

const PatientConnectionsPage = () => {
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'connected'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allAvailableDoctors, setAllAvailableDoctors] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const { refetch: refetchNotifications } = useNotifications();

  const [currentPage, setCurrentPage] = useState(1);
  const [doctorsPerPage] = useState(12); // Show 12 doctors per page
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    connectionId: null,
    connectionName: '',
    isRequestCancel: false
  });

  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    buttonText: 'OK',
    autoClose: true,
    variant: 'success'
  });

  useEffect(() => {
    const initializeData = async () => {
      await getCurrentUser();
      await loadConnections();
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (currentUser && !isLoading) {
      loadAllAvailableDoctors();
    }
  }, [currentUser, connections, pendingRequests, isLoading]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadConnections = async () => {
    try {
      setIsLoading(true);

      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      const { data, error } = await supabase
        .from('patient_connection_details')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const allConnections = data || [];
      const userConnections = allConnections.filter(conn => conn.patient_id === user.id);

      console.log('Total connections returned:', allConnections.length);
      console.log('User connections after filtering:', userConnections.length);
      console.log('All connections data:', userConnections);

      userConnections.forEach(conn => {
        console.log(`Connection ${conn.id}:`, {
          requester_type: conn.requester_type,
          request_direction: conn.request_direction,
          status: conn.status,
          doctor_name: `${conn.doctor_first_name} ${conn.doctor_last_name}`
        });
      });

      const pendingIncoming = userConnections.filter(
        conn => conn.status === 'pending' && conn.requester_type === 'doctor'
      );

      console.log('Pending incoming requests:', pendingIncoming);

      const otherConnections = userConnections.filter(
        conn => !(conn.status === 'pending' && conn.requester_type === 'doctor')
      );

      console.log('Other connections:', otherConnections);

      setConnections(otherConnections);
      setPendingRequests(pendingIncoming);

    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllAvailableDoctors = async () => {
    try {
      setIsLoadingDoctors(true);

      const { data, error } = await supabase
        .from('medicalprofessionals')
        .select('med_id, first_name, last_name, email, user_type')
        .eq('user_type', 'doctor')
        .eq('status', 'active')
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Supabase error loading doctors:', error);
        throw error;
      }

      console.log('All doctors from DB:', data?.length || 0);

      const connectedDoctorIds = [...connections, ...pendingRequests].map(conn => conn.med_id);
      console.log('Connected doctor IDs:', connectedDoctorIds);

      const availableDoctors = (data || []).filter(doctor =>
        !connectedDoctorIds.includes(doctor.med_id)
      );

      console.log('Available doctors after filtering:', availableDoctors.length);
      setAllAvailableDoctors(availableDoctors);
    } catch (error) {
      console.error('Error loading available doctors:', error);
      setAllAvailableDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const searchDoctors = useCallback(async (term) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    if (!currentUser) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('medicalprofessionals')
        .select('med_id, first_name, last_name, email, user_type')
        .eq('user_type', 'doctor')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
        .eq('status', 'active')
        .limit(10);

      if (error) throw error;

      const connectedDoctorIds = [...connections, ...pendingRequests].map(conn => conn.med_id);
      const availableDoctors = (data || []).filter(doctor =>
        !connectedDoctorIds.includes(doctor.med_id)
      );

      setSearchResults(availableDoctors);
    } catch (error) {
      console.error('Error searching doctors:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser, connections, pendingRequests]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchDoctors(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchDoctors]);

  const sendConnectionRequest = async (doctor) => {
    if (!currentUser) {
      alert('Please log in to send connection requests');
      return;
    }

    try {
      const { error } = await supabase
        .rpc('create_connection_request', {
          requesting_user_id: currentUser.id,
          requesting_user_type: 'patient',
          target_user_id: doctor.med_id,
          target_user_type: 'doctor'
        });

      if (error) throw error;

      await loadConnections();

      setSearchResults(prev => prev.filter(d => d.med_id !== doctor.med_id));

      setSuccessModal({
        isOpen: true,
        title: 'Connection Request Sent!',
        message: `Your connection request has been sent to ${formatDoctorName(doctor.first_name, doctor.last_name)}. You'll be notified when they respond.`
      });

    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Failed to send connection request. Please try again.');
    }
  };

  const handleConnectionRequest = async (connectionId, action) => {
    try {
      let error;

      if (action === 'accept') {
        const { error: acceptError } = await supabase
          .rpc('accept_connection_request', {
            connection_id: connectionId
          });
        error = acceptError;
      } else if (action === 'reject') {
        const { error: rejectError } = await supabase
          .rpc('reject_connection_request', {
            connection_id: connectionId
          });
        error = rejectError;
      }

      if (error) {
        console.error(`Error ${action}ing connection:`, error);
        throw error;
      }

      await loadConnections();
      refetchNotifications();

      const doctorName = pendingRequests.find(req => req.id === connectionId)?.doctor_first_name || 'Doctor';
      setSuccessModal({
        isOpen: true,
        title: `Connection ${action === 'accept' ? 'Accepted' : 'Declined'}!`,
        message: `You have successfully ${action}ed the connection request${action === 'accept' ? ` from Dr. ${doctorName}` : ''}.`
      });

    } catch (error) {
      console.error(`Error ${action}ing connection:`, error);

      if (error.message.includes('Only the recipient can')) {
        alert(`You can only ${action} connection requests sent to you.`);
      } else if (error.message.includes('not found or not pending')) {
        alert('This connection request is no longer available.');
      } else {
        alert(`Failed to ${action} connection. Please try again.`);
      }
    }
  };

  const openConfirmModal = (connection) => {
    const doctorName = formatDoctorName(connection.doctor_first_name, connection.doctor_last_name);
    const isRequestCancel = connection.status === 'pending' && connection.request_direction === 'outgoing';

    setConfirmModal({
      isOpen: true,
      connectionId: connection.id,
      connectionName: doctorName,
      isRequestCancel
    });
    setShowDropdown(null);
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      connectionId: null,
      connectionName: '',
      isRequestCancel: false
    });
  };

  const closeSuccessModal = () => {
    setSuccessModal({
      isOpen: false,
      title: '',
      message: ''
    });
  };

  const confirmRemoveConnection = async () => {
    if (!confirmModal.connectionId) return;

    try {
      const { error } = await supabase
        .rpc('remove_connection', {
          connection_id: confirmModal.connectionId
        });

      if (error) {
        console.error('Error removing connection:', error);
        throw error;
      }

      await loadConnections();

      const actionText = confirmModal.isRequestCancel ? 'cancelled' : 'removed';
      const isCancel = confirmModal.isRequestCancel;

      setSuccessModal({
        isOpen: true,
        title: isCancel ? 'Request Cancelled' : 'Connection Removed',
        message: isCancel
          ? `You have successfully cancelled the connection request to ${confirmModal.connectionName}.`
          : `You have successfully removed the connection with ${confirmModal.connectionName}. You will no longer have access to their medical records.`,
        variant: 'warning',
        buttonText: 'Close',
        autoClose: false
      });

    } catch (error) {
      console.error('Error removing connection:', error);

      if (error.message.includes('not found or you do not have permission')) {
        alert('You do not have permission to remove this connection.');
      } else {
        alert(`Failed to remove connection: ${error.message}`);
      }
    } finally {
      closeConfirmModal();
    }
  };

  const getStatusBadge = (status, requestDirection) => {
    const statusConfig = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        text: requestDirection === 'outgoing' ? 'Request Sent' : 'Pending Approval'
      },
      accepted: { color: 'bg-green-100 text-green-800', text: 'Connected' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatDoctorName = (firstName, lastName) => {
    return `Dr. ${firstName} ${lastName}`;
  };

  const formatUserType = (userType) => {
    return userType === 'doctor' ? 'Doctor' : userType;
  };

  const getConnectionIcon = (status, requestDirection) => {
    if (status === 'pending') {
      return requestDirection === 'outgoing' ? <Send className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
    }
    return <Check className="w-4 h-4" />;
  };

  const isDoctorUnavailable = (doctorId) => {
    return [...connections, ...pendingRequests].some(conn => conn.med_id === doctorId);
  };

  const totalPages = Math.ceil(allAvailableDoctors.length / doctorsPerPage);
  const startIndex = (currentPage - 1) * doctorsPerPage;
  const endIndex = startIndex + doctorsPerPage;
  const currentDoctors = allAvailableDoctors.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    document.getElementById('doctors-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, allAvailableDoctors.length]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return (
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-700">
          Showing {startIndex + 1} to {Math.min(endIndex, allAvailableDoctors.length)} of {allAvailableDoctors.length} doctors
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            Previous
          </button>

          <div className="flex space-x-1">
            {getVisiblePages().map((page, index) => (
              page === '...' ? (
                <span key={`dots-${index}`} className="px-3 py-2 text-gray-400">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmRemoveConnection}
        title={confirmModal.isRequestCancel ? "Cancel Connection Request" : "Remove Connection"}
        message={
          confirmModal.isRequestCancel
            ? `Are you sure you want to cancel your connection request to ${confirmModal.connectionName}?`
            : `Are you sure you want to remove your connection with ${confirmModal.connectionName}? This action cannot be undone.`
        }
        confirmText={confirmModal.isRequestCancel ? "Cancel Request" : "Remove Connection"}
        cancelText="Keep Connection"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={closeSuccessModal}
        title={successModal.title}
        message={successModal.message}
        buttonText={successModal.buttonText || "Great!"}
        autoClose={successModal.autoClose !== false}
        autoCloseDelay={4000}
        variant={successModal.variant || "success"}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-myHeader">My Connections</h1>
          <p className="text-gray-600 mt-1">Connect with medical professionals</p>
        </div>
        {/*<MoreHorizontal className="w-6 h-6 text-gray-400" />*/}
      </div>

      {/* Pending Incoming Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Incoming Connection Requests</h2>
            <p className="text-sm text-gray-600">{pendingRequests.length} doctor(s) want to connect with you</p>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {formatDoctorName(request.doctor_first_name, request.doctor_last_name)}
                  </h3>
                  <p className="text-sm text-blue-600 font-medium">{formatUserType(request.doctor_type)}</p>
                  <p className="text-sm text-gray-600">{request.doctor_email}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">Doctor ID: {request.doctor_short_id}</p>
                  <p className="text-xs text-gray-500">Requested: {new Date(request.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleConnectionRequest(request.id, 'accept')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleConnectionRequest(request.id, 'reject')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('available')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Available Doctors
              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                {isLoadingDoctors ? '...' : allAvailableDoctors.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('connected')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'connected'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              My Connections
              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                {connections.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'available' ? (
            <>
              {/* Search Section */}
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Find Medical Professionals</h2>
                  <p className="text-sm text-gray-600">Search doctors by their first name or last name</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter doctor's first name or last name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Search Results */}
                {searchTerm && (
                  <div className="mt-4">
                    {isSearching ? (
                      <div className="text-center py-6">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="text-gray-500 mt-2">Searching...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 mb-3">Found {searchResults.length} available doctor(s):</p>
                        {searchResults.map((doctor) => (
                          <div key={doctor.med_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {formatDoctorName(doctor.first_name, doctor.last_name)}
                              </h3>
                              <p className="text-sm text-blue-600 font-medium">{formatUserType(doctor.user_type)}</p>
                              <p className="text-sm text-gray-600">{doctor.email}</p>
                            </div>
                            <button
                              onClick={() => sendConnectionRequest(doctor)}
                              disabled={isDoctorUnavailable(doctor.med_id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDoctorUnavailable(doctor.med_id)
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                              <UserPlus className="w-4 h-4" />
                              Send Request
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : searchTerm.length >= 2 ? (
                      <div className="text-center py-6">
                        <p className="text-gray-500">No available doctors found matching "{searchTerm}"</p>
                        <p className="text-xs text-gray-400 mt-1">They may not exist or you're already connected</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Enter at least 2 characters to search</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Available Doctors Grid */}
              {!searchTerm && (
                <div id="doctors-section">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">All Available Doctors</h3>
                      <p className="text-sm text-gray-600">
                        {isLoadingDoctors ? 'Loading...' : `${allAvailableDoctors.length} doctor(s) available to connect with`}
                      </p>
                    </div>

                    {/* View Mode Toggle */}
                    {!isLoadingDoctors && allAvailableDoctors.length > 6 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">View:</span>
                        <div className="flex border border-gray-200 rounded-lg p-1">
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'grid'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                              }`}
                          >
                            Grid
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                              }`}
                          >
                            List
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isLoadingDoctors ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <p className="text-gray-500 mt-2">Loading available doctors...</p>
                    </div>
                  ) : allAvailableDoctors.length > 0 ? (
                    <>
                      {/* Doctors Display */}
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {currentDoctors.map((doctor) => (
                            <div key={doctor.med_id} className="p-4 bg-gray-50 rounded-lg border hover:border-blue-200 hover:bg-blue-50 transition-all">
                              <div className="mb-3">
                                <h3 className="font-medium text-gray-900 text-sm">
                                  {formatDoctorName(doctor.first_name, doctor.last_name)}
                                </h3>
                                <p className="text-xs text-blue-600 font-medium">{formatUserType(doctor.user_type)}</p>
                                <p className="text-xs text-gray-600 truncate">{doctor.email}</p>
                              </div>
                              <button
                                onClick={() => sendConnectionRequest(doctor)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                              >
                                <UserPlus className="w-3 h-3" />
                                Connect
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {currentDoctors.map((doctor) => (
                            <div key={doctor.med_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:border-blue-200 hover:bg-blue-50 transition-all">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">
                                  {formatDoctorName(doctor.first_name, doctor.last_name)}
                                </h3>
                                <p className="text-sm text-blue-600 font-medium">{formatUserType(doctor.user_type)}</p>
                                <p className="text-sm text-gray-600">{doctor.email}</p>
                              </div>
                              <button
                                onClick={() => sendConnectionRequest(doctor)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                <UserPlus className="w-4 h-4" />
                                Connect
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pagination */}
                      {renderPagination()}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No available doctors to connect with</p>
                      <p className="text-gray-400 text-sm">All doctors may already be connected or have sent you requests</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Connected Doctors Tab */
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Connections</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {connections.length} connection{connections.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-2">Loading connections...</p>
                  </div>
                ) : connections.length > 0 ? (
                  connections.map((connection) => (
                    <div key={connection.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {getConnectionIcon(connection.status, connection.request_direction)}
                              <h3 className="font-medium text-gray-900">
                                {formatDoctorName(connection.doctor_first_name, connection.doctor_last_name)}
                              </h3>
                            </div>
                            {getStatusBadge(connection.status, connection.request_direction)}
                          </div>
                          <p className="text-sm text-blue-600 font-medium">{formatUserType(connection.doctor_type)}</p>
                          <p className="text-sm text-gray-600">{connection.doctor_email}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="font-mono">ID: {connection.doctor_short_id}</span>
                            <span>
                              {connection.request_direction === 'outgoing' ? 'Requested' : 'Connected'}: {new Date(connection.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown(showDropdown === connection.id ? null : connection.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreHorizontal className="w-5 h-5 text-gray-400" />
                          </button>

                          {/* Dropdown Menu */}
                          {showDropdown === connection.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowDropdown(null)}
                              ></div>
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                <button
                                  onClick={() => openConfirmModal(connection)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <UserMinus className="w-4 h-4" />
                                  {connection.status === 'pending' && connection.request_direction === 'outgoing'
                                    ? 'Cancel Request'
                                    : 'Remove Connection'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No connections yet</p>
                    <p className="text-gray-400 text-sm">Switch to Available Doctors tab to start connecting</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientConnectionsPage;