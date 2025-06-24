import React, { useEffect, useState } from 'react';
import { supabase } from '../client';

const ShareSymptom = ({ isOpen, onClose }) => {
  const [symptom, setSymptom] = useState('');
  const [symptomDuration, setSymptomDuration] = useState('');
  const [accessDuration, setAccessDuration] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    const fetchConnections = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;

      const { data, error: fetchError } = await supabase
        .from('patient_connection_details')
        .select('id, connected_to_name') // Adjust if field names differ
        .eq('user_id', user.id); // Adjust depending on your schema

      if (fetchError) console.error(fetchError.message);
      else setConnections(data);
    };

    if (isOpen) fetchConnections();
  }, [isOpen]);

  const handleConfirm = async () => {
    // Example: You can insert a record in `shared_symptom_logs` table
    console.log({
      symptom,
      symptomDuration,
      accessDuration,
      connectionId,
    });
    onClose(); // Close after confirmation
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-2xl text-center max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-[#3BA4A0]">Share symptoms</h2>
        <p className="text-[#666]">Grant access to selected symptoms for sharing with others.</p>

        <div className="text-left space-y-3">
          <div>
            <label className="font-semibold">Select symptoms to share</label>
            <select className="w-full p-2 border rounded" value={symptom} onChange={(e) => setSymptom(e.target.value)}>
              <option value="">-- Select Symptom --</option>
              <option value="Period">Period</option>
              <option value="Feelings">Feelings</option>
              <option value="Skin">Skin</option>
              <option value="Metabolism">Metabolism</option>
            </select>
          </div>

          <div>
            <label className="font-semibold">Symptoms duration</label>
            <select className="w-full p-2 border rounded" value={symptomDuration} onChange={(e) => setSymptomDuration(e.target.value)}>
              <option value="">-- Select Duration --</option>
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="5">5 months</option>
              <option value="6">6 months</option>
            </select>
          </div>

          <div>
            <label className="font-semibold">Connections</label>
            <select className="w-full p-2 border rounded" value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
              <option value="">-- Select Connection --</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>{conn.connected_to_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold">Access duration</label>
            <select className="w-full p-2 border rounded" value={accessDuration} onChange={(e) => setAccessDuration(e.target.value)}>
              <option value="">-- Select Access Duration --</option>
              <option value="1">1 day</option>
              <option value="2">2 days</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            className="text-gray-500 font-semibold"
            onClick={onClose}
          >
            Go Back
          </button>
          <button
            className="bg-[#F98679] text-white px-5 py-2 rounded-full font-semibold hover:bg-[#e37667]"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareSymptom;
