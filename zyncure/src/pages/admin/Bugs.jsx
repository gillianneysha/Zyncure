import React, { useState, useEffect } from 'react';
import { Search, Eye, Bug, Trash2, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../../client';

export default function AdminBugs() {
  const [bugs, setBugs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBug, setSelectedBug] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

  // Fetch admins from the admin table
  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (error) throw error;

      setAdmins(data || []);
    } catch (err) {
      console.error('Error fetching admins:', err);
      
    }
  };

  
  const fetchBugs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBugs(data || []);
    } catch (err) {
      console.error('Error fetching bug reports:', err);
      setError('Failed to load bug reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchBugs();
    fetchAdmins();
  }, []);

  
  const filteredBugs = bugs.filter(bug =>
    bug.reporter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bug.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bug.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBugs.length / showEntries);
  const startIndex = (currentPage - 1) * showEntries;
  const currentBugs = filteredBugs.slice(startIndex, startIndex + showEntries);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-red-500 hover:bg-red-600';
      case 'in progress': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'fixed': return 'bg-green-500 hover:bg-green-600';
      case 'closed': return 'bg-gray-500 hover:bg-gray-600';
      case 'wont fix': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'text-red-600 font-bold';
      case 'high': return 'text-orange-600 font-semibold';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const handleViewBug = (bug) => {
    setSelectedBug(bug);
    setShowModal(true);
  };

  const updateBugStatus = async (bugId, newStatus) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('bug_reports')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bugId);

      if (error) throw error;

      
      setBugs(prev => prev.map(bug =>
        bug.id === bugId ? { ...bug, status: newStatus, updated_at: new Date().toISOString() } : bug
      ));

     
      if (selectedBug && selectedBug.id === bugId) {
        setSelectedBug(prev => ({ ...prev, status: newStatus }));
      }

    } catch (err) {
      console.error('Error updating bug status:', err);
      setError('Failed to update bug status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const updateBugPriority = async (bugId, newPriority) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('bug_reports')
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', bugId);

      if (error) throw error;

      
      setBugs(prev => prev.map(bug =>
        bug.id === bugId ? { ...bug, priority: newPriority, updated_at: new Date().toISOString() } : bug
      ));

      
      if (selectedBug && selectedBug.id === bugId) {
        setSelectedBug(prev => ({ ...prev, priority: newPriority }));
      }

    } catch (err) {
      console.error('Error updating bug priority:', err);
      setError('Failed to update bug priority. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const updateAssignedAdmin = async (bugId, adminId) => {
    try {
      setUpdating(true);

      
      const admin = admins.find(a => a.id.toString() === adminId.toString());
      const adminName = admin ? admin.name : null;

      const { error } = await supabase
        .from('bug_reports')
        .update({
          assigned_admin: adminName,
          assigned_admin_id: adminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', bugId);

      if (error) throw error;

     
      setBugs(prev => prev.map(bug =>
        bug.id === bugId ? {
          ...bug,
          assigned_admin: adminName,
          assigned_admin_id: adminId,
          updated_at: new Date().toISOString()
        } : bug
      ));

      
      if (selectedBug && selectedBug.id === bugId) {
        setSelectedBug(prev => ({
          ...prev,
          assigned_admin: adminName,
          assigned_admin_id: adminId
        }));
      }

    } catch (err) {
      console.error('Error updating assigned admin:', err);
      setError('Failed to update assigned admin. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const deleteBug = async (bugId) => {
    if (!window.confirm('Are you sure you want to delete this bug report?')) {
      return;
    }

    try {
      setUpdating(true);

      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', bugId);

      if (error) throw error;

     
      setBugs(prev => prev.filter(bug => bug.id !== bugId));

      
      if (selectedBug && selectedBug.id === bugId) {
        setShowModal(false);
        setSelectedBug(null);
      }

    } catch (err) {
      console.error('Error deleting bug:', err);
      setError('Failed to delete bug report. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg text-gray-600">Loading bug reports...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Bug className="text-red-600" />
            Recent Bug Reports & Fixes
          </h1>
          <button
            onClick={() => {
              fetchBugs();
              fetchAdmins();
            }}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Show</span>
              <select
                value={showEntries}
                onChange={(e) => setShowEntries(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-gray-700">entries</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search bug reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-500">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Reporter/Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 hidden sm:table-cell">
                    Date Logged
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 hidden md:table-cell">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 hidden lg:table-cell">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentBugs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {filteredBugs.length === 0 && searchTerm ?
                        'No bug reports match your search.' :
                        'No bug reports found.'}
                    </td>
                  </tr>
                ) : (
                  currentBugs.map((bug) => (
                    <tr key={bug.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        #{bug.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {bug.reporter_name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {bug.title || "No title"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">
                        <span className="truncate block">
                          {formatDate(bug.date_logged)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(bug.status)}`}>
                          {(bug.status || "Open").slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <select
                          value={bug.priority || "Medium"}
                          onChange={(e) => updateBugPriority(bug.id, e.target.value)}
                          disabled={updating}
                          className={`text-sm font-medium border-none bg-transparent cursor-pointer hover:underline w-full disabled:opacity-50 ${getPriorityColor(bug.priority)}`}
                        >
                          {priorityOptions.map((priority) => (
                            <option key={priority} value={priority} className="text-gray-900">
                              {priority}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <select
                          value={bug.assigned_admin || "Unassigned"}
                          onChange={(e) => updateAssignedAdmin(bug.id, e.target.value === "Unassigned" ? "" : e.target.value)}
                          disabled={updating}
                          className="text-sm text-gray-900 border-none bg-transparent cursor-pointer hover:underline w-full disabled:opacity-50"
                        >
                          <option value="Unassigned">Unassigned</option>
                          <option value="Andrei">Andrei</option>
                          <option value="Ysha">Ysha</option>
                          <option value="Ambross">Ambross</option>
                          <option value="Ludrein">Ludrein</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewBug(bug)}
                            className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {bug.status !== "Fixed" && bug.status !== "Closed" && (
                            <button
                              onClick={() => updateBugStatus(bug.id, "Fixed")}
                              disabled={updating}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                              title="Mark Fixed"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => deleteBug(bug.id)}
                            disabled={updating}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredBugs.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + showEntries, filteredBugs.length)} of {filteredBugs.length} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm border rounded-lg transition-colors ${currentPage === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for viewing bug details */}
      {showModal && selectedBug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Bug Report Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Bug ID</label>
                  <p className="text-lg font-semibold text-gray-900">#{selectedBug.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(selectedBug.status)}`}>
                    {selectedBug.status || 'Open'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Reporter Name</label>
                  <p className="text-gray-900">{selectedBug.reporter_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedBug.reporter_email || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <p className="text-gray-900 font-medium">{selectedBug.title || 'No title provided'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-gray-900">{selectedBug.description || 'No description provided'}</p>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Browser Info</label>
                  <p className="text-gray-900">{selectedBug.browser_info || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Device Info</label>
                  <p className="text-gray-900">{selectedBug.device_info || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <div className="mt-1">
                    <select
                      value={selectedBug.priority || 'Medium'}
                      onChange={(e) => updateBugPriority(selectedBug.id, e.target.value)}
                      disabled={updating}
                      className={`font-medium border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 ${getPriorityColor(selectedBug.priority)} disabled:opacity-50`}
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority} value={priority} className="text-gray-900">
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Assigned Admin</label>
                  <div className="mt-1">
                    <select
                      value={selectedBug.assigned_admin_id || ''}
                      onChange={(e) => updateAssignedAdmin(selectedBug.id, e.target.value)}
                      disabled={updating}
                      className="text-gray-900 border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      <option value="Andrei">Andrei</option>
                      <option value="Ysha">Ysha</option>
                      <option value="Ambross">Ambross</option>
                      <option value="Ludrein">Ludrein</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date Logged</label>
                  <p className="text-gray-900">{formatDate(selectedBug.date_logged)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-gray-900">{formatDateTime(selectedBug.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-gray-900">{formatDateTime(selectedBug.updated_at)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => updateBugStatus(selectedBug.id, 'In Progress')}
                disabled={updating}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Mark In Progress
              </button>
              <button
                onClick={() => updateBugStatus(selectedBug.id, 'Fixed')}
                disabled={updating}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Mark Fixed
              </button>
              <button
                onClick={() => updateBugStatus(selectedBug.id, 'Wont Fix')}
                disabled={updating}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Won't Fix
              </button>
              <button
                onClick={() => deleteBug(selectedBug.id)}
                disabled={updating}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Delete Bug
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}