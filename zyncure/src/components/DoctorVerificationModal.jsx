import React, { useState, useEffect } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

export default function DoctorVerificationModal({ 
  open, 
  onClose, 
  onSubmit, 
  loading, 
  verificationStatus = 'no_record',
  rejectionReason = null 
}) {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setLicenseNumber("");
      setLicenseFile(null);
      setError("");
      setDragOver(false);
    }
  }, [open]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF, JPG, or PNG file");
      return;
    }
    
    if (file.size > maxSize) {
      setError("File size must be less than 5MB");
      return;
    }
    
    setError("");
    setLicenseFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = () => {
    if (!licenseNumber.trim()) {
      setError("PRC License number is required");
      return;
    }
    if (!licenseFile) {
      setError("License file is required");
      return;
    }
    setError("");
    onSubmit({ licenseNumber, licenseFile });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get modal content based on verification status
  const getModalContent = () => {
    switch (verificationStatus) {
      case 'rejected':
        return {
          title: "Resubmit Verification",
          subtitle: "Your previous submission was rejected. Please review and resubmit.",
          showRejectionReason: true,
          infoType: "warning",
          infoTitle: "Resubmission Required",
          infoMessage: "Please address the issues mentioned in the rejection reason and resubmit your documents."
        };
      case 'no_record':
      default:
        return {
          title: "Doctor Verification",
          subtitle: "Please provide your PRC license information",
          showRejectionReason: false,
          infoType: "info",
          infoTitle: "Verification Process",
          infoMessage: "Your documents will be reviewed by our admin team. This process typically takes 1-2 business days."
        };
    }
  };

  if (!open) return null;

  const modalContent = getModalContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{modalContent.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {modalContent.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rejection Reason (if applicable) */}
          {modalContent.showRejectionReason && rejectionReason && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Rejection Reason:</p>
                <p className="mt-1">{rejectionReason}</p>
              </div>
            </div>
          )}

          {/* License Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PRC License Number *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              placeholder="Enter your PRC license number"
              value={licenseNumber}
              onChange={e => setLicenseNumber(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PRC License Document *
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {licenseFile ? (
                <div className="space-y-2">
                  <FileText className="w-8 h-8 text-teal-600 mx-auto" />
                  <p className="text-sm font-medium text-gray-900">
                    {licenseFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(licenseFile.size)}
                  </p>
                  <button
                    onClick={() => setLicenseFile(null)}
                    className="text-sm text-red-600 hover:text-red-800"
                    disabled={loading}
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">
                    Drop your file here or{' '}
                    <label className="text-teal-600 hover:text-teal-700 cursor-pointer">
                      browse
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, JPG, or PNG (max 5MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info Message */}
          <div className={`flex items-start gap-2 p-3 border rounded-lg ${
            modalContent.infoType === 'warning' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              modalContent.infoType === 'warning' ? 'text-yellow-600' : 'text-blue-600'
            }`} />
            <div className={`text-sm ${
              modalContent.infoType === 'warning' ? 'text-yellow-700' : 'text-blue-700'
            }`}>
              <p className="font-medium">{modalContent.infoTitle}:</p>
              <p className="mt-1">{modalContent.infoMessage}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Submitting...' : (verificationStatus === 'rejected' ? 'Resubmit for Review' : 'Submit for Review')}
          </button>
        </div>
      </div>
    </div>
  );
}