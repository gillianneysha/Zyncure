import React, { useState, useEffect } from 'react';

const TermsModal = ({ isOpen, onClose, onAccept }) => {
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
        setHasScrolledToBottom(isAtBottom);
    };

    const handleAccept = () => {
        onAccept();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-[#55A1A4] text-white rounded-t-lg">
                    <h2 className="text-xl font-bold">
                        ZynCure Terms and Conditions
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
                        aria-label="Close modal"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto p-6 text-sm text-gray-700 leading-relaxed"
                    onScroll={handleScroll}
                >
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">I. Introduction</h3>
                            <p>
                                Welcome to ZynCure! ZynCure is a patient-centered digital health record system designed to enhance accessibility and management of electronic health records (EHR) for patients and medical professionals. By using ZynCure, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use immediately.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">II. User Agreement</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>You are at least 18 years old or have legal capacity to enter into contracts.</li>
                                <li>You have provided accurate and truthful information when registering for an account.</li>
                                <li>You will not use the platform for unlawful or harmful purposes.</li>
                                <li>You will not violate the intellectual property rights of others.</li>
                                <li>You agree to ZynCure's privacy policy and data security practices.</li>
                                <li>You agree to be bound by ZynCure's dispute resolution process.</li>
                            </ul>
                            <p className="mt-3">
                                ZynCure may modify these Terms and Conditions at any time. Users will be notified via email or in-app notifications. Continued use of ZynCure after modifications implies acceptance of the updated terms.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">III. Patient Registration and Services</h3>
                            <p className="mb-3">
                                <strong>Overview:</strong> ZynCure provides an online platform where patients can upload, store, and access personal health records.
                            </p>
                            <p className="mb-3">
                                <strong>Registration:</strong> Patients must provide complete and accurate personal information. Any falsification may result in account suspension or termination.
                            </p>
                            <p className="mb-3">
                                <strong>Data Access:</strong> Patients can view their medical records, including medical professional notes and past consultations. Medical providers can only access patient records with explicit patient permission.
                            </p>
                            <p className="mb-3"><strong>System Features:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Account Creation and Management: Users can create and manage personal accounts.</li>
                                <li>Medical Record Viewing: Patients can view, update, and download their medical records.</li>
                                <li>Data Sharing: Patients can grant time-limited, revocable access to healthcare providers to ensure controlled data sharing.</li>
                                <li>Security and Encryption: All data transmissions are encrypted to protect sensitive health information.</li>
                                <li>Medical Professional's Consultation Tracking: Patients can track their consultation history, including diagnoses and prescribed treatments.</li>
                                <li>User Role Management: Different access levels for patients and healthcare providers to ensure secure system interactions.</li>
                                <li>Audit Logs: Tracks all user activity within the system for security and compliance purposes.</li>
                                <li>Multi-Factor Authentication (MFA): Provides an extra layer of security for user accounts.</li>
                                <li>Offline Data Access: Limited offline functionality for reviewing previously downloaded records.</li>
                                <li>Automated Notifications: Alerts and reminders for patients regarding updates or access requests.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">IV. Data Privacy and Security</h3>
                            <p className="mb-3">
                                ZynCure complies with relevant data privacy laws, including the Data Privacy Act of 2012.
                            </p>
                            <p className="mb-3">
                                <strong>Data Collection:</strong> ZynCure collects personal and medical information for service delivery, system improvements, and compliance with legal obligations.
                            </p>
                            <p className="mb-3"><strong>Data Protection:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li><strong>Encryption:</strong> All health records are encrypted using end-to-end encryption (E2EE).</li>
                                <li><strong>Role-Based Access Control (RBAC):</strong> Only authorized personnel can access patient records, reducing data breaches.</li>
                                <li><strong>Multi-Factor Authentication (MFA):</strong> Users must verify their identity before accessing or modifying records.</li>
                            </ul>
                            <p className="mt-3">
                                <strong>Data Storage:</strong> ZynCure stores records in secure cloud-based servers with continuous monitoring.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">V. Patient Control and Record Management</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>Patient-Controlled Access:</strong> Patients have full control over who can view and edit their records.</li>
                                <li><strong>Permission-Based Sharing:</strong> Patients can grant and revoke access to medical professionals through unique time-limited access links.</li>
                                <li><strong>Medical Record Updates:</strong> Medical professionals can update patient records only with patient consent.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">VI. Payment and Fees</h3>
                            <p className="mb-3">
                                <strong>Freemium Model & Subscription Tiers:</strong> ZynCure operates on a freemium model, where basic access is free, and additional premium features require a subscription.
                            </p>

                            <div className="mb-4">
                                <h4 className="font-semibold mb-2">Tier 1: Free (Basic Access)</h4>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>View and manage personal health records</li>
                                    <li>Upload and store up to 2GB of medical files</li>
                                    <li>Share records with up to 3 healthcare providers</li>
                                    <li>Track up to 3 symptoms with the ability to add custom symptoms</li>
                                    <li>Basic notifications for upcoming medical appointments</li>
                                    <li>Access to a health dashboard</li>
                                    <li>Ability to export health records in a standard format (e.g., PDF)</li>
                                </ul>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-semibold mb-2">Tier 2: Premium (Enhanced Access) – Paid Subscription</h4>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>All features in the Free tier</li>
                                    <li>Increased storage capacity up to 5GB</li>
                                    <li>Track all predefined symptoms and custom symptoms</li>
                                    <li>Share records with unlimited healthcare providers</li>
                                </ul>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-semibold mb-2">Tier 3: Pro (Comprehensive Access) – Paid Subscription</h4>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>All features in the Premium tier</li>
                                    <li>Priority support for technical issues</li>
                                    <li>Early access to future feature expansions and integrations</li>
                                    <li>Unlimited storage for medical files</li>
                                </ul>
                            </div>

                            <p className="mb-2">
                                <strong>Transactions:</strong> All payments must be processed through Maya's secure payment gateway.
                            </p>
                            <p>
                                <strong>Refunds:</strong> Any payment disputes will be resolved through ZynCure's support team.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">VII. Intellectual Property</h3>
                            <p className="mb-3">
                                All content, including software, text, graphics, and logos, is the property of ZynCure or its licensors. Users may not copy, distribute, or modify content without permission.
                            </p>
                            <p>
                                If you believe your intellectual property rights have been infringed, contact ZynCure with supporting documentation.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">VIII. Limitations of Liability</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ZynCure provides services "as is" and does not guarantee uninterrupted or error-free service.</li>
                                <li>ZynCure is not responsible for inaccuracies in user-provided data.</li>
                                <li>ZynCure is not liable for indirect, incidental, or consequential damages resulting from platform use.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">IX. Account Termination and Suspension</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ZynCure may suspend or terminate accounts that violate these terms or engage in prohibited activities.</li>
                                <li>Users may request account deletion by contacting ZynCure's support team.</li>
                                <li>Inactive accounts may be archived, but user data will be maintained according to data retention policies.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">X. Dispute Resolution</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Users are encouraged to resolve disputes through ZynCure's support channels.</li>
                                <li>If a resolution is not reached, disputes may be escalated to arbitration or legal proceedings as permitted by law.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">XI. Governing Law</h3>
                            <p>
                                These Terms and Conditions shall be governed by and interpreted in accordance with the laws of the Philippines.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">XII. Amendments and Contact Information</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>ZynCure reserves the right to amend these Terms and Conditions at any time.</li>
                                <li>Users will be notified of significant changes through email or in-app notifications.</li>
                                <li>For questions or concerns, contact ZynCure Support at zyncure2025@gmail.com.</li>
                            </ul>
                            <p className="mt-3">
                                By using ZynCure, you acknowledge and agree to these Terms and Conditions. If you do not agree, please discontinue use immediately.
                            </p>
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center">
                        {!hasScrolledToBottom && (
                            <p className="text-sm text-gray-600">
                                Please scroll to the bottom to accept the terms
                            </p>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={!hasScrolledToBottom}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${hasScrolledToBottom
                                    ? 'bg-[#55A1A4] text-white hover:bg-[#368487]'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Accept Terms
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;