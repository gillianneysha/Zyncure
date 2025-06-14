import React from "react";

export default function PasswordSuccessModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-[400px] max-w-full flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
          Password Updated<br />Successfully!
        </h2>
        <p className="text-gray-400 text-center mb-8">
          You may now log in<br />with your new password.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-[#F46B5D] text-white text-lg font-semibold rounded-xl py-4 transition hover:bg-[#e05a4d]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}