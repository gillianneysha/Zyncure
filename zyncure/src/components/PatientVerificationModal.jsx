import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Mail, Phone, MapPin, Shield, Check, Clock } from 'lucide-react';
import { supabase } from '../client';

const PatientVerificationModal = ({
    isOpen,
    onClose,
    onVerified,
    patientData,
    onVerificationFailed
}) => {
    const [step, setStep] = useState(1);
    const [verificationData, setVerificationData] = useState({
        dateOfBirth: '',
        phoneNumber: '',
        email: '',
        firstName: '',
        lastName: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [actualPatientData, setActualPatientData] = useState(null);
    const maxAttempts = 3;

    // Reset modal state when opened
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setVerificationData({
                dateOfBirth: '',
                phoneNumber: '',
                email: '',
                firstName: '',
                lastName: ''
            });
            setErrors({});
            setAttempts(0);
            fetchFullPatientData();
        }
    }, [isOpen]);

    const fetchFullPatientData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile, error } = await supabase
                .from('patients')
                .select('first_name, last_name, email, birthdate, contact_no, user_type, status')
                .eq('patient_id', user.id)
                .single();

            if (error) {
                console.error('Error fetching patient data:', error);
                return;
            }

            setActualPatientData(profile);
        } catch (error) {
            console.error('Error in fetchFullPatientData:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setVerificationData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateStep1 = () => {
        const newErrors = {};

        if (!verificationData.dateOfBirth) {
            newErrors.dateOfBirth = 'Date of birth is required';
        } else {
            // Basic date validation
            const inputDate = new Date(verificationData.dateOfBirth);
            const today = new Date();
            if (inputDate >= today || inputDate < new Date('1900-01-01')) {
                newErrors.dateOfBirth = 'Please enter a valid date of birth';
            }
        }

        if (!verificationData.phoneNumber) {
            newErrors.phoneNumber = 'Phone number is required';
        } else if (!/^[\+]?[0-9\-\(\)\s]+$/.test(verificationData.phoneNumber)) {
            newErrors.phoneNumber = 'Please enter a valid phone number';
        }

        if (!verificationData.email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};

        if (!verificationData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!verificationData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleStep1Continue = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const normalizeString = (str) => {
        if (!str) return '';
        return str.toLowerCase().trim().replace(/\s+/g, ' ');
    };

    const normalizePhoneNumber = (phone) => {
        if (!phone) return '';
        // Remove all non-digit characters
        return phone.replace(/\D/g, '');
    };

    const compareDates = (inputDate, storedDate) => {
        if (!inputDate || !storedDate) return false;

        const input = new Date(inputDate);
        const stored = new Date(storedDate);

        return input.getFullYear() === stored.getFullYear() &&
            input.getMonth() === stored.getMonth() &&
            input.getDate() === stored.getDate();
    };

    const validatePatientData = () => {
        if (!actualPatientData) {
            return {
                isValid: false,
                errors: ['Unable to retrieve patient data for verification.']
            };
        }

        const validationErrors = [];
        let validFields = 0;
        let totalRequiredFields = 0;

        // Validate date of birth (required)
        totalRequiredFields++;
        if (!compareDates(verificationData.dateOfBirth, actualPatientData.birthdate)) {
            validationErrors.push('Date of birth does not match our records.');
        } else {
            validFields++;
        }

        // Validate phone number (required)
        totalRequiredFields++;
        const inputPhone = normalizePhoneNumber(verificationData.phoneNumber);
        const storedPhone = normalizePhoneNumber(actualPatientData.contact_no);

        if (!inputPhone || !storedPhone || !inputPhone.includes(storedPhone.slice(-10)) && !storedPhone.includes(inputPhone.slice(-10))) {
            validationErrors.push('Phone number does not match our records.');
        } else {
            validFields++;
        }

        // Validate email (required)
        totalRequiredFields++;
        const inputEmail = normalizeString(verificationData.email);
        const storedEmail = normalizeString(actualPatientData.email);

        if (!inputEmail || !storedEmail || inputEmail !== storedEmail) {
            validationErrors.push('Email address does not match our records.');
        } else {
            validFields++;
        }

        // Validate first name (required)
        totalRequiredFields++;
        const inputFirstName = normalizeString(verificationData.firstName);
        const storedFirstName = normalizeString(actualPatientData.first_name);

        if (!inputFirstName || !storedFirstName || inputFirstName !== storedFirstName) {
            validationErrors.push('First name does not match our records.');
        } else {
            validFields++;
        }

        // Validate last name (required)
        totalRequiredFields++;
        const inputLastName = normalizeString(verificationData.lastName);
        const storedLastName = normalizeString(actualPatientData.last_name);

        if (!inputLastName || !storedLastName || inputLastName !== storedLastName) {
            validationErrors.push('Last name does not match our records.');
        } else {
            validFields++;
        }

        // Consider verification successful if at least 80% of required fields match
        const successThreshold = Math.ceil(totalRequiredFields * 0.8);
        const isValid = validFields >= successThreshold;

        return {
            isValid,
            errors: validationErrors,
            matchedFields: validFields,
            totalFields: totalRequiredFields
        };
    };

    // Set verification timeout in user metadata when verification fails
    const setVerificationTimeout = async () => {
        try {
            const timeoutExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

            await supabase.auth.updateUser({
                data: {
                    verification_timeout_until: timeoutExpiry.toISOString()
                }
            });
        } catch (error) {
            console.error('Error setting verification timeout:', error);
        }
    };

    const handleVerification = async () => {
        if (!validateStep2()) return;

        setIsLoading(true);
        try {
            // Add a small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 1500));

            const validationResult = validatePatientData();

            if (validationResult.isValid) {
                // Verification successful
                setStep(3); // Success step
                setTimeout(() => {
                    onVerified();
                    onClose();
                }, 2000);
            } else {
                // Verification failed
                setAttempts(prev => prev + 1);
                const remainingAttempts = maxAttempts - attempts - 1;

                if (remainingAttempts <= 0) {
                    // Set timeout when max attempts exceeded
                    await setVerificationTimeout();
                    onVerificationFailed('Maximum verification attempts exceeded. For security reasons, please contact our support team to verify your identity.');
                } else {
                    const errorMessage = validationResult.errors.length > 0
                        ? `Verification failed: ${validationResult.errors.join(' ')} Please check your information and try again. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
                        : `Verification failed. Please ensure all information matches your registration details exactly. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`;

                    setErrors({
                        verification: errorMessage
                    });
                }
            }
        } catch (error) {
            console.error('Verification error:', error);
            setErrors({
                verification: 'Verification failed due to a system error. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-[#55A1A4] bg-opacity-10 rounded-full">
                            <Shield className="w-6 h-6 text-[#55A1A4]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Identity Verification</h2>
                            <p className="text-sm text-gray-600">Step {step} of 3</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={isLoading}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                        {[1, 2, 3].map((stepNum) => (
                            <div key={stepNum} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step > stepNum ? 'bg-green-500 text-white' :
                                    step === stepNum ? 'bg-[#55A1A4] text-white' :
                                        'bg-gray-200 text-gray-600'
                                    }`}>
                                    {step > stepNum ? <Check className="w-4 h-4" /> : stepNum}
                                </div>
                                {stepNum < 3 && (
                                    <div className={`h-1 w-12 mx-2 ${step > stepNum ? 'bg-green-500' : 'bg-gray-200'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 1: Basic Information */}
                {step === 1 && (
                    <div className="px-6 pb-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
                            <p className="text-sm text-gray-600">Please verify your personal details to confirm your identity. This information must match what you provided during registration.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={verificationData.dateOfBirth}
                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#55A1A4] focus:border-[#55A1A4] ${errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    disabled={isLoading}
                                />
                                {errors.dateOfBirth && (
                                    <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <Phone className="w-4 h-4 mr-2" />
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={verificationData.phoneNumber}
                                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                    placeholder="Enter your phone number exactly as registered"
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#55A1A4] focus:border-[#55A1A4] ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    disabled={isLoading}
                                />
                                {errors.phoneNumber && (
                                    <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={verificationData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="Enter your email address exactly as registered"
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#55A1A4] focus:border-[#55A1A4] ${errors.email ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    disabled={isLoading}
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button
                                onClick={handleStep1Continue}
                                className="px-6 py-3 bg-[#55A1A4] text-white rounded-lg hover:bg-[#368487] transition-colors font-medium"
                                disabled={isLoading}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Additional Verification */}
                {step === 2 && (
                    <div className="px-6 pb-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Verification</h3>
                            <p className="text-sm text-gray-600">Please provide your name exactly as you entered during registration to complete verification.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <User className="w-4 h-4 mr-2" />
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={verificationData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    placeholder="Enter your first name exactly as registered"
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#55A1A4] focus:border-[#55A1A4] ${errors.firstName ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    disabled={isLoading}
                                />
                                {errors.firstName && (
                                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                    <User className="w-4 h-4 mr-2" />
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={verificationData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    placeholder="Enter your last name exactly as registered"
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#55A1A4] focus:border-[#55A1A4] ${errors.lastName ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    disabled={isLoading}
                                />
                                {errors.lastName && (
                                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                                )}
                            </div>
                        </div>

                        {errors.verification && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{errors.verification}</p>
                            </div>
                        )}

                        <div className="flex justify-between pt-6">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                disabled={isLoading}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleVerification}
                                className="px-6 py-3 bg-[#55A1A4] text-white rounded-lg hover:bg-[#368487] transition-colors font-medium disabled:opacity-50"
                                disabled={isLoading || attempts >= maxAttempts}
                            >
                                {isLoading ? 'Verifying...' : 'Verify Identity'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="px-6 pb-6 text-center">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Successful!</h3>
                            <p className="text-sm text-gray-600">Your identity has been verified successfully. You will be redirected to your dashboard.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientVerificationModal;