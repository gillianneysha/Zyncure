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

// Success Modal Component
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
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const { refetch: refetchNotifications } = useNotifications();

  // Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    connectionId: null,
    connectionName: '',
    isRequestCancel: false
  });

  // Success modal state
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    buttonText: 'OK',
    autoClose: true,
    variant: 'success'
  });

  // ========================================
  // USER AUTHENTICATION & INITIALIZATION
  // ========================================
 useEffect(() => {
  const initializeData = async () => {
    await getCurrentUser();
    await loadConnections();
  };
  
  initializeData();
}, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  // ========================================
  // DATA LOADING FUNCTIONS
  // ========================================
 
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

  // ========================================
  // SEARCH FUNCTIONALITY (FOR DOCTORS)
  // ========================================
  const searchDoctors = useCallback(async (term) => {
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }

    if (!currentUser) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .rpc('search_available_doctors_for_patient', { 
          patient_uuid: currentUser.id,
          search_term: term.toUpperCase() 
        });

      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching doctors:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser]);

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

  // ========================================
  // CONNECTION MANAGEMENT - CREATING REQUESTS
  // ========================================
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

// ========================================
// FIXED CONNECTION REQUEST MANAGEMENT
// ========================================

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

// ========================================
// MODAL HANDLERS
// ========================================
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

  // ========================================
  // UI HELPER FUNCTIONS
  // ========================================
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

  const getConnectionIcon = (status, requestDirection) => {
    if (status === 'pending') {
      return requestDirection === 'outgoing' ? <Send className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
    }
    return <Check className="w-4 h-4" />;
  };

  
  const isDoctorUnavailable = (doctorId) => {
    return [...connections, ...pendingRequests].some(conn => conn.med_id === doctorId);
  };

  // ========================================
  // RENDER COMPONENT
  // ========================================
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
        <MoreHorizontal className="w-6 h-6 text-gray-400" />
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
                  <p className="text-sm text-blue-600 font-medium">{request.doctor_type}</p>
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

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Find Medical Professionals</h2>
          <p className="text-sm text-gray-600">Enter the first 3+ characters of a doctor's ID to search</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Enter first 3+ characters (e.g., A1B)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase tracking-wider"
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
                      <p className="text-sm text-blue-600 font-medium">{doctor.user_type}</p>
                      <p className="text-sm text-gray-600">{doctor.email}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">ID: {doctor.short_id}</p>
                    </div>
                    <button
                      onClick={() => sendConnectionRequest(doctor)}
                      disabled={isDoctorUnavailable(doctor.med_id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isDoctorUnavailable(doctor.med_id)
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
            ) : searchTerm.length >= 3 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No available doctors found with ID starting with "{searchTerm}"</p>
                <p className="text-xs text-gray-400 mt-1">They may not exist or you're already connected</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Enter at least 3 characters to search</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connections List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Connections</h2>
          <p className="text-sm text-gray-600 mt-1">
            {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
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
                    <p className="text-sm text-blue-600 font-medium">{connection.doctor_type}</p>
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
              <p className="text-gray-400 text-sm">Search for medical professionals above to start connecting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientConnectionsPage;