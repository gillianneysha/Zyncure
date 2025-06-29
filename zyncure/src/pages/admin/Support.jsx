import React, { useState, useEffect } from 'react';
import { Search, Eye, MessageSquare, Trash2, Filter, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../client'; 


export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Priority options
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];
  
  // Admin options
  const adminOptions = ['Unassigned'];

  // Fetch tickets from Supabase
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTickets(data || []);
    } catch {
      setError('Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  };

  // Update ticket status in Supabase
  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus, updated_at: data.updated_at } : ticket
      ));

      // Close modal if updating the selected ticket
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus, updated_at: data.updated_at });
      }

      // Show success message (optional)
      console.log('Ticket updated successfully');
    } catch {
      setError('Failed to update ticket.');
    }
  };

  // Update ticket priority
  const updateTicketPriority = async (ticketId, newPriority) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, priority: newPriority, updated_at: data.updated_at } : ticket
      ));

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, priority: newPriority, updated_at: data.updated_at });
      }
    } catch {
      setError('Failed to update priority.');
    }
  };

  // Assign admin to ticket
  const assignAdminToTicket = async (ticketId, adminName) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_admin: adminName === 'Unassigned' ? null : adminName,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, assigned_admin: adminName === 'Unassigned' ? null : adminName, updated_at: data.updated_at } : ticket
      ));

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, assigned_admin: adminName === 'Unassigned' ? null : adminName, updated_at: data.updated_at });
      }
    } catch {
      setError('Failed to assign admin.');
    }
  };

  // Delete ticket (optional)
  const deleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
      setShowModal(false);
    } catch {
      setError('Failed to delete ticket.');
    }
  };

  // Subscribe to real-time changes (optional)
  useEffect(() => {
    const channel = supabase
      .channel('support_tickets_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_tickets' 
        }, 
        (payload) => {
          console.log('Real-time change received:', payload);
          // Refresh tickets when changes occur
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch tickets on component mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Filter tickets based on search
  const filteredTickets = tickets.filter(ticket =>
    ticket.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.issue_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTickets.length / showEntries);
  const startIndex = (currentPage - 1) * showEntries;
  const currentTickets = filteredTickets.slice(startIndex, startIndex + showEntries);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-red-500 hover:bg-red-600';
      case 'in progress': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'resolved': return 'bg-green-500 hover:bg-green-600';
      case 'closed': return 'bg-gray-500 hover:bg-gray-600';
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

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch  {
      return 'Invalid Date';
    }
  };

  // Get ticket statistics
  const getTicketStats = () => {
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status?.toLowerCase() === 'open').length,
      inProgress: tickets.filter(t => t.status?.toLowerCase() === 'in progress').length,
      resolved: tickets.filter(t => t.status?.toLowerCase() === 'resolved').length,
      closed: tickets.filter(t => t.status?.toLowerCase() === 'closed').length,
      critical: tickets.filter(t => t.priority?.toLowerCase() === 'critical').length,
      high: tickets.filter(t => t.priority?.toLowerCase() === 'high').length,
    };
    return stats;
  };

  const stats = getTicketStats();

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading support tickets...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Tickets</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchTickets}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <MessageSquare className="text-blue-600" />
            Support Tickets ({stats.total})
          </h1>
          <button
            onClick={fetchTickets}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
        </div>

        
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Show</span>
              <select 
                value={showEntries} 
                onChange={(e) => {
                  setShowEntries(Number(e.target.value));
                  setCurrentPage(1);
                }}
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
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ticket ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Issue Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Priority</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Assigned Admin</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {filteredTickets.length === 0 && searchTerm 
                      ? 'No tickets found matching your search.' 
                      : 'No support tickets available.'}
                  </td>
                </tr>
              ) : (
                currentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">#{ticket.id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{ticket.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{ticket.issue_category || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={ticket.priority || 'Medium'}
                        onChange={(e) => updateTicketPriority(ticket.id, e.target.value)}
                        className={`text-sm font-medium border-none bg-transparent cursor-pointer hover:underline ${getPriorityColor(ticket.priority)}`}
                      >
                        {priorityOptions.map(priority => (
                          <option key={priority} value={priority} className="text-gray-900">
                            {priority}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={ticket.assigned_admin || 'Unassigned'}
                        onChange={(e) => assignAdminToTicket(ticket.id, e.target.value)}
                        className="text-sm text-gray-900 border-none bg-transparent cursor-pointer hover:underline"
                      >
                        {adminOptions.map(admin => (
                          <option key={admin} value={admin} className="text-gray-900">
                            {admin}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button 
                          onClick={() => handleViewTicket(ticket)}
                          className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        {ticket.status !== 'Closed' && (
                          <>
                            <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                              Respond
                            </button>
                            <button 
                              onClick={() => updateTicketStatus(ticket.id, 'Closed')}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              Close
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + showEntries, filteredTickets.length)} of {filteredTickets.length} entries
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
                  className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                    currentPage === page
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

      {/* Modal for viewing ticket details */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Ticket Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Ticket ID</label>
                  <p className="text-lg font-semibold text-gray-900">#{selectedTicket.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Customer Name</label>
                <p className="text-gray-900">{selectedTicket.name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedTicket.email || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Issue Category</label>
                <p className="text-gray-900">{selectedTicket.issue_category || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Subject</label>
                <p className="text-gray-900">{selectedTicket.subject || 'N/A'}</p>
              </div>

              {selectedTicket.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <p className={`font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority || 'Medium'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned Admin</label>
                <p className="text-gray-900">{selectedTicket.assigned_admin || 'Unassigned'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Created Date</label>
                  <p className="text-gray-900">{formatDate(selectedTicket.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-gray-900">{formatDate(selectedTicket.updated_at)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-8 flex-wrap">
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Respond
              </button>
              {selectedTicket.status !== 'In Progress' && (
                <button 
                  onClick={() => updateTicketStatus(selectedTicket.id, 'In Progress')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  In Progress
                </button>
              )}
              {selectedTicket.status !== 'Resolved' && (
                <button 
                  onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Resolve
                </button>
              )}
              {selectedTicket.assigned_admin !== 'Admin ' && (
                <button 
                  onClick={() => assignAdminToTicket(selectedTicket.id, 'Admin ')}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Assign to Me
                </button>
              )}
              <button 
                onClick={() => deleteTicket(selectedTicket.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}