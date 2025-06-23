import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { supabase } from '../client';

const ShareSymptom = ({ isOpen, onClose }) => {
  const [symptomsToShare, setSymptomsToShare] = useState('');
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

  const handleConfirm = async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User fetch error:', userError);
      setLoading(false);
      return;
    }

    if (!symptomsToShare || !symptomsDuration || !selectedConnection || !accessDuration) {
      alert('Please fill out all fields.');
      setLoading(false);
      return;
    }

    const expires_at = (() => {
      const now = new Date();
      switch (accessDuration) {
        case '1 day':
          return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        case '2 days':
          return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        case '1 week':
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case '1 month':
          now.setMonth(now.getMonth() + 1);
          return now;
        default:
          return null;
      }
    })();

    const { error } = await supabase.from('shared_symptoms').insert([
      {
        shared_by: user.id,
        shared_with: selectedConnection,
        symptom: symptomsToShare,
        symptom_duration: symptomsDuration,
        access_duration: accessDuration,
        expires_at: expires_at.toISOString()
      }
    ]);

    if (error) {
      console.error('Error sharing symptom:', error.message);
      alert('Failed to share symptom');
    } else {
      setSymptomsToShare('');
      setSymptomsDuration('');
      setSelectedConnection('');
      setAccessDuration('');
      setShowSuccessModal(true);
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
          <h2 className="text-xl font-bold text-[#3BA4A0] mb-4">Share symptoms</h2>
          <p className="text-sm text-gray-600 mb-6">Grant access to selected symptoms for sharing with others.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Select symptoms to share</label>
              <select
                value={symptomsToShare}
                onChange={(e) => setSymptomsToShare(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Choose which symptoms</option>
                <option value="Period">Period</option>
                <option value="Feelings">Feelings</option>
                <option value="Skin">Skin</option>
                <option value="Metabolism">Metabolism</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Symptoms duration</label>
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
              <label className="block text-sm font-semibold mb-1">Connections</label>
              <select
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a connection</option>
                {connections.map((conn) => (
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
                className="bg-[#F98679] text-white px-4 py-2 rounded-md hover:bg-[#e07466]"
                disabled={loading}
              >
                {loading ? 'Sharing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <CheckCircle className="text-green-500 mx-auto mb-2" size={48} />
            <h3 className="text-lg font-semibold mb-2">Symptom Shared!</h3>
            <p className="text-gray-600 mb-4">Your symptoms have been successfully shared with the selected doctor.</p>
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
