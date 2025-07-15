import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { supabase } from "../../client";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPatients() {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("doctor_connection_details")
        .select("*")
        .eq("status", "accepted");
      setPatients(data || []);
      setLoading(false);
    }
    fetchPatients();
  }, []);

  return (
    <div className="p-8 min-h-screen bg-[#FDEDE7]">
      <h1 className="text-4xl font-bold text-[#3BA4A0] mb-8">Patients</h1>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {patients.map((patient) => (
            <button
              key={patient.patient_id}
              onClick={() => navigate(`/doctor/patients/${patient.patient_id}`)}
              className="bg-[#55A1A4] hover:bg-[#3BA4A0] text-white rounded-xl px-6 py-4 flex items-center gap-3 shadow transition"
            >
              <User className="w-7 h-7" />
              <span className="font-semibold text-lg">
                {patient.patient_first_name} {patient.patient_last_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}