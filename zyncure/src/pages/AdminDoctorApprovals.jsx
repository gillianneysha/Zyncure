import React, { useEffect, useState } from "react";
import { supabase } from "../client";

export default function AdminDoctorApprovals() {
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPendingDoctors();
  }, []);

  const fetchPendingDoctors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_type", "doctor")
      .eq("status", "pending");
    setPendingDoctors(data || []);
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    const { error } = await supabase
      .from("profiles")
      .update({ status: action })
      .eq("id", id);
    if (!error) {
      setPendingDoctors((prev) => prev.filter((doc) => doc.id !== id));
    }
    setActionLoading(null);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Pending Doctor Approvals</h1>
      {loading ? (
        <p>Loading...</p>
      ) : pendingDoctors.length === 0 ? (
        <p>No pending doctors.</p>
      ) : (
        <div className="space-y-6">
          {pendingDoctors.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-6">
              <div className="mb-2 font-semibold">
                {doc.first_name} {doc.last_name}
              </div>
              <div className="mb-1 text-sm">Email: {doc.email}</div>
              <div className="mb-1 text-sm">Contact: {doc.contact_number}</div>
              <div className="mb-1 text-sm">License #: {doc.license_number}</div>
              <div className="mb-1 text-sm">
                License File:{" "}
                {doc.license_file_url ? (
                  <a
                    href={doc.license_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View File
                  </a>
                ) : (
                  "No file"
                )}
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded"
                  onClick={() => handleAction(doc.id, "approved")}
                  disabled={actionLoading}
                >
                  {actionLoading === doc.id + "approved" ? "Approving..." : "Approve"}
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded"
                  onClick={() => handleAction(doc.id, "rejected")}
                  disabled={actionLoading}
                >
                  {actionLoading === doc.id + "rejected" ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}