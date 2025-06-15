import React, { useState, useEffect, useCallback } from 'react';
import { Search, MoreHorizontal, UserPlus, Check, UserMinus, UserCheck, X, Clock, Send } from 'lucide-react';
import { supabase } from '../../client'; 

const DoctorConnectionsPage = () => {
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

  // ========================================
  // USER AUTHENTICATION & INITIALIZATION
  // ========================================
  useEffect(() => {
    getCurrentUser();
    loadConnections();
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
      
      const { data, error } = await supabase
        .from('doctor_connection_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allConnections = data || [];
      
      // Separate pending incoming requests from other connections
      const pendingIncoming = allConnections.filter(
        conn => conn.status === 'pending' && conn.request_direction === 'incoming'
      );
      
      const otherConnections = allConnections.filter(
        conn => !(conn.status === 'pending' && conn.request_direction === 'incoming')
      );
      
      setConnections(otherConnections);
      setPendingRequests(pendingIncoming);
      
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // SEARCH FUNCTIONALITY (FOR PATIENTS)
  // ========================================
  const searchPatients = useCallback(async (term) => {
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }

    if (!currentUser) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .rpc('search_available_patients_for_doctor', { 
          doctor_uuid: currentUser.id,
          search_term: term.toUpperCase() 
        });

      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchPatients(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchPatients]);

  // ========================================
  // CONNECTION MANAGEMENT - CREATING REQUESTS
  // ========================================
  const sendConnectionRequest = async (patient) => {
    if (!currentUser) {
      alert('Please log in to send connection requests');
      return;
    }

    try {
      const { error } = await supabase
        .rpc('create_connection_request', {
          requesting_user_id: currentUser.id,
          requesting_user_type: 'doctor',
          target_user_id: patient.patient_id,
          target_user_type: 'patient'
        });

      if (error) throw error;

      await loadConnections();
      
      setSearchResults(prev => prev.filter(p => p.patient_id !== patient.patient_id));
      
      alert('Connection request sent successfully!');
      
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
    
    alert(`Connection request ${action}ed successfully!`);
    
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
// FIXED CONNECTION REMOVAL MANAGEMENT
// ========================================
const removeConnection = async (connectionId) => {
  if (!confirm('Are you sure you want to remove this connection?')) {
    return;
  }

  try {
    const { error } = await supabase
      .rpc('remove_connection', {
        connection_id: connectionId
      });

    if (error) {
      console.error('Error removing connection:', error);
      throw error;
    }
    await loadConnections();
    
    alert('Connection removed successfully!');
    
  } catch (error) {
    console.error('Error removing connection:', error);
    
    if (error.message.includes('not found or you do not have permission')) {
      alert('You do not have permission to remove this connection.');
    } else {
      alert(`Failed to remove connection: ${error.message}`);
    }
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

  const formatPatientName = (firstName, lastName) => {
    return `${firstName} ${lastName}`;
  };

  const getConnectionIcon = (status, requestDirection) => {
    if (status === 'pending') {
      return requestDirection === 'outgoing' ? <Send className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
    }
    return <Check className="w-4 h-4" />;
  };

  const isPatientUnavailable = (patientId) => {
    return [...connections, ...pendingRequests].some(conn => conn.patient_id === patientId);
  };

  // ========================================
  // RENDER COMPONENT
  // ========================================
  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-myHeader">My Connections</h1>
          <p className="text-gray-600 mt-1">Manage your patient connections</p>
        </div>
        <MoreHorizontal className="w-6 h-6 text-gray-400" />
      </div>

      {/* Pending Incoming Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Incoming Connection Requests</h2>
            <p className="text-sm text-gray-600">{pendingRequests.length} patient(s) want to connect with you</p>
          </div>
          
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {formatPatientName(request.patient_first_name, request.patient_last_name)}
                  </h3>
                  <p className="text-sm text-gray-600">{request.patient_email}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">Patient ID: {request.patient_short_id}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Find Patients</h2>
          <p className="text-sm text-gray-600">Enter the first 3+ characters of a patient's ID to search</p>
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
                <p className="text-sm text-gray-600 mb-3">Found {searchResults.length} available patient(s):</p>
                {searchResults.map((patient) => (
                  <div key={patient.patient_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {formatPatientName(patient.first_name, patient.last_name)}
                      </h3>
                      <p className="text-sm text-gray-600">{patient.email}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">ID: {patient.short_id}</p>
                    </div>
                    <button
                      onClick={() => sendConnectionRequest(patient)}
                      disabled={isPatientUnavailable(patient.patient_id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isPatientUnavailable(patient.patient_id)
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
                <p className="text-gray-500">No available patients found with ID starting with "{searchTerm}"</p>
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
          <h2 className="text-lg font-semibold text-gray-900">Your Patient Connections</h2>
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
                          {formatPatientName(connection.patient_first_name, connection.patient_last_name)}
                        </h3>
                      </div>
                      {getStatusBadge(connection.status, connection.request_direction)}
                    </div>
                    <p className="text-sm text-gray-600">{connection.patient_email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="font-mono">Patient ID: {connection.patient_short_id}</span>
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
                            onClick={() => {
                              removeConnection(connection.id);
                              setShowDropdown(null);
                            }}
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
              <p className="text-gray-400 text-sm">Search for patients above to start connecting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorConnectionsPage;