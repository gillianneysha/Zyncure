import React, { useCallback, useState, memo } from "react";
import { supabase } from "../client";
import PasswordInput from "../components/PasswordInput";
import GoogleIcon from "../components/GoogleIcon";
import TermsModal from "../components/TermsModal";

const FormField = memo(({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  children,
  value,
  onChange,
  error,
  disabled,
  labelClassName,
  inputClassName
}) => (
  <div className="mb-3">
    <label className={`block w-4/5 mx-auto mb-1 text-left ${labelClassName || "text-[#F5E0D9]"}`}>
      {label}:
    </label>
    {children || (
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-4/5 block mx-auto mb-1 p-2 border-none rounded-[15.5px] ${inputClassName || "bg-[#FFEDE7]"} ${
          error ? "ring-2 ring-red-400" : ""
        }`}
        required={required}
        disabled={disabled}
      />
    )}
    {error && (
      <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
        {error}
      </p>
    )}
  </div>
));

// Doctor Verification Modal Component
const DoctorVerificationModal = memo(({ isOpen, onClose, onSubmit, isLoading }) => {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState(null);
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!licenseNumber.trim()) {
      newErrors.licenseNumber = "License number is required";
    }
    if (!licenseFile) {
      newErrors.licenseFile = "License file is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit({ licenseNumber, licenseFile });
      // Reset form
      setLicenseNumber("");
      setLicenseFile(null);
      setErrors({});
    }
  };

  const handleClose = () => {
    setLicenseNumber("");
    setLicenseFile(null);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Doctor Verification</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              License Number:
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className={`w-full p-2 border rounded-lg ${
                errors.licenseNumber ? "border-red-400" : "border-gray-300"
              }`}
              placeholder="Enter your medical license number"
              disabled={isLoading}
            />
            {errors.licenseNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              License Document:
            </label>
            <input
              type="file"
              onChange={(e) => setLicenseFile(e.target.files[0])}
              className={`w-full p-2 border rounded-lg ${
                errors.licenseFile ? "border-red-400" : "border-gray-300"
              }`}
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={isLoading}
            />
            {errors.licenseFile && (
              <p className="text-red-500 text-sm mt-1">{errors.licenseFile}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Accepted formats: PDF, JPG, PNG (Max 10MB)
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#55A1A4] text-white rounded-lg hover:bg-[#368487] transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default function RegistrationForm() {
  console.log('RegistrationForm rendered');
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    birthdate: "",
    userType: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Terms and Conditions state
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Doctor verification state
  const [doctorVerification, setDoctorVerification] = useState(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.userType) newErrors.userType = "User type is required";
    if (!formData.contactNumber.trim()) newErrors.contactNumber = "Contact number is required";
    if (!formData.birthdate) newErrors.birthdate = "Birthdate is required";

    // Terms acceptance validation
    if (!hasAcceptedTerms) {
      newErrors.terms = "You must accept the Terms and Conditions to proceed";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    // Contact number validation
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (formData.contactNumber && !phoneRegex.test(formData.contactNumber)) {
      newErrors.contactNumber = "Please enter a valid contact number";
    }

    // Age validation
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      if (age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))) {
        newErrors.birthdate = "You must be at least 18 years old to register";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, hasAcceptedTerms]);

  const resetForm = useCallback(() => {
    setFormData({
      firstName: "",
      lastName: "",
      contactNumber: "",
      birthdate: "",
      userType: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setHasAcceptedTerms(false);
    setDoctorVerification(null);
  }, []);

  // Handle doctor modal submission
  const handleDoctorModalSubmit = useCallback(async (data) => {
    setShowDoctorModal(false);
    
    // Store the doctor verification data including the actual file
    setDoctorVerification({
      licenseNumber: data.licenseNumber,
      licenseFile: data.licenseFile,
    });

    // Continue with registration after a brief delay
    setTimeout(() => {
      // Trigger form submission programmatically
      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(submitEvent);
      }
    }, 100);
  }, []);

  const handleDoctorModalClose = useCallback(() => {
    setShowDoctorModal(false);
  }, []);

  // Main form submission handler
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    // If Doctor and no verification data yet, show modal first
    if (formData.userType === "doctor" && !doctorVerification) {
      setShowDoctorModal(true);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            contact_number: formData.contactNumber,
            birthdate: formData.birthdate,
            user_type: formData.userType,
            // Add initial doctor data without file URL
            ...(formData.userType === "doctor" && doctorVerification && {
              license_number: doctorVerification.licenseNumber,
              status: "pending"
            })
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        },
      });

      if (authError) throw authError;

      // For doctors, handle file upload after user creation
      if (formData.userType === "doctor" && doctorVerification?.licenseFile && authData.user) {
        console.log('Uploading license file for user:', authData.user.id);
        
        // Wait a moment to ensure user is fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('User not authenticated for file upload:', userError);
          throw new Error('Authentication required for file upload');
        }
        
        const fileExt = doctorVerification.licenseFile.name.split('.').pop();
        const filePath = `${authData.user.id}/${Date.now()}_license.${fileExt}`;
        
        try {
          const { error: uploadError } = await supabase.storage
            .from("doctor-licenses")
            .upload(filePath, doctorVerification.licenseFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            // If it's a policy error, provide helpful message
            if (uploadError.message.includes('policy')) {
              throw new Error('File upload permission denied. Please contact support.');
            }
            throw uploadError;
          }

          // Get public URL and update user metadata
          const { data: publicUrlData } = supabase.storage
            .from("doctor-licenses")
            .getPublicUrl(filePath);
            
          // Update user metadata with the file URL
          const { error: updateError } = await supabase.auth.updateUser({
            data: { 
              license_file_url: publicUrlData.publicUrl 
            }
          });
          
          if (updateError) {
            console.error('Failed to update user with license file URL:', updateError);
            // Don't throw here as the main registration was successful
          }

          console.log('License file uploaded successfully:', publicUrlData.publicUrl);
          
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          // User account is created, but file upload failed
          setErrors({
            submit: `Account created successfully, but license file upload failed: ${uploadError.message}. Please contact support to complete your verification.`,
          });
          return;
        }
      }

      setSuccessMessage(
        formData.userType === "doctor" 
          ? "Registration successful! Please check your email and click the confirmation link to activate your account. Your license will be reviewed once confirmed."
          : "Registration successful! Please check your email and click the confirmation link to activate your account."
      );
      resetForm();

    } catch (error) {
      console.error("Registration error:", error);
      setErrors({
        submit: `Registration failed: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, hasAcceptedTerms, doctorVerification, validateForm, resetForm]);

  const handleGoogleSignUp = useCallback(async () => {
    if (!hasAcceptedTerms) {
      setErrors({
        terms: "You must accept the Terms and Conditions before signing up with Google"
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google sign up error:", error);
      setErrors({
        submit: "Google sign up failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hasAcceptedTerms]);

  // Terms modal handlers
  const handleOpenTermsModal = useCallback(() => {
    setIsTermsModalOpen(true);
  }, []);

  const handleCloseTermsModal = useCallback(() => {
    setIsTermsModalOpen(false);
  }, []);

  const handleAcceptTerms = useCallback(() => {
    setHasAcceptedTerms(true);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.terms;
      return newErrors;
    });
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Success Message */}
        {successMessage && (
          <div className="w-4/5 mx-auto mb-4 p-3 bg-green-200 border border-green-400 text-green-800 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="w-4/5 mx-auto mb-4 p-3 bg-red-200 border border-red-400 text-red-800 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        <FormField
          label="First Name"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          error={errors.firstName}
          disabled={isLoading}
          labelClassName="text-[#F5E0D9]"
          inputClassName="bg-[#FFEDE7]"
        />

        <FormField
          label="Last Name"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          error={errors.lastName}
          disabled={isLoading}
          labelClassName="text-[#F5E0D9]"
          inputClassName="bg-[#FFEDE7]"
        />

        <FormField
          label="Contact Number"
          name="contactNumber"
          placeholder="Contact Number"
          value={formData.contactNumber}
          onChange={handleChange}
          error={errors.contactNumber}
          disabled={isLoading}
          labelClassName="text-[#F5E0D9]"
          inputClassName="bg-[#FFEDE7]"
        />

        <FormField
          label="Birthdate"
          name="birthdate"
          type="date"
          value={formData.birthdate}
          onChange={handleChange}
          error={errors.birthdate}
          disabled={isLoading}
          labelClassName="text-[#F5E0D9]"
          inputClassName="bg-[#FFEDE7]"
        />

        <FormField
          label="User Type"
          name="userType"
          value={formData.userType}
          onChange={handleChange}
          error={errors.userType}
          disabled={isLoading}
          labelClassName="text-[#F5E0D9]"
          inputClassName="bg-[#FFEDE7]"
        >
          <div className="relative w-4/5 mx-auto">
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              className={`appearance-none w-full mb-1 p-2 bg-[#FFEDE7] border-none rounded-[15.5px] text-[#b0b0b0] ${
                errors.userType ? "ring-2 ring-red-400" : ""
              }`}
              required
              disabled={isLoading}
            >
              <option value="" className="text-[#b0b0b0]">
                Select user type
              </option>
              <option value="patient" className="text-black">
                Patient
              </option>
              <option value="doctor" className="text-black">
                Doctor
              </option>
            </select>
            {/* Custom down arrow */}
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </FormField>

        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
          labelClassName="text-[#F5E0D9]"
          inputClassName="bg-[#FFEDE7]"
        />

        <div className="w-4/5 mx-auto">
          <PasswordInput
            label="Password:"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            error={errors.password}
            disabled={isLoading}
            labelClassName="text-[#F5E0D9]"
            inputClassName="bg-[#FFEDE7]"
          />
        </div>

        <div className="w-4/5 mx-auto">
          <PasswordInput
            label="Confirm Password:"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm Password"
            error={errors.confirmPassword}
            disabled={isLoading}
            labelClassName="text-[#F5E0D9]"
            inputClassName="bg-[#FFEDE7]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-4/5 block mx-auto py-2 mt-8 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#55A1A4] hover:bg-[#368487]"
          }`}
        >
          {isLoading ? "Creating Account..." : "Sign Up"}
        </button>

        {/* Terms and Conditions Section */}
        <div className="mt-2 w-4/5 mx-auto">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={hasAcceptedTerms}
              onChange={(e) => {
                if (!e.target.checked) {
                  setHasAcceptedTerms(false);
                } else {
                  // Don't allow checking without reading terms
                  e.target.checked = false;
                  handleOpenTermsModal();
                }
              }}
              className="mt-1 w-4 h-4 text-[#55A1A4] bg-[#FFEDE7] border-gray-300 rounded focus:ring-[#55A1A4] focus:ring-2"
              disabled={isLoading}
            />
            <div className="text-[#F5E0D9] text-xs text-left">
              <label htmlFor="acceptTerms" className="cursor-pointer">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={handleOpenTermsModal}
                  className="underline hover:text-white transition-colors duration-200"
                  disabled={isLoading}
                >
                  Terms and Conditions
                </button>{" "}
                and have read and acknowledge the{" "}
                <span className="underline cursor-pointer">Privacy Agreement</span>.
              </label>
            </div>
          </div>
          {errors.terms && (
            <p className="mt-1 text-sm text-red-300">
              {errors.terms}
            </p>
          )}
        </div>

        <div className="w-full flex items-center justify-center mt-8 mb-8">
          <span className="flex-1 h-px bg-[#FEDED2] mx-11"></span>
          <span className="text-[#F5E0D9] text-base font-semibold">OR</span>
          <span className="flex-1 h-px bg-[#FEDED2] mx-11"></span>
        </div>

        <div className="flex flex-col items-center mb-8">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-[#FFEDE7] shadow-lg transition-transform duration-200 hover:scale-95 active:scale-95 hover:shadow-xl ring-2 ring-[#F46B5D] ring-opacity-0 hover:ring-opacity-100 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign up with Google"
            disabled={isLoading}
          >
            <GoogleIcon className="w-10 h-10" />
          </button>
          <span className="mt-3 text-[#F5E0D9] text-sm">
            Sign up using your Google account
          </span>
        </div>
      </form>

      {/* Doctor Verification Modal */}
      <DoctorVerificationModal
        isOpen={showDoctorModal}
        onClose={handleDoctorModalClose}
        onSubmit={handleDoctorModalSubmit}
        isLoading={isLoading}
      />

      {/* Terms and Conditions Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={handleCloseTermsModal}
        onAccept={handleAcceptTerms}
      />
    </>
  );
}