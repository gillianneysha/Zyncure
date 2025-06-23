import React, { useState } from "react";

export default function DoctorVerificationModal({ open, onClose, onSubmit, loading }) {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setLicenseFile(e.target.files[0]);
  };

  const handleSubmit = () => {
    if (!licenseNumber.trim()) {
      setError("License number is required");
      return;
    }
    if (!licenseFile) {
      setError("License file is required");
      return;
    }
    setError("");
    onSubmit({ licenseNumber, licenseFile });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-bold mb-4">Doctor Verification</h2>
        <label className="block mb-2 font-medium">PRC License Number</label>
        <input
          type="text"
          className="w-full p-2 border rounded mb-2"
          value={licenseNumber}
          onChange={e => setLicenseNumber(e.target.value)}
          disabled={loading}
        />
        <label className="block mb-2 font-medium">Upload PRC License (PDF/JPG/PNG)</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="w-full mb-2"
          onChange={handleFileChange}
          disabled={loading}
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-200 rounded"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-teal-600 text-white rounded"
            onClick={handleSubmit}
            disabled={loading}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}