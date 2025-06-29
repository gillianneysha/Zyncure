import React, { useState } from 'react';
import { Bug, HelpCircle, X, Send, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../client'; 


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
export function ReportModal({ isOpen, onClose }) {
  const [reportType, setReportType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleClose = () => {
    setReportType('');
    setSubmitStatus(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Need Help?</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Choose how we can assist you today
          </p>
        </div>

        <div className="p-6">
          {!reportType ? (
            <ReportTypeSelector onSelect={setReportType} />
          ) : reportType === 'bug' ? (
            <BugReportForm 
              onSubmit={setIsSubmitting}
              onSuccess={() => setSubmitStatus('success')}
              onError={() => setSubmitStatus('error')}
              isSubmitting={isSubmitting}
              submitStatus={submitStatus}
            />
          ) : (
            <SupportTicketForm 
              onSubmit={setIsSubmitting}
              onSuccess={() => setSubmitStatus('success')}
              onError={() => setSubmitStatus('error')}
              isSubmitting={isSubmitting}
              submitStatus={submitStatus}
            />
          )}

          {reportType && submitStatus !== 'success' && (
            <button
              onClick={() => setReportType('')}
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

// Report Type Selector
function ReportTypeSelector({ onSelect }) {
  return (
    <div className="space-y-4">
      <button
        onClick={() => onSelect('bug')}
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
        onClick={() => onSelect('support')}
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
    </div>
  );
}

// Bug Report Form
function BugReportForm({ onSubmit, onSuccess, onError, isSubmitting, submitStatus }) {
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    title: '',
    description: '',
    browser_info: navigator.userAgent,
    device_info: `${navigator.platform} - Screen: ${screen.width}x${screen.height}`
  });

  const handleSubmit = async () => {
    if (!formData.reporter_name || !formData.title || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit(true);
    
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .insert([{
          reporter_name: formData.reporter_name,
          reporter_email: formData.reporter_email,
          title: formData.title,
          description: formData.description,
          browser_info: formData.browser_info,
          device_info: formData.device_info,
          date_logged: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;
      
      console.log('Bug report submitted successfully:', data);
      onSuccess();
    } catch (error) {
      console.error('Error submitting bug report:', error);
      onError();
    } finally {
      onSubmit(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">Bug Report Submitted!</h3>
        <p className="text-sm text-gray-600">
          Thank you for helping us improve. We'll investigate this issue soon.
        </p>
      </div>
    );
  }

  if (submitStatus === 'error') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">Submission Failed</h3>
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
          onChange={(e) => setFormData({...formData, reporter_name: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
        />
        <input
          type="email"
          placeholder="Email Address"
          value={formData.reporter_email}
          onChange={(e) => setFormData({...formData, reporter_email: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
        />
      </div>

      <input
        type="text"
        placeholder="Bug Title *"
        value={formData.title}
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
      />

      <textarea
        placeholder="Describe the bug *"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
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
function SupportTicketForm({ onSubmit, onSuccess, onError, isSubmitting, submitStatus }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issue_category: '',
    subject: '',
    description: ''
  });

  const categories = [
    'Login & Registration',
    'Profile Update Issues',
    'Upload Feature',
    'Billing Errors',
    'Technical Issues',
    'Feature Request',
    'Other Issues'
  ];

  const handleSubmit = async () => {
    if (!formData.name || !formData.issue_category || !formData.subject || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit(true);
    
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([{
          name: formData.name,
          email: formData.email,
          issue_category: formData.issue_category,
          subject: formData.subject,
          description: formData.description,
          status: 'Open',
          priority: 'Medium'
        }]);

      if (error) throw error;
      
      console.log('Support ticket submitted successfully:', data);
      onSuccess();
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      onError();
    } finally {
      onSubmit(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">Support Ticket Submitted!</h3>
        <p className="text-sm text-gray-600">
          We've received your request and will get back to you soon.
        </p>
      </div>
    );
  }

  if (submitStatus === 'error') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-800 mb-2">Submission Failed</h3>
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
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <input
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      <select
        value={formData.issue_category}
        onChange={(e) => setFormData({...formData, issue_category: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        <option value="">Select Issue Category *</option>
        {categories.map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Subject *"
        value={formData.subject}
        onChange={(e) => setFormData({...formData, subject: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />

      <textarea
        placeholder="Describe your issue *"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
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

// Demo App Component
export default function App() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Your App Content Here
        </h1>
        <p className="text-gray-600">
          This is your main application. The report button is positioned at the bottom-right corner.
          Click it to open the report modal where users can submit bug reports or support tickets.
        </p>
        
        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Integration Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Replace the mock Supabase client with your actual Supabase configuration</li>
            <li>Add the ReportButton component to your main layout or sidebar</li>
            <li>Include the ReportModal component in your app's root component</li>
            <li>The forms will automatically insert data into your existing tables</li>
          </ol>
        </div>
      </div>

      <ReportButton onClick={() => setIsReportModalOpen(true)} />
      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />
    </div>
  );
}