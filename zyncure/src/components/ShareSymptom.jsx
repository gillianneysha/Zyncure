

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '../client';


const ShareSymptom = ({ isOpen, onClose }) => {
  const [symptomsDuration, setSymptomsDuration] = useState('');
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [accessDuration, setAccessDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);


  useEffect(() => {
    const fetchConnections = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error fetching user:', userError?.message);
        return;
      }


      const { data, error } = await supabase
        .from('patient_connection_details')
        .select('*')
        .eq('status', 'accepted')
        .eq('patient_id', user.id);


      if (error) {
        console.error('Error fetching connections:', error.message);
      } else {
        setConnections(data);
      }
    };


    if (isOpen) {
      fetchConnections();
    }
  }, [isOpen]);


  const fetchSymptomData = async (userId, duration) => {
    const endDate = new Date();
    const startDate = new Date();


    // Calculate start date based on selected duration
    switch (duration) {
      case '1 week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '1 month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3 months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '5 months':
        startDate.setMonth(startDate.getMonth() - 5);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }


    console.log('Fetching symptomlog data for user:', userId);
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());


    const { data, error } = await supabase
      .from('symptomlog')
      .select('*')
      .eq('patients_id', userId)
      .gte('date_logged', startDate.toISOString())
      .lte('date_logged', endDate.toISOString())
      .order('date_logged', { ascending: false });


    if (error) {
      console.error('Error fetching symptomlog data:', error.message);
      return [];
    }


    console.log('Fetched symptomlog data:', data);


    // Transform data to match the structure expected by generatePDF
    const transformedData = (data || []).map(entry => ({
      date_logged: entry.date_logged,
      symptoms: entry.symptoms,
      severity: entry.severity,
      ...entry
    }));


    return transformedData;
  };


  const fetchUserInfo = async (userId) => {
    const { data, error } = await supabase
      .from('patients')
      .select('first_name, last_name, email, birthdate')
      .eq('patient_id', userId)
      .single();


    if (error) {
      console.error('Error fetching user info:', error.message);
      return {
        name: 'Unknown Patient',
        email: '',
        birthdate: ''
      };
    }


    return {
      name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : 'Patient',
      email: data.email || '',
      birthdate: data.birthdate || ''
    };
  };


  const handleConfirm = async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User fetch error:', userError);
      setLoading(false);
      return;
    }


    if (!symptomsDuration || !selectedConnection || !accessDuration) {
      alert('Please fill out all fields.');
      setLoading(false);
      return;
    }


    try {
      // Fetch symptom data and user info
      const [loggedDates, userInfo] = await Promise.all([
        fetchSymptomData(user.id, symptomsDuration),
        fetchUserInfo(user.id)
      ]);


      console.log('Data to be included in PDF:', { loggedDates, userInfo });


      // Check if we have data to include
      if (!loggedDates || loggedDates.length === 0) {
        alert('No symptom data found for the selected duration. Please try a different time period.');
        setLoading(false);
        return;
      }


      // Import the generatePDFAsBlob function
      const { generatePDFAsBlob } = await import('../utils/generateTrackingReport');
     
      // Generate PDF blob using the updated function
      const pdfBlob = await generatePDFAsBlob(loggedDates, userInfo);
     
      // Create filename for sharing
      const shareFileName = `symptoms-report-${user.id}-${Date.now()}.pdf`;


      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sharedsymptoms')
        .upload(shareFileName, pdfBlob, { contentType: 'application/pdf' });


      if (uploadError) {
        console.error('Upload error:', uploadError.message);
        alert(`Failed to upload PDF: ${uploadError.message}`);
        setLoading(false);
        return;
      }


      const { data: urlData } = supabase.storage
        .from('sharedsymptoms')
        .getPublicUrl(uploadData.path);


      const now = new Date();
      const expiresAt = (() => {
        switch (accessDuration) {
          case '1 day': return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
          case '2 days': return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
          case '1 week': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          case '1 month': {
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return nextMonth;
          }
          default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
      })();


      const { error: insertError } = await supabase.from('shared_symptoms').insert([
        {
          shared_by: user.id,
          shared_with: selectedConnection,
          symptom: 'Complete Symptoms Report',
          symptom_duration: symptomsDuration,
          access_duration: accessDuration,
          expires_at: expiresAt.toISOString(),
          pdf_filename: shareFileName,
          report_url: urlData.publicUrl
        }
      ]);


      if (insertError) {
        console.error('DB insert error:', insertError.message);
        alert(`Failed to save shared report: ${insertError.message}`);
      } else {
        setSymptomsDuration('');
        setSelectedConnection('');
        setAccessDuration('');
        setShowSuccessModal(true);
      }


    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Error generating report: ${error.message}`);
    }


    setLoading(false);
  };


  if (!isOpen) return null;


  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold text-[#3BA4A0] mb-4">Share Symptoms Report</h2>
          <p className="text-sm text-gray-600 mb-6">Generate and share a comprehensive PDF report containing all your symptoms data.</p>


          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-blue-600" size={20} />
                <span className="text-sm font-semibold text-blue-800">PDF Report Contents</span>
              </div>
              <p className="text-xs text-blue-700">
                Includes: Period Flow, Symptoms, Feelings, Cravings, Energy, Weight, Custom entries
              </p>
            </div>


            <div>
              <label className="block text-sm font-semibold mb-1">Symptom Duration</label>
              <select
                value={symptomsDuration}
                onChange={(e) => setSymptomsDuration(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select duration</option>
                <option value="1 week">1 week</option>
                <option value="1 month">1 month</option>
                <option value="3 months">3 months</option>
                <option value="5 months">5 months</option>
              </select>
            </div>


            <div>
              <label className="block text-sm font-semibold mb-1">Share with doctor</label>
              <select
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a doctor</option>
                {connections.map(conn => (
                  <option key={conn.id} value={conn.med_id}>
                    {conn.doctor_first_name} {conn.doctor_last_name}
                  </option>
                ))}
              </select>
            </div>


            <div>
              <label className="block text-sm font-semibold mb-1">Access duration</label>
              <select
                value={accessDuration}
                onChange={(e) => setAccessDuration(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Choose duration</option>
                <option value="1 day">1 day</option>
                <option value="2 days">2 days</option>
                <option value="1 week">1 week</option>
                <option value="1 month">1 month</option>
              </select>
            </div>


            <div className="flex justify-between mt-6">
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                className="bg-[#F98679] text-white px-4 py-2 rounded-md hover:bg-[#e07466] flex items-center gap-2"
                disabled={loading}
              >
                <FileText size={16} />
                {loading ? 'Generating...' : 'Generate & Share'}
              </button>
            </div>
          </div>
        </div>
      </div>


      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <CheckCircle className="text-green-500 mx-auto mb-2" size={48} />
            <h3 className="text-lg font-semibold mb-2">Report Shared Successfully!</h3>
            <p className="text-gray-600 mb-4">Your comprehensive symptoms report has been generated and shared with the selected doctor.</p>
            <button
              onClick={() => { setShowSuccessModal(false); onClose(); }}
              className="bg-[#3BA4A0] text-white px-4 py-2 rounded-md hover:bg-[#32948f]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};


export default ShareSymptom;
