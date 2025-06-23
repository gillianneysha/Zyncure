import React, { useState, useEffect } from "react";
import { X, User, Clock, Trash2, Share } from "lucide-react";
import { supabase } from "../client";

const ShareSymptom = ({
  isOpen,
  onClose,
  item, // { id, name, type: 'symptom' }
  currentUserId,
}) => {
  const [connections, setConnections] = useState([]);
  const [activeShares, setActiveShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [durationType, setDurationType] = useState("hours");
  const [durationValue, setDurationValue] = useState("24");
  const [customDate, setCustomDate] = useState("");
  const [noExpiration, setNoExpiration] = useState(false);

  useEffect(() => {
    if (isOpen && currentUserId && item?.id) {
      fetchConnections();
      fetchActiveShares();
    }
  }, [isOpen, currentUserId, item?.id]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("patient_connection_details")
        .select("*")
        .eq("status", "accepted")
        .eq("patient_id", currentUserId);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Error fetching connections:", error);
      alert("Failed to fetch connections.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveShares = async () => {
    if (!item?.id) return;
    try {
      const { data, error } = await supabase
        .from("symptom_shares")
        .select(`
          *,
          shared_user:shared_with_id(id, email, full_name)
        `)
        .eq("symptom_id", item.id)
        .eq("owner_id", currentUserId)
        .eq("is_active", true);

      if (error) throw error;
      setActiveShares(data || []);
    } catch (error) {
      console.error("Error fetching active shares:", error);
    }
  };

  const calculateExpirationDate = () => {
    if (noExpiration) return null;
    const now = new Date();
    const value = parseInt(durationValue);
    if (isNaN(value)) return null;

    switch (durationType) {
      case "hours":
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case "days":
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case "weeks":
        return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      case "months": {
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() + value);
        return monthDate;
      }
      case "custom":
        return customDate ? new Date(customDate) : null;
      default:
        return null;
    }
  };

  const handleShare = async () => {
    if (!selectedDoctorId) {
      alert("Please select a doctor.");
      return;
    }

    try {
      setLoading(true);

      const { data: symptomData, error: symptomError } = await supabase
        .from("symptoms")
        .select("id")
        .eq("id", item.id)
        .eq("user_id", currentUserId)
        .single();

      if (symptomError || !symptomData) {
        alert("Symptom not found or you don't have access.");
        return;
      }

      const expirationDate = calculateExpirationDate();

      const sharePayload = {
        symptom_id: item.id,
        owner_id: currentUserId,
        shared_with_id: selectedDoctorId,
        expires_at: expirationDate?.toISOString() || null,
        is_active: true,
      };

      const { error } = await supabase.from("symptom_shares").insert([sharePayload]);

      if (error) throw error;

      setSelectedDoctorId("");
      setDurationType("hours");
      setDurationValue("24");
      setCustomDate("");
      setNoExpiration(false);

      await fetchActiveShares();
      alert("Symptom shared successfully!");
    } catch (error) {
      console.error("Error sharing symptom:", error);
      alert("Failed to share. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      const { error } = await supabase
        .from("symptom_shares")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", shareId)
        .eq("owner_id", currentUserId);

      if (error) throw error;

      await fetchActiveShares();
      alert("Share revoked successfully.");
    } catch (error) {
      console.error("Error revoking share:", error);
      alert("Failed to revoke share.");
    }
  };

  const formatExpirationDate = (dateString) => {
    if (!dateString) return "No expiration";
    const date = new Date(dateString);
    const now = new Date();
    if (date < now) return "Expired";

    const diffMs = date - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    return diffDays > 0
      ? `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`
      : diffHours > 0
      ? `Expires in ${diffHours} hour${diffHours > 1 ? "s" : ""}`
      : "Expires soon";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9998]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative z-[9999]">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share size={20} className="text-teal-500" />
            Share Symptom: {item?.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Share with Doctor</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              disabled={loading}
            >
              <option value="">Select a doctor...</option>
              {connections.map((c) => (
                <option key={c.med_id} value={c.med_id}>
                  {c.doctor_first_name && c.doctor_last_name
                    ? `${c.doctor_first_name} ${c.doctor_last_name}`
                    : c.doctor_email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Access Duration</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={noExpiration}
                onChange={(e) => setNoExpiration(e.target.checked)}
              />
              <span>No expiration</span>
            </div>

            {!noExpiration && (
              <>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    min="1"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                    disabled={durationType === "custom"}
                  />
                  <select
                    value={durationType}
                    onChange={(e) => setDurationType(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="custom">Custom Date</option>
                  </select>
                </div>
                {durationType === "custom" && (
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                )}
              </>
            )}
          </div>

          <button
            onClick={handleShare}
            disabled={loading || !selectedDoctorId}
            className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:bg-gray-300"
          >
            {loading ? "Sharing..." : "Share Symptom"}
          </button>

          {activeShares.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Active Shares</h3>
              <div className="space-y-2">
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <div>
                        <div className="text-sm font-medium">
                          {share.shared_user?.full_name || share.shared_user?.email}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} />
                          {formatExpirationDate(share.expires_at)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareSymptom;
