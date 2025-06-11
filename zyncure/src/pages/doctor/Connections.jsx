import React, { useState, useEffect, useCallback } from 'react';
import { Search, MoreHorizontal, UserPlus, Check, UserMinus, UserCheck, X } from 'lucide-react';
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
  const [addedConnections, setAddedConnections] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  // ========================================
  // USER AUTHENTICATION & INITIALIZATION
  // ========================================
  useEffect(() => {
    getCurrentUser();
    loadConnections();
    loadPendingRequests();
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
      
      // Get connections from doctor's perspective using the view
      const { data, error } = await supabase
        .from('doctor_connection_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConnections(data || []);
      
      // Track which patients are already connected
      const connectedPatientIds = new Set(data?.map(conn => conn.patient_id) || []);
      setAddedConnections(connectedPatientIds);
      
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_connection_details')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
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

    setIsSearching(true);
    try {
      // Use the search function for patients
      const { data, error } = await supabase
        .rpc('search_patient_by_short_id', { 
          search_id: term.toUpperCase() 
        });

      if (error) throw error;
      
      // Filter out already connected patients
      const filteredResults = (data || []).filter(
        patient => !addedConnections.has(patient.patient_id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [addedConnections]);

  // Handle search input with debouncing
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
  // CONNECTION MANAGEMENT - ADDING
  // ========================================
  const addConnection = async (patient) => {
    if (!currentUser) {
      alert('Please log in to add connections');
      return;
    }

    try {
      // Get current user's med_id
      const { data: doctorData, error: doctorError } = await supabase
        .from('medicalprofessionals')
        .select('med_id')
        .eq('med_id', currentUser.id)
        .single();

      if (doctorError) throw doctorError;

      // Insert new connection (doctor initiating connection)
      const { data, error } = await supabase
        .from('connections')
        .insert({
          patient_id: patient.patient_id,
          med_id: doctorData.med_id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const newConnection = {
        id: data.id,
        patient_id: data.patient_id,
        med_id: data.med_id,
        status: data.status,
        created_at: data.created_at,
        patient_first_name: patient.first_name,
        patient_last_name: patient.last_name,
        patient_email: patient.email,
        patient_short_id: patient.short_id
      };

      setConnections(prev => [newConnection, ...prev]);
      setAddedConnections(prev => new Set([...prev, patient.patient_id]));
      
      // Remove from search results
      setSearchResults(prev => prev.filter(p => p.patient_id !== patient.patient_id));
      
      alert('Connection request sent successfully!');
      
    } catch (error) {
      console.error('Error adding connection:', error);
      alert('Failed to add connection. Please try again.');
    }
  };

  // ========================================
  // CONNECTION REQUEST MANAGEMENT
  // ========================================
  const handleConnectionRequest = async (connectionId, action) => {
    try {
      const status = action === 'accept' ? 'accepted' : 'rejected';
      
      const { error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId);

      if (error) throw error;

      // Update local state
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status }
            : conn
        )
      );

      setPendingRequests(prev => prev.filter(req => req.id !== connectionId));
      
      alert(`Connection request ${action}ed successfully!`);
      
    } catch (error) {
      console.error(`Error ${action}ing connection:`, error);
      alert(`Failed to ${action} connection. Please try again.`);
    }
  };

  // ========================================
  // CONNECTION MANAGEMENT - REMOVING
  // ========================================
  const removeConnection = async (connectionId, patientId) => {
    if (!confirm('Are you sure you want to remove this connection?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      // Update local state
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      setAddedConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });

      alert('Connection removed successfully!');
      
    } catch (error) {
      console.error('Error removing connection:', error);
      alert('Failed to remove connection. Please try again.');
    }
  };

  // ========================================
  // UI HELPER FUNCTIONS
  // ========================================
  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatPatientName = (firstName, lastName) => {
    return `${firstName} ${lastName}`;
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

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Pending Connection Requests</h2>
            <p className="text-sm text-gray-600">{pendingRequests.length} request(s) waiting for your response</p>
          </div>
          
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
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
                    Reject
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
          <p className="text-sm text-gray-600">Enter the first 4 characters of a patient's ID to search</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Enter first 4 characters (e.g., A1B2)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            maxLength={4}
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
                <p className="text-sm text-gray-600 mb-3">Found {searchResults.length} patient(s):</p>
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
                      onClick={() => addConnection(patient)}
                      disabled={addedConnections.has(patient.patient_id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        addedConnections.has(patient.patient_id)
                          ? 'bg-green-100 text-green-700 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {addedConnections.has(patient.patient_id) ? (
                        <>
                          <Check className="w-4 h-4" />
                          Connected
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Connect
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : searchTerm.length >= 3 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No patients found with ID starting with "{searchTerm}"</p>
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
                      <h3 className="font-medium text-gray-900">
                        {formatPatientName(connection.patient_first_name, connection.patient_last_name)}
                      </h3>
                      {getStatusBadge(connection.status)}
                    </div>
                    <p className="text-sm text-gray-600">{connection.patient_email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="font-mono">Patient ID: {connection.patient_short_id}</span>
                      <span>Connected: {new Date(connection.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
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
                              removeConnection(connection.id, connection.patient_id);
                              setShowDropdown(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                            Remove Connection
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