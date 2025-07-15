import React from 'react';
import { CheckCircle, Mail, X } from 'lucide-react';

const EmailVerificationModal = ({ isOpen, onClose, email, isEmailVerification = false }) => {
    console.log("EmailVerificationModal render:", { isOpen, email, isEmailVerification }); 

    if (!isOpen) {
        console.log("Modal not open, returning null"); 
        return null;
    }

    console.log("Modal is open, rendering..."); 

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
                <button
                    onClick={() => {
                        console.log("Modal close button clicked"); 
                        onClose();
                    }}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 p-3 bg-green-100 rounded-full">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>

                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        {isEmailVerification ? "Verification Code Sent!" : "Email Sent Successfully!"}
                    </h2>

                    <p className="text-gray-600 mb-4">
                        {isEmailVerification
                            ? `We've sent a verification code to ${email}. Please check your inbox and enter the code to complete your login.`
                            : `We've sent a verification link to ${email}. Please check your inbox and click the link to continue.`
                        }
                    </p>

                    <div className="flex items-center justify-center mb-4 p-3 bg-blue-50 rounded-lg">
                        <Mail className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-sm text-blue-800">{email}</span>
                    </div>

                    <div className="text-sm text-gray-500 mb-4">
                        <p>Didn't receive the email? Check your spam folder or try again.</p>
                    </div>

                    <button
                        onClick={() => {
                            console.log("Modal 'Got it!' button clicked"); 
                            onClose();
                        }}
                        className="w-full bg-[#55A1A4] text-white py-2 px-4 rounded-lg hover:bg-[#368487] transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationModal;