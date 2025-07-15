import React, { useState, useEffect } from "react";
import {
  Bug,
  HelpCircle,
  X,
  Send,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  History,
  Clock,
  User,
  Mail,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../client";

// Report Button Component (to be added to your sidebar)
export function ReportButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 group"
      title="Need Help?"
    >
      <MessageSquare size={24} />
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Need Help?
      </span>
    </button>
  );
}

// Main Report Modal Component
export function ReportModal({ isOpen, onClose, user }) {
  const [reportType, setReportType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState({ bugs: [], tickets: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

 
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
      
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('first_name, last_name, email')
          .eq('patient_id', user.id)
          .single();

        if (patientData && !patientError) {
          setUserProfile({
            name: `${patientData.first_name} ${patientData.last_name}`,
            email: patientData.email || user.email,
            type: 'patient'
          });
          return;
        }

        
        const { data: medData, error: medError } = await supabase
          .from('medicalprofessionals')
          .select('first_name, last_name, email')
          .eq('med_id', user.id)
          .single();

        if (medData && !medError) {
          setUserProfile({
            name: `${medData.first_name} ${medData.last_name}`,
            email: medData.email || user.email,
            type: 'medical'
          });
          return;
        }

        
        const { data: adminData, error: adminError } = await supabase
          .from('admin')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();

        if (adminData && !adminError) {
          setUserProfile({
            name: adminData.full_name,
            email: adminData.email || user.email,
            type: 'admin'
          });
          return;
        }

        
        setUserProfile({
          name: user.email?.split('@')[0] || '',
          email: user.email || '',
          type: 'unknown'
        });

      } catch (error) {
        console.error('Error fetching user profile:', error);
        
        setUserProfile({
          name: user.email?.split('@')[0] || '',
          email: user.email || '',
          type: 'unknown'
        });
      }
    };

    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

  const fetchHistory = async () => {
    if (!userProfile?.email) return;

    setLoadingHistory(true);
    try {
    
      const { data: bugData, error: bugError } = await supabase
        .from('bug_reports')
        .select('*')
        .eq('reporter_email', userProfile.email)
        .order('created_at', { ascending: false });

     
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('email', userProfile.email)
        .order('created_at', { ascending: false });

      if (bugError) console.error('Error fetching bug reports:', bugError);
      if (ticketError) console.error('Error fetching support tickets:', ticketError);

      setHistoryData({
        bugs: bugData || [],
        tickets: ticketData || []
      });
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClose = () => {
    setReportType("");
    setSubmitStatus(null);
    setUserProfile(null);
    setShowHistory(false);
    setHistoryData({ bugs: [], tickets: [] });
    onClose();
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    fetchHistory();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              {showHistory ? 'My History' : 'Need Help?'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {showHistory ? 'Your submitted reports and tickets' : 'Choose how we can assist you today'}
          </p>
        </div>

        <div className="p-6">
          {showHistory ? (
            <HistoryView
              historyData={historyData}
              loadingHistory={loadingHistory}
              onBack={() => setShowHistory(false)}
            />
          ) : !reportType ? (
            <ReportTypeSelector onSelect={setReportType} onShowHistory={handleShowHistory} />
          ) : reportType === "bug" ? (
            <BugReportForm
              onSubmit={setIsSubmitting}
              onSuccess={() => setSubmitStatus("success")}
              onError={() => setSubmitStatus("error")}
              isSubmitting={isSubmitting}
              submitStatus={submitStatus}
              user={user}
              userProfile={userProfile}
            />
          ) : (
            <SupportTicketForm
              onSubmit={setIsSubmitting}
              onSuccess={() => setSubmitStatus("success")}
              onError={() => setSubmitStatus("error")}
              isSubmitting={isSubmitting}
              submitStatus={submitStatus}
              user={user}
              userProfile={userProfile}
            />
          )}

          {reportType && submitStatus !== "success" && !showHistory && (
            <button
              onClick={() => setReportType("")}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              ← Back to options
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// History View Component
function HistoryView({ historyData, loadingHistory, onBack }) {
  const [activeTab, setActiveTab] = useState('bugs');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalCount = historyData.bugs.length + historyData.tickets.length;

 
  const getCurrentPageData = () => {
    const data = activeTab === 'bugs' ? historyData.bugs : historyData.tickets;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const data = activeTab === 'bugs' ? historyData.bugs : historyData.tickets;
    return Math.ceil(data.length / itemsPerPage);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when switching tabs
  };

  if (loadingHistory) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-4"></div>
        <p className="text-sm text-gray-600">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back
        </button>
        <div className="text-sm text-gray-600">
          Total: {totalCount} item{totalCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => handleTabChange('bugs')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'bugs'
            ? 'bg-white text-red-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Bug Reports ({historyData.bugs.length})
        </button>
        <button
          onClick={() => handleTabChange('tickets')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'tickets'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Support Tickets ({historyData.tickets.length})
        </button>
      </div>

      {/* History Content */}
      <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
      
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 4px;
          }
          div::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
          }
        `}</style>
        {activeTab === 'bugs' ? (
          getCurrentPageData().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bug size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No bug reports found</p>
            </div>
          ) : (
            getCurrentPageData().map((bug) => (
              <div key={bug.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {bug.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {bug.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      {formatDate(bug.created_at || bug.date_logged)}
                    </div>
                  </div>
                  <div className="ml-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bug.status)}`}>
                      {bug.status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          getCurrentPageData().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HelpCircle size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No support tickets found</p>
            </div>
          ) : (
            getCurrentPageData().map((ticket) => (
              <div key={ticket.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                        {ticket.issue_category}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {ticket.subject}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      {formatDate(ticket.created_at)}
                    </div>
                  </div>
                  <div className="ml-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Pagination*/}
      {getTotalPages() > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, activeTab === 'bugs' ? historyData.bugs.length : historyData.tickets.length)} of {activeTab === 'bugs' ? historyData.bugs.length : historyData.tickets.length} items
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} of {getTotalPages()}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
              disabled={currentPage === getTotalPages()}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function ReportTypeSelector({ onSelect, onShowHistory }) {
  return (
    <div className="space-y-4">
      <button
        onClick={() => onSelect("bug")}
        className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all text-left group"
      >
        <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
            <Bug className="text-red-600" size={24} />
          </div>
          <div className="ml-4">
            <h3 className="font-medium text-gray-800">Report a Bug</h3>
            <p className="text-sm text-gray-600">
              Something isn't working as expected
            </p>
          </div>
        </div>
      </button>

      <button
        onClick={() => onSelect("support")}
        className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
      >
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
            <HelpCircle className="text-blue-600" size={24} />
          </div>
          <div className="ml-4">
            <h3 className="font-medium text-gray-800">Get Support</h3>
            <p className="text-sm text-gray-600">
              Need help with your account or features
            </p>
          </div>
        </div>
      </button>

      <button
        onClick={onShowHistory}
        className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
      >
        <div className="flex items-center">
          <div className="p-3 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
            <History className="text-indigo-600" size={24} />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="font-medium text-gray-800">View History</h3>
            <p className="text-sm text-gray-600">
              See your submitted reports and tickets
            </p>
          </div>
          <ChevronRight className="text-gray-400" size={20} />
        </div>
      </button>
    </div>
  );
}


function BugReportForm({ onSubmit, onSuccess, onError, isSubmitting, submitStatus, userProfile }) {
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    title: '',
    description: '',
    browser_info: navigator.userAgent,
    device_info: `${navigator.platform} - Screen: ${screen.width}x${screen.height}`
  });

  
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        reporter_name: userProfile.name || '',
        reporter_email: userProfile.email || '',
      }));
    }
  }, [userProfile]);

  const handleSubmit = async () => {
    if (!formData.reporter_name || !formData.title || !formData.description) {
      alert("Please fill in all required fields");
      return;
    }

    onSubmit(true);

    try {
      const { data, error } = await supabase.from("bug_reports").insert([
        {
          reporter_name: formData.reporter_name,
          reporter_email: formData.reporter_email,
          title: formData.title,
          description: formData.description,
          browser_info: formData.browser_info,
          device_info: formData.device_info,
          date_logged: new Date().toISOString().split("T")[0],
        },
      ]);

      if (error) throw error;

      console.log("Bug report submitted successfully:", data);
      onSuccess();
    } catch (error) {
      console.error("Error submitting bug report:", error);
      onError();
    } finally {
      onSubmit(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Bug Report Submitted!
        </h3>
        <p className="text-sm text-gray-600">
          Thank you for helping us improve. We'll investigate this issue soon.
        </p>
      </div>
    );
  }

  if (submitStatus === "error") {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Submission Failed
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          There was an error submitting your report. Please try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <div className="flex items-center mb-4">
        <Bug className="text-red-600 mr-2" size={20} />
        <h3 className="font-medium text-gray-800">Report a Bug</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Your Name *"
          value={formData.reporter_name}
          onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
          disabled={userProfile}
          className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${userProfile ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={formData.reporter_email}
          onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
          disabled={userProfile}
          className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${userProfile ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
      </div>

      <input
        type="text"
        placeholder="Bug Title *"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
      />

      <textarea
        placeholder="Describe the bug *"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm h-20 resize-none"
      />

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
      >
        {isSubmitting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Send size={16} className="mr-2" />
            Submit Bug Report
          </>
        )}
      </button>
    </div>
  );
}

// Support Ticket Form
function SupportTicketForm({ onSubmit, onSuccess, onError, isSubmitting, submitStatus, userProfile }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issue_category: '',
    subject: '',
    description: ''
  });

  // Update form data when userProfile is loaded
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || '',
        email: userProfile.email || '',
      }));
    }
  }, [userProfile]);

  const categories = [
    "Login & Registration",
    "Profile Update Issues",
    "Upload Feature",
    "Billing Errors",
    "Technical Issues",
    "Feature Request",
    "Other Issues",
  ];

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.issue_category ||
      !formData.subject ||
      !formData.description
    ) {
      alert("Please fill in all required fields");
      return;
    }

    onSubmit(true);

    try {
      const { data, error } = await supabase.from("support_tickets").insert([
        {
          name: formData.name,
          email: formData.email,
          issue_category: formData.issue_category,
          subject: formData.subject,
          description: formData.description,
          status: "Open",
          priority: "Medium",
        },
      ]);

      if (error) throw error;

      console.log("Support ticket submitted successfully:", data);
      onSuccess();
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      onError();
    } finally {
      onSubmit(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Support Ticket Submitted!
        </h3>
        <p className="text-sm text-gray-600">
          We've received your request and will get back to you soon.
        </p>
      </div>
    );
  }

  if (submitStatus === "error") {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Submission Failed
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          There was an error submitting your ticket. Please try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <div className="flex items-center mb-4">
        <HelpCircle className="text-blue-600 mr-2" size={20} />
        <h3 className="font-medium text-gray-800">Get Support</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Your Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={userProfile}
          className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${userProfile ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={userProfile}
          className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${userProfile ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
      </div>

      <select
        value={formData.issue_category}
        onChange={(e) =>
          setFormData({ ...formData, issue_category: e.target.value })
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        <option value="">Select Issue Category *</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Subject *"
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />

      <textarea
        placeholder="Describe your issue *"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm h-24 resize-none"
      />

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
      >
        {isSubmitting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Send size={16} className="mr-2" />
            Submit Support Ticket
          </>
        )}
      </button>
    </div>
  );
}

export default function App() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {

    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }
    };

    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setCurrentUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <ReportButton onClick={() => setIsReportModalOpen(true)} />
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        user={currentUser}
      />
    </div>
  );
}