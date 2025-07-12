import React, { useCallback, useState, memo } from "react";
import { supabase } from "../client";
import PasswordInput from "../components/PasswordInput";
import GoogleIcon from "../components/GoogleIcon";
import TermsModal from "../components/TermsModal";
import PrivacyModal from "../components/PrivacyModal";

const FormField = memo(
  ({
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
    inputClassName,
  }) => (
    <div className="mb-3">
      <label
        className={`block w-4/5 mx-auto mb-1 text-left ${labelClassName || "text-[#F5E0D9]"
          }`}
      >
        {label}:
      </label>
      {children || (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-4/5 block mx-auto mb-1 p-2 border-none rounded-[15.5px] ${inputClassName || "bg-[#F5E0D9]"
            } ${error ? "ring-2 ring-red-400" : ""}`}
          required={required}
          disabled={disabled}
        />
      )}
      {error && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-[#F5E0D9]">{error}</p>
      )}
    </div>
  )
);

export default function RegistrationForm() {
  console.log("RegistrationForm rendered");

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

  // Privacy Agreement state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);

  const checkEmailExists = useCallback(async (email) => {
    try {
      // Check in both patients and medicalprofessionals tables
      const [patientsResponse, doctorsResponse] = await Promise.all([
        supabase
          .from('patients')
          .select('email')
          .eq('email', email)
          .maybeSingle(),
        supabase
          .from('medicalprofessionals')
          .select('email')
          .eq('email', email)
          .maybeSingle()
      ]);

      // If either query returns data, email exists
      return patientsResponse.data || doctorsResponse.data;
    } catch (error) {
      console.error('Error checking email:', error);
      return false; // On error, allow the form to proceed
    }
  }, []);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const validateForm = useCallback(async () => {
    const newErrors = {};

    // Required fields
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.userType) newErrors.userType = "User type is required";
    if (!formData.contactNumber.trim())
      newErrors.contactNumber = "Contact number is required";
    if (!formData.birthdate) newErrors.birthdate = "Birthdate is required";

    // Terms acceptance validation
    if (!hasAcceptedTerms || !hasAcceptedPrivacy) {
      newErrors.terms =
        "You must accept the Terms and Privacy Agreement to proceed";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (formData.email && emailRegex.test(formData.email)) {
      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        newErrors.email = "An account with this email address already exists";
      }
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

      if (
        age < 18 ||
        (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))
      ) {
        newErrors.birthdate = "You must be at least 18 years old to register";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, hasAcceptedTerms, hasAcceptedPrivacy, checkEmailExists]);

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
    setHasAcceptedPrivacy(false);
  }, []);

  // Main form submission handler
  // Updated handleSubmit function for your RegistrationForm component

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    const isValid = await validateForm();
    if (!isValid) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Step 1: Create the user account
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
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        },
      });

      if (authError) throw authError;

      // Step 2: Insert user data into appropriate table based on user type
      if (authData.user) {
        const userData = {
          med_id: authData.user.id, // Use auth user ID as foreign key
          first_name: formData.firstName,
          last_name: formData.lastName,
          user_type: formData.userType,
          birthdate: formData.birthdate,
          contact_no: formData.contactNumber,
          email: formData.email,
          status: 'active' // or whatever default status you want
        };

        let insertError;

        if (formData.userType === 'patient') {
          // Insert into patients table
          const { error } = await supabase
            .from('patients')
            .insert([{
              patient_id: authData.user.id, // Use auth user ID as patient_id
              first_name: formData.firstName,
              last_name: formData.lastName,
              user_type: formData.userType,
              birthdate: formData.birthdate,
              contact_no: formData.contactNumber,
              email: formData.email,
              status: 'active'
            }]);

          insertError = error;
        } else if (formData.userType === 'doctor') {
          // Insert into medicalprofessionals table
          const { error } = await supabase
            .from('medicalprofessionals')
            .insert([userData]);

          insertError = error;
        }

        if (insertError) {
          console.error('Database insertion error:', insertError);
          // If database insertion fails, we might want to clean up the auth user
          // but for now, we'll just log the error and continue
          throw new Error(`Failed to create user profile: ${insertError.message}`);
        }
      }

      setSuccessMessage(
        "Registration successful! Please check your email and click the confirmation link to activate your account."
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
  }, [formData, hasAcceptedTerms, hasAcceptedPrivacy, validateForm, resetForm]);

  const handleGoogleSignUp = useCallback(async () => {
    if (!hasAcceptedTerms) {
      setErrors({
        terms:
          "You must accept the Terms and Conditions before signing up with Google",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
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

  const handleAcceptTerms = useCallback(() => {
    setIsTermsModalOpen(false);
    setIsPrivacyModalOpen(true);
  }, []);

  // Privacy modal handlers
  const handleOpenPrivacyModal = useCallback(() => {
    setIsPrivacyModalOpen(true);
  }, []);

  const handleAcceptPrivacy = useCallback(() => {
    setHasAcceptedPrivacy(true);
    setIsPrivacyModalOpen(false);
    setHasAcceptedTerms(true); // This is your original flag for form validation
    setErrors((prev) => {
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
              className={`appearance-none w-full mb-1 p-2 bg-[#FFEDE7] border-none rounded-[15.5px] text-[#b0b0b0] ${errors.userType ? "ring-2 ring-red-400" : ""
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
                <path
                  d="M7 10l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
          className={`w-4/5 block mx-auto py-2 mt-8 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 ${isLoading
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
              checked={hasAcceptedTerms && hasAcceptedPrivacy}
              onChange={(e) => {
                if (!e.target.checked) {
                  setHasAcceptedTerms(false);
                  setHasAcceptedPrivacy(false);
                } else {
                  e.target.checked = false;
                  setIsTermsModalOpen(true);
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
                <button
                  type="button"
                  onClick={handleOpenPrivacyModal}
                  className="underline hover:text-white transition-colors duration-200"
                  disabled={isLoading}
                >
                  Privacy Agreement
                </button>
                .
              </label>
            </div>
          </div>
          {errors.terms && (
            <p className="mt-1 text-sm text-[#F5E0D9]">{errors.terms}</p>
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

      {/* Terms and Conditions Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={handleAcceptTerms}
      />

      {/* Privacy Agreement Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onAccept={handleAcceptPrivacy}
      />
    </>
  );
}