import React, { useState, useEffect } from 'react';
import { Search, MoreHorizontal, Plus, UserPlus, Check, UserMinus, Trash2 } from 'lucide-react';

// Mock Supabase client for demonstration
const mockSupabase = {
  from: () => ({
    select: () => ({
      ilike: (column, pattern) => ({
        limit: () => Promise.resolve({
          data: [
            {
              med_id: 'abcd-1234-5678-90ef',
              first_name: 'Dr. John',
              last_name: 'Yappy',
              specialty: 'Cardiologist',
              hospital: 'Metro General'
            },
            {
              med_id: 'abcd-9876-5432-10ab',
              first_name: 'Dr. Sarah',
              last_name: 'Via',
              specialty: 'Neurologist',
              hospital: 'City Medical'
            },
            {
              med_id: 'abcd-5555-7777-99cc',
              first_name: 'Dr. Michael',
              last_name: 'Manny',
              specialty: 'Pediatrician',
              hospital: 'Children\'s Hospital'
            }
          ].filter(doc => doc.med_id.toLowerCase().startsWith(pattern.replace('%', '').toLowerCase())),
          error: null
        })
      })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) })
  })
};

const ConnectionsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [connections, setConnections] = useState([
    {
      id: 1,
      med_id: 'doc1-1234-5678-90ab',
      name: 'Doc Yappy',
      specialty: 'Cardiologist',
      hospital: 'Metro General'
    },
    {
      id: 2,
      med_id: 'doc2-5678-9012-34cd',
      name: 'Doc Via',
      specialty: 'Neurologist', 
      hospital: 'City Medical'
    },
    {
      id: 3,
      med_id: 'doc3-9012-3456-78ef',
      name: 'Doc Manny',
      specialty: 'Pediatrician',
      hospital: 'Children\'s Hospital'
    }
  ]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedConnections, setAddedConnections] = useState(new Set());
  const [showDropdown, setShowDropdown] = useState(null);

  // Search for doctors by first 4 characters of UUID
  const searchDoctors = async (term) => {
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // In real implementation, replace with actual Supabase client
      const { data, error } = await mockSupabase
        .from('medicalprofessionals')
        .select('med_id, first_name, last_name, specialty, hospital')
        .ilike('med_id', `${term}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching doctors:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Remove doctor from connections
  const removeConnection = async (connectionId, doctorId) => {
    try {
      // In real implementation, delete from connections table
      await mockSupabase.from('connections').delete().eq('id', connectionId);

      // Update local state
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      setAddedConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(doctorId);
        return newSet;
      });
    } catch (error) {
      console.error('Error removing connection:', error);
    }
  };
  const addConnection = async (doctor) => {
    try {
      // In real implementation, you'd insert into a connections table
      const connectionData = {
        user_id: 'current-user-id', // Get from auth context
        doctor_id: doctor.med_id,
        created_at: new Date().toISOString()
      };

      // Mock API call
      await mockSupabase.from('connections').insert(connectionData);

      // Update local state
      const newConnection = {
        id: Date.now(),
        med_id: doctor.med_id,
        name: `${doctor.first_name} ${doctor.last_name}`,
        specialty: doctor.specialty,
        hospital: doctor.hospital
      };

      setConnections(prev => [...prev, newConnection]);
      setAddedConnections(prev => new Set([...prev, doctor.med_id]));
      
      // Remove from search results
      setSearchResults(prev => prev.filter(d => d.med_id !== doctor.med_id));
    } catch (error) {
      console.error('Error adding connection:', error);
    }
  };

  // Handle search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchDoctors(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <div className="min-h-*bg-gradient-to-br to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-myHeader">Connections</h1>
          <MoreHorizontal className="w-6 h-6 text-gray-400" />
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Doctor UUID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          {/* Search Results */}
          {searchTerm && (
            <div className="mt-4">
              {isSearching ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                  <p className="text-gray-500 mt-2">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Found {searchResults.length} doctors:</p>
                  {searchResults.map((doctor) => (
                    <div key={doctor.med_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {doctor.first_name} {doctor.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                        <p className="text-xs text-gray-500">{doctor.hospital}</p>
                        <p className="text-xs text-gray-400 font-mono">ID: {doctor.med_id.substring(0, 8)}...</p>
                      </div>
                      <button
                        onClick={() => addConnection(doctor)}
                        disabled={addedConnections.has(doctor.med_id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          addedConnections.has(doctor.med_id)
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        {addedConnections.has(doctor.med_id) ? (
                          <>
                            <Check className="w-4 h-4" />
                            Added
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchTerm.length >= 3 ? (
                <p className="text-gray-500 text-center py-4">No doctors found matching "{searchTerm}"</p>
              ) : (
                <p className="text-gray-500 text-center py-4">Enter at least 3 characters to search</p>
              )}
            </div>
          )}
        </div>

        {/* Connections List */}
        <div className="space-y-3">
          {connections.map((connection) => (
            <div key={connection.id} className="bg-white rounded-xl shadow-sm p-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{connection.name}</h3>
                  <p className="text-sm text-gray-600">{connection.specialty}</p>
                  <p className="text-xs text-gray-500">{connection.hospital}</p>
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
                            removeConnection(connection.id, connection.med_id);
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
          ))}
        </div>

        {connections.length === 0 && !searchTerm && (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No connections yet. Search for doctors to add them.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsPage;