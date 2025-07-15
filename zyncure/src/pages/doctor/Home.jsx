import React, { useState, useEffect } from 'react';
import { Search, Eye, Share2, Bell, FileText, Users } from 'lucide-react';
import { supabase } from '../../client';
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [connectedPatients, setConnectedPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientMap, setPatientMap] = useState({});
  const [recentRecords, setRecentRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const navigate = useNavigate();

  const fetchUnreadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(4);
      if (!error) setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchConnectedPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');
      const { data, error: supabaseError } = await supabase
        .from('doctor_connection_details')
        .select('*')
        .eq('med_id', user.id)
        .eq('status', 'accepted');
      if (supabaseError) throw supabaseError;
      setConnectedPatients(data || []);
    } catch (err) {
      console.error('Error fetching connected patients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // limit displayed records to 4
  const fetchRecentRecords = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');
      const now = new Date().toISOString();
      const { data: shares, error: sharesError } = await supabase
        .from('file_shares')
        .select(`
          id,
          file_id,
          owner_id,
          shared_with_id,
          created_at,
          expires_at,
          is_active,
          medical_files!file_shares_file_id_fkey (
            id, name
          )
        `)
        .eq('shared_with_id', user.id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(4); // Limit to 4 records only

      if (sharesError) throw sharesError;
      const ownerIds = Array.from(new Set((shares || []).map(share => share.owner_id).filter(Boolean)));

      let patientMap = {};
      if (ownerIds.length > 0) {
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('patient_id, first_name, last_name')
          .in('patient_id', ownerIds);
        if (!patientsError && patientsData) {
          for (const p of patientsData) {
            patientMap[p.patient_id] =
              ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || p.patient_id;
          }
        }
      }
      setPatientMap(patientMap);

      const mapped = (shares || []).map(share => ({
        id: share.medical_files?.id ?? share.file_id,
        fileId: share.medical_files?.id ?? share.file_id,
        patientId: share.owner_id,
        patientName: patientMap[share.owner_id] || share.owner_id,
        name: share.medical_files?.name || "Record",
        date: share.created_at
      }));

      setRecentRecords(mapped);
    } catch (err) {
      console.error('Error fetching recent records:', err);
      setRecentRecords([]);
    }
  };

  useEffect(() => {
    const filtered = connectedPatients.filter(patient =>
      patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patient_short_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPatients(filtered);
  }, [searchTerm, connectedPatients]);

  useEffect(() => {
    fetchConnectedPatients();
    fetchUnreadNotifications();
    fetchRecentRecords();
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "connection_request": return "👥";
      case "connection_accepted": return "✅";
      case "connection_rejected": return "❌";
      case "appointment_created":
      case "appointment_updated":
      case "appointment_cancelled": return "📅";
      case "announcement": return "📢";
      default: return "🔔";
    }
  };

  const handleRemoveConnection = async (connectionId) => {
    if (!confirm('Are you sure you want to remove this patient connection?')) return;
    try {
      const { error } = await supabase.rpc('remove_connection', { connection_id: connectionId });
      if (error) throw error;
      await fetchConnectedPatients();
    } catch (err) {
      console.error('Error removing connection:', err);
      alert('Failed to remove connection');
    }
  };

  // This ensures navigation passes both patientId and fileId for preview
  const handleViewRecord = (fileId, patientId) => {
    navigate(`/doctor/reports?fileId=${fileId}&patientId=${patientId}`);
  };

  const handleViewAlert = (notificationId) => {
    console.log(`View notification ${notificationId}`);
  };

  const handleViewPatient = (patientId) => {
    navigate(`/doctor/patients/${patientId}`);
  };

  const handleSharePatient = (patientId) => {
    console.log(`Share patient ${patientId}`);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-teal-600 mb-2">Doctor Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recently Shared Records */}
        <div className="bg-red-50 rounded-lg p-6 border border-red-100">
          <h2 className="text-xl font-semibold text-teal-600 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recently Shared Records
          </h2>
          <div className="space-y-3">
            {recentRecords.length === 0 ? (
              <div className="text-gray-400">No records have been shared recently.</div>
            ) : (
              recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-red-200">
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      Record for {record.patientName} - {formatDate(record.date)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleViewRecord(record.fileId, record.patientId)}
                    className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </div>
              ))
            )}
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
      <div className="bg-red-50 rounded-lg p-6 border border-red-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-teal-600 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connected Patients ({connectedPatients.length})
          </h2>
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
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading patient connections...</p>
          </div>
        )}
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
        {!loading && !error && (
          <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
            <div className="grid grid-cols-[110px_1.5fr_2fr_160px_210px] gap-x-4 p-4 bg-red-100 border-b border-red-200">
              <div className="font-medium text-red-700">Patient ID</div>
              <div className="font-medium text-red-700">Patient Name</div>
              <div className="font-medium text-red-700">Email</div>
              <div className="font-medium text-red-700 whitespace-nowrap">Connected Since</div>
              <div className="font-medium text-red-700 whitespace-nowrap pr-4">Actions</div>
            </div>
            <div className="divide-y divide-red-100">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="grid grid-cols-[110px_1.5fr_2fr_160px_210px] gap-x-4 p-4 hover:bg-red-25 transition-colors">
                  <div className="text-red-700 font-mono font-medium">{patient.patient_short_id?.substring(0, 4)}</div>
                  <div className="text-red-700 font-medium">{patient.first_name} {patient.last_name}</div>
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
            {filteredPatients.length === 0 && !searchTerm && (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No connected patients yet.</p>
              </div>
            )}
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