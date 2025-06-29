import React, { useState } from 'react';

const PrivacyModal = ({ isOpen, onClose, onAccept }) => {
    const [isAccepted, setIsAccepted] = useState(false);

    const handleAccept = () => {
        if (isAccepted) {
            onAccept();
            onClose();
        }
    };

    const handleCheckboxChange = (e) => {
        setIsAccepted(e.target.checked);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-[#55A1A4] text-white rounded-t-lg">
                    <h2 className="text-xl font-bold">ZynCure's Privacy Agreement</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 text-gray-800">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-[#55A1A4] mb-3">Privacy Agreement for ZynCure</h3>
                            <p className="text-sm leading-relaxed">
                                Welcome to ZynCure, a patient-centered Electronic Health Record (EHR) system designed specifically for
                                individuals managing Polycystic Ovary Syndrome (PCOS). Your privacy and the security of your personal
                                health information are our top priorities. This Privacy Agreement outlines how we collect, use, protect,
                                and share your information. By using ZynCure, you agree to the terms outlined in this agreement.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">I. Information We Collect</h4>
                            <div className="ml-4 space-y-2 text-sm">
                                <div>
                                    <h5 className="font-medium">1.1 Personal Information</h5>
                                    <ul className="ml-4 list-disc text-gray-600">
                                        <li>Name, date of birth, and contact information (email, phone number, address)</li>
                                        <li>Insurance information and payment details (if applicable)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="font-medium">1.2 Health Information</h5>
                                    <ul className="ml-4 list-disc text-gray-600">
                                        <li>Medical history, symptoms, diagnoses, and treatment plans related to PCOS</li>
                                        <li>Lab results, imaging reports, and medication records</li>
                                        <li>Lifestyle data (e.g., diet, exercise, menstrual cycle tracking) voluntarily provided by you</li>
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="font-medium">1.3 Technical Information</h5>
                                    <ul className="ml-4 list-disc text-gray-600">
                                        <li>Device information (e.g., IP address, browser type, operating system)</li>
                                        <li>Usage data (e.g., pages visited, features used, time spent on the platform)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">II. How We Use Your Information</h4>
                            <ul className="ml-4 list-disc text-sm text-gray-600 space-y-1">
                                <li>To provide personalized care and treatment recommendations for PCOS</li>
                                <li>To facilitate communication between you and your healthcare providers</li>
                                <li>To improve the functionality and user experience of the ZynCure platform</li>
                                <li>To comply with legal and regulatory requirements</li>
                                <li>To send you relevant educational materials, updates, and reminders (if you opt-in)</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">III. How We Protect Your Information</h4>
                            <ul className="ml-4 list-disc text-sm text-gray-600 space-y-1">
                                <li>Encryption of data in transit and at rest</li>
                                <li>Access controls to ensure only authorized personnel can view your information</li>
                                <li>Secure authentication methods (e.g., two-factor authentication)</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">IV. Sharing Your Information</h4>
                            <div className="ml-4 space-y-2 text-sm">
                                <div>
                                    <span className="font-medium">With Your Consent:</span>
                                    <span className="text-gray-600"> We will share your information with healthcare providers, specialists, or third parties only if you explicitly authorize it.</span>
                                </div>
                                <div>
                                    <span className="font-medium">For Legal Purposes:</span>
                                    <span className="text-gray-600"> We may disclose your information if required by law or to protect the rights, safety, or property of ZynCure or others.</span>
                                </div>
                                <div>
                                    <span className="font-medium">With Service Providers:</span>
                                    <span className="text-gray-600"> We may share your information with trusted third-party vendors who assist us in operating the platform (e.g., cloud storage providers, payment processors). These vendors are contractually obligated to protect your data.</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">V. Your Rights and Choices</h4>
                            <div className="ml-4 space-y-2 text-sm">
                                <div>
                                    <span className="font-medium">Access:</span>
                                    <span className="text-gray-600"> You can request a copy of your health records and personal information stored in ZynCure.</span>
                                </div>
                                <div>
                                    <span className="font-medium">Correction:</span>
                                    <span className="text-gray-600"> You can update or correct any inaccurate or incomplete information.</span>
                                </div>
                                <div>
                                    <span className="font-medium">Deletion:</span>
                                    <span className="text-gray-600"> You can request the deletion of your account and associated data, subject to legal and regulatory requirements.</span>
                                </div>
                                <div>
                                    <span className="font-medium">Opt-Out:</span>
                                    <span className="text-gray-600"> You can opt-out of receiving non-essential communications (e.g., newsletters, promotional emails).</span>
                                </div>
                                <p className="text-gray-600 mt-2">
                                    To exercise these rights, please contact us at <span className="font-medium text-[#55A1A4]">zyncure2025@gmail.com</span>.
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">VI. Data Retention</h4>
                            <p className="text-sm text-gray-600">
                                ZynCure retains your information for as long as necessary to fulfill the purposes outlined in this
                                agreement or as required by law. If you delete your account, we will securely archive or anonymize
                                your data in accordance with legal requirements.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">VII. Changes to This Agreement</h4>
                            <p className="text-sm text-gray-600">
                                ZynCure may update this Privacy Agreement from time to time. We will notify you of any significant
                                changes through the platform or via email. Your continued use of ZynCure after such changes constitutes
                                your acceptance of the updated agreement.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#55A1A4] mb-2">VIII. Contact Us</h4>
                            <p className="text-sm text-gray-600 mb-2">
                                If you have any questions, concerns, or requests regarding this Privacy Agreement or your data, please contact us at:
                            </p>
                            <div className="ml-4 text-sm text-gray-600">
                                <p><span className="font-medium">Email:</span> zyncure2025@gmail.com</p>
                                <p><span className="font-medium">Phone:</span> +63 921 642 4770</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-sm text-gray-600 italic">
                                Thank you for trusting ZynCure with your health information. We are committed to supporting you on
                                your PCOS journey while protecting your privacy every step of the way.
                            </p>
                            <p className="text-sm text-gray-600 mt-2 font-medium">
                                Sincerely,<br />
                                ZynCure Team
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg">
                    <div className="flex items-center mb-4">
                        <input
                            type="checkbox"
                            id="privacy-accept"
                            checked={isAccepted}
                            onChange={handleCheckboxChange}
                            className="w-4 h-4 text-[#55A1A4] border-gray-300 rounded focus:ring-[#55A1A4]"
                        />
                        <label htmlFor="privacy-accept" className="ml-2 text-sm text-gray-700">
                            I have read and agree to the Privacy Agreement and Terms and Conditions
                        </label>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={!isAccepted}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${isAccepted
                                    ? 'bg-[#55A1A4] text-white hover:bg-[#368487]'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Accept & Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyModal;