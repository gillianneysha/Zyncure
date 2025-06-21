import React, { useState, useEffect } from 'react';
import { Plus, Menu, Grid3X3, List, MoreHorizontal, User, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../client';

const PatientsPage = () => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filterType, setFilterType] = useState('all'); // 'all', 'recent', 'active'
  const [filterHistory, setFilterHistory] = useState('all'); // 'all', 'recent', 'archived'
  const [currentUser, setCurrentUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);

  // ========================================
  // INITIALIZATION
  // ========================================
  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConnectedPatients();
    }
  }, [currentUser]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  // ========================================
  // DATA LOADING
  // ========================================
  const loadConnectedPatients = async () => {
  try {
    setIsLoading(true);
    
    // Get all accepted connections for this doctor
    const { data, error } = await supabase
      .from('doctor_connection_details')
      .select('*')
      .eq('status', 'accepted')  // Only get accepted connections
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform connection data into patient folder format
    // In loadConnectedPatients function, replace the patientFolders mapping with:
const patientFolders = await Promise.all((data || []).map(async connection => {
  const sharedFiles = await loadSharedFilesForPatient(connection.patient_id);
  
  return {
    id: connection.patient_id,
    name: `${connection.patient_first_name} ${connection.patient_last_name}`,
    email: connection.patient_email,
    connectionId: connection.id,
    connectedAt: connection.created_at,
    lastAccessed: connection.updated_at || connection.created_at,
    status: 'active',
    avatar: null,
    recordsCount: sharedFiles.length, // Show count of shared files
    sharedFiles: sharedFiles, // Store the actual shared files
    lastVisit: null,
  };
}));
    console.log('Loaded patient folders:', patientFolders); // Debug log
    setPatients(patientFolders);
    
  } catch (error) {
    console.error('Error loading connected patients:', error);
  } finally {
    setIsLoading(false);
  }
};
const loadSharedFilesForPatient = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from('file_shares')
      .select(`
        *,
        medical_files!file_shares_file_id_fkey (
          id,
          filename,
          file_size,
          file_type,
          upload_date,
          owner_id
        ),
        folders!file_shares_folder_id_fkey (
          id,
          name,
          created_at,
          owner_id
        )
      `)
      .eq('shared_with_id', currentUser.id)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) throw error;
    
    // Filter the results to only include files/folders owned by the specific patient
    const filteredData = (data || []).filter(share => {
      if (share.medical_files && share.medical_files.owner_id === patientId) {
        return true;
      }
      if (share.folders && share.folders.owner_id === patientId) {
        return true;
      }
      return false;
    });
    
    return filteredData;
  } catch (error) {
    console.error('Error loading shared files:', error);
    return [];
  }
};
// ========================================
// FIXED FILTERING SECTION - Remove status filter since all are active
// ========================================
const getFilteredPatients = () => {
  let filtered = [...patients];

  // Apply type filter
  if (filterType === 'recent') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    filtered = filtered.filter(patient => 
      new Date(patient.lastAccessed) >= oneWeekAgo
    );
  }
  // Remove the 'active' filter since all accepted connections are active

  // Apply history filter
  if (filterHistory === 'recent') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    filtered = filtered.filter(patient => 
      new Date(patient.connectedAt) >= oneMonthAgo
    );
  }

  return filtered;
};
  // ========================================
  // PATIENT FOLDER ACTIONS
  // ========================================
  const handlePatientClick = (patient) => {
console.log('Opening patient folder:', patient);
  console.log('Shared files:', patient.sharedFiles);
  };

  const handlePatientMenuAction = (patient, action) => {
    switch (action) {
      case 'view':
        handlePatientClick(patient);
        break;
      case 'records':
        console.log('View records for:', patient.name);
        // Navigate to patient records
        break;
      case 'history':
        console.log('View history for:', patient.name);
        // Navigate to patient history
        break;
      case 'disconnect':
        handleDisconnectPatient(patient);
        break;
      default:
        break;
    }
    setShowDropdown(null);
  };

  const handleDisconnectPatient = async (patient) => {
    if (!confirm(`Are you sure you want to disconnect from ${patient.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .rpc('remove_connection', {
          connection_id: patient.connectionId
        });

      if (error) throw error;

      await loadConnectedPatients();
      alert('Patient disconnected successfully');
      
    } catch (error) {
      console.error('Error disconnecting patient:', error);
      alert('Failed to disconnect patient');
    }
  };

  // ========================================
  // UI HELPER FUNCTIONS
  // ========================================
  const getPatientInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };


  // ========================================
  // RENDER PATIENT CARD
  // ========================================
  const renderPatientFolder = (patient) => (
  <div
    key={patient.id}
    className="relative group cursor-pointer"
    onClick={() => handlePatientClick(patient)}
  >
    {/* Folder Icon */}
    <div className="relative">
      {/* Folder back part */}
      <div className="w-20 h-16 bg-blue-500 rounded-t-lg transform rotate-1 absolute top-0 left-2"></div>
      
      {/* Main folder */}
      <div className="w-24 h-20 bg-blue-600 rounded-lg relative overflow-hidden group-hover:bg-blue-700 transition-colors duration-200">
        {/* Folder tab */}
        <div className="absolute -top-2 left-2 w-8 h-4 bg-blue-600 rounded-t-md group-hover:bg-blue-700 transition-colors duration-200"></div>
        
        {/* Patient initials inside folder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {getPatientInitials(patient.name)}
          </span>
        </div>
        
        {/* Status indicator */}
        <div className="absolute top-1 right-1">
          <div className={`w-2 h-2 rounded-full ${
            patient.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
          }`}></div>
        </div>
      </div>
      
      {/* Dropdown menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDropdown(showDropdown === patient.id ? null : patient.id);
        }}
        className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-600" />
      </button>
    </div>
    
    {/* Patient info below folder */}
    
<div className="mt-3 text-center">
  <h3 className="font-medium text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
    {patient.name}
  </h3>
  <p className="text-xs text-gray-500 mt-1">
    {patient.recordsCount} shared file{patient.recordsCount !== 1 ? 's' : ''}
  </p>
  <p className="text-xs text-gray-400 mt-1">
    Connected {formatDate(patient.connectedAt)}
  </p>
</div>

    {/* Dropdown menu */}
    {showDropdown === patient.id && (
      <>
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowDropdown(null)}
        />
        <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePatientMenuAction(patient, 'view');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-t-lg transition-colors"
          >
            <User className="w-4 h-4" />
            View Profile
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePatientMenuAction(patient, 'records');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <List className="w-4 h-4" />
            Medical Records
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePatientMenuAction(patient, 'history');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Visit History
          </button>
          <hr className="my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePatientMenuAction(patient, 'disconnect');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-b-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </>
    )}
  </div>
);


  // ========================================
  // RENDER COMPONENT
  // ========================================
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-teal-600">Patients</h1>
          <p className="text-gray-600 mt-1">
            {patients.length} connected patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-teal-100 text-teal-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-teal-100 text-teal-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
          
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Type:</label>
         <select
  value={filterType}
  onChange={(e) => setFilterType(e.target.value)}
  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
>
  <option value="all">All Patients</option>
  <option value="recent">Recently Accessed</option>
</select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">History:</label>
          <select
            value={filterHistory}
            onChange={(e) => setFilterHistory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Time</option>
            <option value="recent">Last Month</option>
          </select>
        </div>
      </div>

      {/* Patient Grid/List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="text-gray-500 mt-2">Loading patients...</p>
        </div>
      ) : getFilteredPatients().length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6"
          : "space-y-4"
        }>
          {getFilteredPatients().map(renderPatientFolder)}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
          <p className="text-gray-500 mb-6">
            {patients.length === 0 
              ? "Connect with patients to see them here"
              : "No patients match your current filters"
            }
          </p>
          {patients.length === 0 && (
            <button 
              onClick={() => {/* Navigate to connections page */}}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Manage Connections
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientsPage;