import React, { useState, useEffect } from 'react';
import { Search, Eye, Share2, Bell, Calendar, FileText, Users } from 'lucide-react';
import { supabase } from '../../client'; 
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  // State for backend data
  const [connectedPatients, setConnectedPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Keep existing hardcoded data for recent records
  const [recentRecords] = useState([
    { id: 1, patient: 'Jane Smith', type: 'Blood Test', date: '03/22/2025' },
    { id: 2, patient: 'Anne Doe', type: 'Blood Test', date: '03/22/2025' },
    { id: 3, patient: 'Maria Smith', type: 'Blood Test', date: '03/22/2025' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const navigate = useNavigate();

  // Fetch unread notifications
  const fetchUnreadNotifications = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch top 4 unread notifications
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error) {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Fetch doctor's connected patients from Supabase
  const fetchConnectedPatients = async () => {
  try {
    setLoading(true);
    setError(null);

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Use the doctor_connection_details view to get connected patients
    const { data, error: supabaseError } = await supabase
      .from('doctor_connection_details')
      .select('*')
      .eq('med_id', user.id) // Get current doctor's ID
      .eq('status', 'accepted'); // Only get accepted connections

    if (supabaseError) {
      throw supabaseError;
    }

    setConnectedPatients(data || []);

  } catch (err) {
    console.error('Error fetching connected patients:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  // Filter patients based on search
  useEffect(() => {
    const filtered = connectedPatients.filter(patient =>
      patient.patient_first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patient_last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patient_short_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPatients(filtered);
  }, [searchTerm, connectedPatients]);

  // Load data on component mount
  useEffect(() => {
    fetchConnectedPatients();
    fetchUnreadNotifications();
  }, []);

  // Helper function for notification icons
  const getNotificationIcon = (type) => {
    switch (type) {
      case "connection_request":
        return "👥";
      case "connection_accepted":
        return "✅";
      case "connection_rejected":
        return "❌";
      case "appointment_created":
      case "appointment_updated":
      case "appointment_cancelled":
        return "📅";
      case "announcement":
        return "📢";
      default:
        return "🔔";
    }
  };

  // Handle connection actions
  const handleRemoveConnection = async (connectionId) => {
    if (!confirm('Are you sure you want to remove this patient connection?')) {
      return;
    }

    try {
      const { error } = await supabase
        .rpc('remove_connection', { connection_id: connectionId });

      if (error) {
        throw error;
      }

      // Refresh data
      await fetchConnectedPatients();
    } catch (err) {
      console.error('Error removing connection:', err);
      alert('Failed to remove connection');
    }
  };

  // Helper functions
  const handleViewRecord = (recordId) => {
    console.log(`View record ${recordId}`);
    // TODO: Navigate to record detail or open modal
  };

  const handleViewAlert = (notificationId) => {
    console.log(`View notification ${notificationId}`);
    // TODO: Mark as read and navigate to notifications page
  };

  const handleViewPatient = (patientId) => {
    navigate(`/doctor/patients/${patientId}`);
  };

  const handleSharePatient = (patientId) => {
    console.log(`Share patient ${patientId}`);
    // TODO: Open share dialog or functionality
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-teal-600 mb-2">Doctor Dashboard</h1>
      </div>

      {/* Top Section - Recently Shared Records and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recently Shared Records */}
        <div className="bg-red-50 rounded-lg p-6 border border-red-100">
          <h2 className="text-xl font-semibold text-teal-600 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recently Shared Records
          </h2>
          <div className="space-y-3">
            {recentRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-red-200">
                <div className="flex-1">
                  <span className="text-sm text-gray-700">
                    Record for {record.patient} - {record.type} - {record.date}
                  </span>
                </div>
                <button
                  onClick={() => handleViewRecord(record.id)}
                  className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-red-50 rounded-lg p-6 border border-red-100">
          <h2 className="text-xl font-semibold text-teal-600 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Notifications
          </h2>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                      <span className="text-sm font-medium text-gray-800">{notification.title}</span>
                    </div>
                    <div className="text-sm text-gray-700">{notification.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewAlert(notification.id)}
                    className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/doctor/notifications')}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connected Patients Section */}
      <div className="bg-red-50 rounded-lg p-6 border border-red-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-teal-600 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connected Patients ({connectedPatients.length})
          </h2>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patient connections...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-600">
            <p>Error loading connections: {error}</p>
            <button
              onClick={fetchConnectedPatients}
              className="mt-2 px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Connected Patients Table */}
        {!loading && !error && (
          <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[110px_1.5fr_2fr_160px_210px] gap-x-4 p-4 bg-red-100 border-b border-red-200">
              <div className="font-medium text-red-700">Patient ID</div>
              <div className="font-medium text-red-700">Patient Name</div>
              <div className="font-medium text-red-700">Email</div>
              <div className="font-medium text-red-700 whitespace-nowrap">Connected Since</div>
              <div className="font-medium text-red-700 whitespace-nowrap pr-4">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-red-100">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="grid grid-cols-[110px_1.5fr_2fr_160px_210px] gap-x-4 p-4 hover:bg-red-25 transition-colors">
                  <div className="text-red-700 font-mono font-medium">{patient.patient_short_id?.substring(0, 4)}</div>
                  <div className="text-red-700 font-medium">{patient.patient_first_name} {patient.patient_last_name}</div>
                  <div className="text-gray-600 truncate">{patient.patient_email}</div>
                  <div className="text-gray-600 whitespace-nowrap">{formatDate(patient.created_at)}</div>
                  <div className="flex gap-2 whitespace-nowrap pr-4">
                    <button
                      onClick={() => handleViewPatient(patient.patient_id)}
                      className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => handleSharePatient(patient.patient_id)}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" />
                      Share
                    </button>
                    <button
                      onClick={() => handleRemoveConnection(patient.id)}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredPatients.length === 0 && !searchTerm && (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No connected patients yet.</p>
              </div>
            )}

            {/* Empty State for Search */}
            {filteredPatients.length === 0 && searchTerm && (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No patients found matching "{searchTerm}".</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;