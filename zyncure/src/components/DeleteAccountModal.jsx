import React, { useEffect } from "react";

export default function DeleteAccountModal({ open, onCancel, onConfirm, title, description, loading }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed -top-5 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-[400px] max-w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title || "This will delete your account"}</h2>
        <p className="text-gray-500 mb-6">{description || "Proceed with your deletion request?"}</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold bg-white hover:bg-gray-100 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-lg bg-[#F46B5D] text-white font-semibold hover:bg-[#e05a4d] transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}