import React, { useState, useEffect } from "react";
import {
  Search,
  Eye,
  MessageSquare,
  Trash2,
  Filter,
  AlertCircle,
  ChevronDown,
  Send,
} from "lucide-react";
import { supabase } from "../../client";

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseTicket, setResponseTicket] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Priority options
  const priorityOptions = ["Low", "Medium", "High", "Critical"];

  // Admin options
  const adminOptions = ["Unassigned", "Andrei", "Ysha", "Ambross", "Ludrein"];

  // Fetch tickets from Supabase
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setTickets(data || []);
    } catch {
      setError("Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced user lookup function
  const findUserByTicket = async (ticket) => {
    let userId = ticket.user_id;
    // let userType = null;

    // If user_id is already in the ticket, return it
    if (userId) {
      return { userId, userType: "direct" };
    }

    // If no user_id, try to find user by email
    if (ticket.email) {
      console.log("Searching for user by email:", ticket.email);

      // Try patients table first
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("patient_id")
        .eq("email", ticket.email)
        .single();

      if (!patientError && patientData) {
        console.log("Found patient:", patientData.patient_id);
        return { userId: patientData.patient_id, userType: "patient" };
      }

      // Try medical professionals table
      const { data: mpData, error: mpError } = await supabase
        .from("medicalprofessionals")
        .select("med_id")
        .eq("email", ticket.email)
        .single();

      if (!mpError && mpData) {
        console.log("Found medical professional:", mpData.med_id);
        return { userId: mpData.med_id, userType: "medical_professional" };
      }

      // Try auth.users table as fallback
      // Try auth.users table as fallback
      const { data: userData } = await supabase.auth.admin.listUsers();

      const foundUser = userData?.users?.find(
        (user) => user.email === ticket.email
      );
      if (foundUser) {
        console.log("Found user in auth.users:", foundUser.id);
        return { userId: foundUser.id, userType: "auth_user" };
      }
    }

    return { userId: null, userType: null };
  };

  // Enhanced notification creation function
  const createNotificationForTicket = async (ticket, responseMessage) => {
    try {
      const { userId, userType } = await findUserByTicket(ticket);

      if (!userId) {
        console.log("No user found for ticket:", ticket.id);
        return {
          success: false,
          message:
            "Could not find user to notify. Please contact them directly via email.",
        };
      }

      console.log("Creating notification for user:", userId, "type:", userType);

      // Enhanced notification message
      const notificationMessage = `We've responded to your support ticket "${ticket.subject || "Support Request"
        }". 

Admin Response: ${responseMessage}

If you have any follow-up questions, please don't hesitate to reach out to us again.`;

      const { data: notificationData, error: notificationError } =
        await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            title: "Support Ticket Response",
            message: notificationMessage,
            type: "support_response",
            metadata: {
              ticket_id: ticket.id,
              response_message: responseMessage,
              subject: ticket.subject || "Support Request",
              ticket_category: ticket.issue_category,
              responded_at: new Date().toISOString(),
              admin_response: true,
              user_type: userType,
            },
            is_read: false,
          })
          .select();

      if (notificationError) {
        console.error("Notification error:", notificationError);
        return {
          success: false,
          message: "Failed to create notification. Please try again.",
        };
      }

      console.log("Notification created successfully:", notificationData);
      return {
        success: true,
        message: "Response sent and user notified successfully!",
      };
    } catch (error) {
      console.error("Error in notification creation:", error);
      return {
        success: false,
        message: "Error creating notification. Please try again.",
      };
    }
  };

  // Update ticket status in Supabase
  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, status: newStatus, updated_at: data.updated_at }
            : ticket
        )
      );

      // Close modal if updating the selected ticket
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: newStatus,
          updated_at: data.updated_at,
        });
      }

      setSuccessMessage("Ticket status updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to update ticket.");
    }
  };

  // Update ticket priority
  const updateTicketPriority = async (ticketId, newPriority) => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .update({
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, priority: newPriority, updated_at: data.updated_at }
            : ticket
        )
      );

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          priority: newPriority,
          updated_at: data.updated_at,
        });
      }
    } catch {
      setError("Failed to update priority.");
    }
  };

  // Assign admin to ticket
  const assignAdminToTicket = async (ticketId, adminName) => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .update({
          assigned_admin: adminName === "Unassigned" ? null : adminName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId
            ? {
              ...ticket,
              assigned_admin: adminName === "Unassigned" ? null : adminName,
              updated_at: data.updated_at,
            }
            : ticket
        )
      );

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          assigned_admin: adminName === "Unassigned" ? null : adminName,
          updated_at: data.updated_at,
        });
      }
    } catch {
      setError("Failed to assign admin.");
    }
  };

  // Delete ticket
  const deleteTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("support_tickets")
        .delete()
        .eq("id", ticketId);

      if (error) {
        throw error;
      }

      // Update local state
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      setShowModal(false);
      setSuccessMessage("Ticket deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setError("Failed to delete ticket.");
    }
  };

  // Enhanced send response function
  // Enhanced send response function
  const sendResponse = async () => {
    if (!responseMessage.trim()) {
      alert("Please enter a response message.");
      return;
    }

    try {
      setSendingResponse(true);
      setError(null);

      // Update ticket status to "In Progress" if it's currently "Open"
      const newStatus =
        responseTicket.status?.toLowerCase() === "open"
          ? "In Progress"
          : responseTicket.status;

      // Update the ticket status and timestamp (remove admin_response and responded_at)
      const { data, error } = await supabase
        .from("support_tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", responseTicket.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create notification for the user
      const notificationResult = await createNotificationForTicket(
        responseTicket,
        responseMessage
      );

      // Update local state (remove admin_response from state update)
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === responseTicket.id
            ? { ...ticket, status: newStatus, updated_at: data.updated_at }
            : ticket
        )
      );

      // Update selected ticket if it's the same one
      if (selectedTicket && selectedTicket.id === responseTicket.id) {
        setSelectedTicket({
          ...selectedTicket,
          status: newStatus,
          updated_at: data.updated_at,
        });
      }

      // Close response modal
      setShowResponseModal(false);
      setResponseTicket(null);
      setResponseMessage("");

      // Show success message
      setSuccessMessage(notificationResult.message);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Error sending response:", error);
      setError("Failed to send response. Please try again.");
    } finally {
      setSendingResponse(false);
    }
  };

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("support_tickets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        (payload) => {
          console.log("Real-time change received:", payload);
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
  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.issue_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTickets.length / showEntries);
  const startIndex = (currentPage - 1) * showEntries;
  const currentTickets = filteredTickets.slice(
    startIndex,
    startIndex + showEntries
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-red-500 hover:bg-red-600";
      case "in progress":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "resolved":
        return "bg-green-500 hover:bg-green-600";
      case "closed":
        return "bg-gray-500 hover:bg-gray-600";
      default:
        return "bg-blue-500 hover:bg-blue-600";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "text-red-600 font-bold";
      case "high":
        return "text-orange-600 font-semibold";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleRespondToTicket = (ticket) => {
    setResponseTicket(ticket);
    setResponseMessage("");
    setShowResponseModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "Invalid Date";
    }
  };

  // Get ticket statistics
  const getTicketStats = () => {
    const stats = {
      total: tickets.length,
      open: tickets.filter((t) => t.status?.toLowerCase() === "open").length,
      inProgress: tickets.filter(
        (t) => t.status?.toLowerCase() === "in progress"
      ).length,
      resolved: tickets.filter((t) => t.status?.toLowerCase() === "resolved")
        .length,
      closed: tickets.filter((t) => t.status?.toLowerCase() === "closed")
        .length,
      critical: tickets.filter((t) => t.priority?.toLowerCase() === "critical")
        .length,
      high: tickets.filter((t) => t.priority?.toLowerCase() === "high").length,
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
            <span className="ml-4 text-lg text-gray-600">
              Loading support tickets...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 bg-gradient-to-br from-red-50 to-orange-50 min-h-screen">
        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 max-w-full overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Loading Tickets
              </h3>
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
    <div className="from-red-50 to-orange-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 text-sm md:text-base">Show</span>
              <select
                value={showEntries}
                onChange={(e) => {
                  setShowEntries(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-gray-700 text-sm md:text-base">entries</span>
            </div>
          </div>

          <div className="relative w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-80 text-sm"
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
                    Name/Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 hidden sm:table-cell">
                    Category
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
                {currentTickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No tickets found.
                    </td>
                  </tr>
                ) : (
                  currentTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        #{ticket.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {ticket.name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {ticket.email || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">
                        <span className="truncate block">
                          {ticket.issue_category || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status?.slice(0, 8) || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <select
                          value={ticket.priority || "Medium"}
                          onChange={(e) => updateTicketPriority(ticket.id, e.target.value)}
                          className={`text-sm font-medium border-none bg-transparent cursor-pointer hover:underline w-full ${getPriorityColor(ticket.priority)}`}
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
                          value={ticket.assigned_admin || "Unassigned"}
                          onChange={(e) => assignAdminToTicket(ticket.id, e.target.value)}
                          className="text-sm text-gray-900 border-none bg-transparent cursor-pointer hover:underline w-full"
                        >
                          {adminOptions.map((admin) => (
                            <option key={admin} value={admin} className="text-gray-900">
                              {admin}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewTicket(ticket)}
                            className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {ticket.status !== "Closed" && (
                            <>
                              <button
                                onClick={() => handleRespondToTicket(ticket)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                title="Respond"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateTicketStatus(ticket.id, "Closed")}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                title="Close"
                              >
                                x
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
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            <div className="text-sm text-gray-700 text-center md:text-left">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + showEntries, filteredTickets.length)} of{" "}
              {filteredTickets.length} entries
            </div>
            <div className="flex gap-1 md:gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                return page <= totalPages ? (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 md:px-3 py-2 text-sm border rounded-lg transition-colors ${currentPage === page
                      ? "bg-blue-500 text-white border-blue-500"
                      : "border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {page}
                  </button>
                ) : null;
              })}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-2 md:px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h2 className="text-2xl font-bold text-gray-800">
                Ticket Details
              </h2>
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
                  <label className="text-sm font-medium text-gray-700">
                    Ticket ID
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    #{selectedTicket.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-medium text-white rounded-full ${getStatusColor(
                      selectedTicket.status
                    )}`}
                  >
                    {selectedTicket.status || "Unknown"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <p className="text-gray-900">{selectedTicket.name || "N/A"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="text-gray-900">{selectedTicket.email || "N/A"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Issue Category
                </label>
                <p className="text-gray-900">
                  {selectedTicket.issue_category || "N/A"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <p className="text-gray-900">
                  {selectedTicket.subject || "N/A"}
                </p>
              </div>

              {selectedTicket.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Priority
                </label>
                <p
                  className={`font-medium ${getPriorityColor(
                    selectedTicket.priority
                  )}`}
                >
                  {selectedTicket.priority || "Medium"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Assigned Admin
                </label>
                <p className="text-gray-900">
                  {selectedTicket.assigned_admin || "Unassigned"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Created Date
                  </label>
                  <p className="text-gray-900">
                    {formatDate(selectedTicket.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {formatDate(selectedTicket.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-8 flex-wrap">
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Respond
              </button>
              {selectedTicket.status !== "In Progress" && (
                <button
                  onClick={() =>
                    updateTicketStatus(selectedTicket.id, "In Progress")
                  }
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  In Progress
                </button>
              )}
              {selectedTicket.status !== "Resolved" && (
                <button
                  onClick={() =>
                    updateTicketStatus(selectedTicket.id, "Resolved")
                  }
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Resolve
                </button>
              )}
              {selectedTicket.assigned_admin !== "Admin " && (
                <button
                  onClick={() =>
                    assignAdminToTicket(selectedTicket.id, "Admin ")
                  }
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
      {/* Response Modal */}
      {showResponseModal && responseTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Respond to Ticket #{responseTicket.id}
              </h2>
              <button
                onClick={() => setShowResponseModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Customer
                </label>
                <p className="text-gray-900">
                  {responseTicket.name} ({responseTicket.email})
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <p className="text-gray-900">
                  {responseTicket.subject || "N/A"}
                </p>
              </div>

              {responseTicket.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Original Message
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {responseTicket.description}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Your Response *
                </label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Enter your response to the customer..."
                  className="mt-1 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResponseModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendResponse}
                disabled={sendingResponse || !responseMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingResponse ? "Sending..." : "Send Response"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
