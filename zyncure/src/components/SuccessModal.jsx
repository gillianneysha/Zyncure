import React from "react";

function SuccessModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl px-8 py-7 w-full max-w-xs text-center shadow-2xl border relative">
        <div className="font-bold text-xl mb-2" style={{ color: "#15907C" }}>{title}</div>
        {message && <div className="mb-6 text-gray-700 text-sm">{message}</div>}
        <button
          className="bg-[#E36464] hover:bg-[#c64a4a] text-white rounded-full py-2 px-6 font-semibold text-base transition-colors"
          onClick={onClose}
          data-testid="success-modal-close"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default SuccessModal;