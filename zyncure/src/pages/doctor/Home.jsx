import React, { useState, useEffect } from 'react';
import { Search, Eye, Share2, Bell, Calendar, FileText } from 'lucide-react';

const Dashboard = () => {
  
  const [recentRecords] = useState([
    { id: 1, patient: 'Jane Smith', type: 'Blood Test', date: '03/22/2025' },
    { id: 2, patient: 'Anne Doe', type: 'Blood Test', date: '03/22/2025' },
    { id: 3, patient: 'Maria Smith', type: 'Blood Test', date: '03/22/2025' }
  ]);

  const [alerts] = useState([
    { id: 1, message: 'Upcoming appointment with Jane Smith', time: 'Today 2:00PM' },
    { id: 2, message: 'Upcoming appointment with Jane Smith', time: 'Today 3:30PM' },
    { id: 3, message: 'Upcoming appointment with Jane Smith', time: 'Today 5:00PM' }
  ]);

  const [patients] = useState([
    { id: 1, name: 'Maria Santos', lastVisit: '03/25/2025', status: 'Active' },
    { id: 2, name: 'Maria Santos', lastVisit: '03/25/2025', status: 'Active' },
    { id: 3, name: 'Maria Santos', lastVisit: '03/25/2025', status: 'Active' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState(patients);

  // Filter patients based on search - can be replaced with backend search
  useEffect(() => {
    const filtered = patients.filter(patient =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  // Placeholder functions for backend integration
  const handleViewRecord = (recordId) => {
    console.log(`View record ${recordId}`);
    // TODO: Navigate to record detail or open modal
  };

  const handleViewAlert = (alertId) => {
    console.log(`View alert ${alertId}`);
    // TODO: Handle alert action
  };

  const handleViewPatient = (patientId) => {
    console.log(`View patient ${patientId}`);
    // TODO: Navigate to patient detail
  };

  const handleSharePatient = (patientId) => {
    console.log(`Share patient ${patientId}`);
    // TODO: Open share dialog or functionality
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-teal-600 mb-2">Dashboard</h1>
      </div>

      {/* Top Section - Recently Shared Records and Alerts */}
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

        {/* Alerts */}
        <div className="bg-red-50 rounded-lg p-6 border border-red-100">
          <h2 className="text-xl font-semibold text-teal-600 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alerts
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-red-200">
                <div className="flex-1">
                  <div className="text-sm text-gray-700">{alert.message}</div>
                  <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
                </div>
                <button
                  onClick={() => handleViewAlert(alert.id)}
                  className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Patient List Section */}
      <div className="bg-red-50 rounded-lg p-6 border border-red-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-teal-600 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Patient List
          </h2>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Patient Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-red-100 border-b border-red-200">
            <div className="font-medium text-red-700">Patient Name</div>
            <div className="font-medium text-red-700">Last Visit</div>
            <div className="font-medium text-red-700">Status</div>
            <div className="font-medium text-red-700">Action</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-red-100">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="grid grid-cols-4 gap-4 p-4 hover:bg-red-25 transition-colors">
                <div className="text-red-700 font-medium">{patient.name}</div>
                <div className="text-gray-600">{patient.lastVisit}</div>
                <div className="text-red-600 font-medium">{patient.status}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewPatient(patient.id)}
                    className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={() => handleSharePatient(patient.id)}
                    className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition-colors flex items-center gap-1"
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredPatients.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No patients found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Loading/Error States - Ready for backend integration */}
      {/* 
      Example usage:
      {loading && <div className="text-center py-8">Loading...</div>}
      {error && <div className="text-center py-8 text-red-600">Error: {error}</div>}
      */}
    </div>
  );
};

export default Dashboard;