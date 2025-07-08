import React, { useState, useEffect } from "react";
import { X, User, Clock, Trash2, Share } from "lucide-react";
import { supabase } from "../client";
import { createPortal } from "react-dom";

// --------------- Confirmation Modals ---------------

// Share/Revoke Feedback Modal
function FeedbackModal({ open, title, message, onClose }) {
  if (!open) return null;
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl px-8 py-7 w-full max-w-xs text-center shadow-2xl border relative">
        <div className="font-bold text-lg mb-2 text-gray-800">{title}</div>
        <div className="mb-6 text-gray-700 text-sm">{message}</div>
        <button
          className="w-full bg-[#E36464] hover:bg-[#c64a4a] text-white rounded-full py-2 font-semibold text-base transition-colors"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

// Are you sure you want to remove access?
function ConfirmRevokeModal({ open, doctorName, onConfirm, onCancel }) {
  if (!open) return null;
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl px-8 py-7 w-full max-w-xs text-center shadow-2xl border relative">
        <div className="font-bold text-lg mb-2 text-gray-800">
          Are you sure you want to remove access for <span className="text-[#15907C]">{doctorName}</span>?
        </div>
        <div className="mb-6 text-gray-700 text-sm">
          You can always give them access after this action.
        </div>
        <div className="flex flex-col gap-2">
          <button
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full py-2 font-semibold text-base transition-colors"
            onClick={onCancel}
          >
            No, go back
          </button>
          <button
            className="bg-[#E36464] hover:bg-[#c64a4a] text-white rounded-full py-2 font-semibold text-base transition-colors"
            onClick={onConfirm}
          >
            Yes, remove access
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ----------------------------------------------------

function cleanNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

const ShareModal = ({
  isOpen,
  onClose,
  item,
  currentUserId,
}) => {
  const [connections, setConnections] = useState([]);
  const [activeShares, setActiveShares] = useState([]);
  const [doctorMap, setDoctorMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([]);
  const [durationType, setDurationType] = useState("hours");
  const [durationValue, setDurationValue] = useState("24");
  const [customDate, setCustomDate] = useState("");
  const [noExpiration, setNoExpiration] = useState(false);

  // Confirmation modal state
  const [revokeModal, setRevokeModal] = useState({
    open: false,
    shareId: null,
    doctorName: "",
  });

  // Feedback modal state
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchConnections();
      fetchActiveShares();
    }
    // eslint-disable-next-line
  }, [isOpen, currentUserId, item?.id]);

  useEffect(() => {
    const map = {};
    connections.forEach(conn => {
      let name = "";
      if (conn.doctor_first_name && conn.doctor_last_name) {
        name = `${conn.doctor_first_name} ${conn.doctor_last_name}`;
      } else if (conn.doctor_email) {
        name = conn.doctor_email;
      } else {
        name = conn.med_id || "Unknown";
      }
      map[conn.med_id] = name;
    });
    setDoctorMap(map);
  }, [connections]);

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
    } catch {
      alert("Failed to fetch connections");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveShares = async () => {
    if (!item?.id) return;
    try {
      const { data, error } = await supabase
        .from("file_shares")
        .select("*")
        .eq(item.type === "file" ? "file_id" : "folder_id", item.id)
        .eq("owner_id", currentUserId)
        .eq("is_active", true);
      if (error) throw error;
      const now = new Date();
      const filtered = (data || []).filter(
        share => !share.expires_at || new Date(share.expires_at) > now
      );
      setActiveShares(filtered);
    } catch {}
  };

  const calculateExpirationDate = () => {
    if (noExpiration) return null;
    const now = new Date();
    if (durationType === "custom") {
      return customDate ? new Date(customDate) : null;
    }
    const value = parseInt(durationValue, 10);
    if (isNaN(value)) return null;
    switch (durationType) {
      case "hours": return new Date(now.getTime() + value * 60 * 60 * 1000);
      case "days": return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case "weeks": return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      case "months":
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() + value);
        return monthDate;
      default: return null;
    }
  };

  const validateShareItem = async () => {
    if (!item?.id) return false;
    try {
      if (item.type === "file") {
        const { data, error } = await supabase
          .from("medical_files")
          .select("id")
          .eq("id", item.id)
          .eq("owner_id", currentUserId)
          .single();
        if (error || !data) throw new Error("File not found or you do not own this file");
      } else if (item.type === "folder") {
        const { data, error } = await supabase
          .from("folders")
          .select("id")
          .eq("id", item.id)
          .eq("owner_id", currentUserId)
          .single();
        if (error || !data) throw new Error("Folder not found or you do not own this folder");
      }
      return true;
    } catch (error) {
      alert(error.message);
      return false;
    }
  };

  const handleShare = async () => {
    if (!selectedDoctorIds.length) {
      alert("Please select at least one doctor to share with");
      return;
    }
    const isValid = await validateShareItem();
    if (!isValid) return;
    const expirationDate = calculateExpirationDate();
    setLoading(true);

    let allSuccessful = true;
    let anyUpdated = false;
    let anyInserted = false;
    let errorDoctors = [];
    let sharedNames = [];

    for (const doctorId of selectedDoctorIds) {
      // Try to find ANY share (active or not), for this file/folder+doctor+owner
      const { data: existing, error: fetchError } = await supabase
        .from("file_shares")
        .select("*")
        .eq(item.type === "file" ? "file_id" : "folder_id", item.id)
        .eq("shared_with_id", doctorId)
        .eq("owner_id", currentUserId)
        .limit(1);

      if (fetchError) {
        errorDoctors.push({ doctorId, reason: fetchError.message });
        allSuccessful = false;
        continue;
      }

      if (existing && existing.length > 0) {
        // If deactivated, re-activate and update expires_at
        const shareId = existing[0].id;
        const { error: updateError } = await supabase
          .from("file_shares")
          .update({
            expires_at: expirationDate?.toISOString() || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shareId);

        if (updateError) {
          errorDoctors.push({ doctorId, reason: updateError.message });
          allSuccessful = false;
          continue;
        }
        anyUpdated = true;
        sharedNames.push(doctorMap[doctorId] || doctorId);
      } else {
        let shareData = undefined;
        if (!item?.type) {
          errorDoctors.push({ doctorId, reason: "ShareModal error: item.type is missing!" });
          allSuccessful = false;
          continue;
        }
        if (item.type === "file") {
          shareData = {
            file_id: item.id,
            folder_id: null,
            owner_id: currentUserId,
            shared_with_id: doctorId,
            share_type: "file",
            expires_at: expirationDate?.toISOString() || null,
            is_active: true,
          };
        } else if (item.type === "folder") {
          const { data: folderData, error: folderError } = await supabase
            .from("folders")
            .select("id")
            .eq("id", item.id)
            .single();
          if (folderError || !folderData) {
            errorDoctors.push({
              doctorId,
              reason: "Folder does not exist or you do not own this folder.",
            });
            allSuccessful = false;
            continue;
          }
          shareData = {
            file_id: null,
            folder_id: item.id,
            owner_id: currentUserId,
            shared_with_id: doctorId,
            share_type: "folder",
            expires_at: expirationDate?.toISOString() || null,
            is_active: true,
          };
        } else {
          errorDoctors.push({
            doctorId,
            reason: "ShareModal error: Unknown item.type: " + item.type,
          });
          allSuccessful = false;
          continue;
        }
        if (!shareData) {
          errorDoctors.push({
            doctorId,
            reason: "Unexpected error: shareData could not be constructed.",
          });
          allSuccessful = false;
          continue;
        }
        const cleanedShareData = cleanNulls(shareData);
        const { error: insertError } = await supabase
          .from("file_shares")
          .insert([cleanedShareData]);
        if (insertError) {
          errorDoctors.push({ doctorId, reason: insertError.message });
          allSuccessful = false;
          continue;
        }
        anyInserted = true;
        sharedNames.push(doctorMap[doctorId] || doctorId);
      }
    }

    setLoading(false);
    setSelectedDoctorIds([]);
    setDurationValue("24");
    setDurationType("hours");
    setCustomDate("");
    setNoExpiration(false);
    await fetchActiveShares();

    // Show feedback modal on success
    if (allSuccessful) {
      let expiryString = "";
      const expDate = expirationDate ? expirationDate.toLocaleDateString("en-US") : null;
      if (expDate)
        expiryString = ` until ${expDate}`;
      setFeedbackModal({
        open: true,
        title: "Shared Successfully!",
        message: `Your record has been shared successfully with ${sharedNames.join(", ")}${expiryString}.`
      });
    } else {
      alert('Some shares failed: ' + errorDoctors.map(e => `Doctor ${e.doctorId}: ${e.reason}`).join('; '));
      console.error('Share errors:', errorDoctors);
    }
  };

  // Show confirmation before actually revoking
  const handleAskRevokeShare = (shareId, doctorName) => {
    setRevokeModal({
      open: true,
      shareId,
      doctorName,
    });
  };

  // Actual revoke happens here, after confirm
  const handleRevokeShare = async () => {
    const { shareId, doctorName } = revokeModal;
    if (!shareId) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from("file_shares")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", shareId)
        .eq("owner_id", currentUserId);
      if (error) throw error;
      await fetchActiveShares();
      setRevokeModal({ open: false, shareId: null, doctorName: "" });
      setFeedbackModal({
        open: true,
        title: "Share Revoked!",
        message: `Record access for ${doctorName} has been revoked.`
      });
    } catch {
      alert("Failed to revoke share");
    } finally {
      setLoading(false);
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
    if (diffDays > 0) {
      return `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `Expires in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
    } else {
      return "Expires soon";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9998 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative" style={{ zIndex: 9999 }}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share size={20} className="text-teal-500" />
            Share {item?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share with Doctor(s)
            </label>
            <select
              multiple
              value={selectedDoctorIds}
              onChange={e => setSelectedDoctorIds(Array.from(e.target.selectedOptions, opt => opt.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              disabled={loading}
            >
              {connections.map((connection) => (
                <option key={connection.med_id} value={connection.med_id}>
                  {connection.doctor_first_name && connection.doctor_last_name
                    ? `${connection.doctor_first_name} ${connection.doctor_last_name}`
                    : connection.doctor_email
                  }
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Hold Ctrl (Windows) or Cmd (Mac) to select multiple doctors.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Duration
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="noExpiration"
                checked={noExpiration}
                onChange={(e) => setNoExpiration(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="noExpiration" className="text-sm text-gray-700">
                No expiration
              </label>
            </div>
            {!noExpiration && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    min="1"
                    disabled={durationType === "custom"}
                  />
                  <select
                    value={durationType}
                    onChange={(e) => setDurationType(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleShare}
            disabled={loading || !selectedDoctorIds.length}
            className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sharing..." : "Share Access"}
          </button>
          {activeShares.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Active Shares
              </h3>
              <div className="space-y-2">
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">
                          {doctorMap[share.shared_with_id] || share.shared_with_id}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} />
                          {formatExpirationDate(share.expires_at)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleAskRevokeShare(share.id, doctorMap[share.shared_with_id] || share.shared_with_id)
                      }
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Revoke access"
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
      {/* Modals */}
      <ConfirmRevokeModal
        open={revokeModal.open}
        doctorName={revokeModal.doctorName}
        onConfirm={handleRevokeShare}
        onCancel={() => setRevokeModal({ open: false, shareId: null, doctorName: "" })}
      />
      <FeedbackModal
        open={feedbackModal.open}
        title={feedbackModal.title}
        message={feedbackModal.message}
        onClose={() => setFeedbackModal({ open: false, title: "", message: "" })}
      />
    </div>
  );
};

export default ShareModal;