import React, { useCallback, useState, memo } from "react";
import { supabase } from "../client";
import PasswordInput from "../components/PasswordInput";


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
  disabled
}) => (
  <div className="mb-3">
    <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
      {label}:
    </label>
    {children || (
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] ${
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
  }, [formData]);

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
  }, []);


const handleSubmit = useCallback(async (event) => {
  event.preventDefault();

  if (!validateForm()) return;

  setIsLoading(true);
  setErrors({});
  setSuccessMessage("");

  try {
    
    const { error: authError } = await supabase.auth.signUp({
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

 
    setSuccessMessage(
      "Registration successful! Please check your email and click the confirmation link to activate your account."
    );
    resetForm();

  } catch (error) {
    console.error("Registration error:", error);
    setErrors({
      submit: error.message || "Registration failed. Please try again.",
    });
  } finally {
    setIsLoading(false);
  }
}, [formData, validateForm, resetForm]);

  const handleGoogleSignUp = useCallback(async () => {
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
  }, []);

  return (
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
      />

      <FormField 
        label="Last Name" 
        name="lastName" 
        placeholder="Last Name"
        value={formData.lastName}
        onChange={handleChange}
        error={errors.lastName}
        disabled={isLoading}
      />

      <FormField 
        label="Contact Number" 
        name="contactNumber" 
        placeholder="Contact Number"
        value={formData.contactNumber}
        onChange={handleChange}
        error={errors.contactNumber}
        disabled={isLoading}
      />

      <FormField 
        label="Birthdate" 
        name="birthdate" 
        type="date"
        value={formData.birthdate}
        onChange={handleChange}
        error={errors.birthdate}
        disabled={isLoading}
      />

      <FormField 
        label="User Type" 
        name="userType"
        value={formData.userType}
        onChange={handleChange}
        error={errors.userType}
        disabled={isLoading}
      >
        <div className="relative w-4/5 mx-auto">
          <select
            name="userType"
            value={formData.userType}
            onChange={handleChange}
            className={`appearance-none w-full mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] text-[#b0b0b0] ${
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
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      />

      <div className="w-4/5 mx-auto">
        <PasswordInput
          label="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password (min 6 characters)"
          error={errors.password}
          disabled={isLoading}
        />
      </div>

      <div className="w-4/5 mx-auto">
        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm Password"
          error={errors.confirmPassword}
          disabled={isLoading}
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

      <div className="mt-2 w-4/5 mx-auto text-[#F5E0D9] text-xs text-left">
        By creating an account, you agree to our{" "}
        <span className="underline cursor-pointer">Terms</span> and have read and acknowledge
        the <span className="underline cursor-pointer">Privacy Agreement</span>.
      </div>

      <div className="w-full flex items-center justify-center mt-8 mb-8">
        <span className="flex-1 h-px bg-[#FEDED2] mx-2"></span>
        <span className="text-[#F5E0D9] text-base font-semibold px-4">OR</span>
        <span className="flex-1 h-px bg-[#FEDED2] mx-2"></span>
      </div>

      <div className="flex flex-col items-center mb-8">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#FFEDE7] shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Sign up with Google"
          disabled={isLoading}
        >
          <span className="text-2xl">G</span>
        </button>
        <span className="mt-3 text-[#F5E0D9] text-sm">
          Sign up using your Google account
        </span>
      </div>
    </form>
  );
}