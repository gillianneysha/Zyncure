import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import { Eye, EyeOff } from "lucide-react";
import PasswordInput from "../components/PasswordInput";
import GoogleIcon from "../components/GoogleIcon";
import OTPModal from "../components/OTPModal";

const REQUEST_OTP_URL = "https://vneigpczfmvwlfcvdgtl.supabase.co/functions/v1/request-otp";
const VERIFY_OTP_URL = "https://vneigpczfmvwlfcvdgtl.supabase.co/functions/v1/verify-otp";

const FormField = React.memo(({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  value,
  onChange,
  error,
  disabled,
  labelClassName = "text-[#F5E0D9]",
  inputClassName = "bg-[#FFEDE7]"
}) => (
  <div className="mb-3">
    <label className={`block w-4/5 mx-auto mb-1 ${labelClassName} text-left`}>
      {label}:
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-4/5 block mx-auto mb-1 p-2 ${inputClassName} border-none rounded-[15.5px] ${error ? "ring-2 ring-red-400" : ""
        }`}
      required={required}
      disabled={disabled}
    />
    {error && (
      <p className="w-4/5 mx-auto mb-2 text-sm" style={{ color: "#F5E0D9" }}>
        {error}
      </p>
    )}
  </div>
));

export default function LoginForm({ setToken }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  // OTP states
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Simple redirect based on user metadata - useUser hook will handle role detection
  const getRedirectPath = (user) => {
    // Check user metadata for medical professional
    const userRole = user.user_metadata?.user_type;

    if (userRole === "doctor") {
      return "/doctor";
    }

    // Default to home - the router will redirect admins appropriately
    return "/home";
  };

  // --- OTP login logic ---
  const handleOtpChange = (e) => setOtpCode(e.target.value);

  // Step 1: Request OTP
  const handleOtpRequest = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    setMfaError("");
    try {
      const res = await fetch(REQUEST_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to request OTP");
      setShowOtpForm(true);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    try {
      const res = await fetch(VERIFY_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp_code: otpCode }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "OTP verification failed");
      if (result.success) {
        // Sign in again to get a session
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) {
          setErrors({ otp: "Login failed after OTP verification. Please try again." });
          return;
        }
        setToken(data.session);
        navigate("/home");
        return;
      }

      navigate("/home");
    } catch (err) {
      setErrors({ otp: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Google login and MFA logic remain unchanged ---
  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrors({});

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google sign in error:", error);
      setErrors({
        submit: "Google sign in failed. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ email: "Please enter your email address first." });
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      alert("Password reset email sent! Please check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      setErrors({
        submit: "Failed to send password reset email. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle MFA code submission
  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    setMfaError("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode,
      });

      if (error) {
        setMfaError("Invalid code. Please try again.");
        return;
      }

      // MFA verification successful
      setToken(data);
      const redirectPath = getRedirectPath(data.user);
      navigate(redirectPath);

    } catch (error) {
      console.error("MFA verification error:", error);
      setMfaError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function inside your LoginForm component:
  const handleResendOtp = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const res = await fetch(REQUEST_OTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to resend OTP");
      // Optionally show a message: "OTP resent!"
    } catch (err) {
      setErrors({ otp: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={showOtpForm ? handleOtpSubmit : (mfaChallenge ? handleMfaSubmit : handleOtpRequest)}>
        {/* Error Message */}
        {errors.submit && (
          <div className="w-4/5 mx-auto mb-4 p-3 bg-red-200 border border-red-400 text-red-800 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

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

        <div className="w-4/5 mx-auto flex items-center justify-between mb-4">
          <div />
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-xs text-[#F5E0D9] hover:underline bg-transparent border-none cursor-pointer"
            disabled={isLoading}
          >
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-4/5 block mx-auto py-2 mt-4 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 ${isLoading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-[#55A1A4] hover:bg-[#368487]"
            }`}
        >
          {isLoading ? "Sending OTP..." : "Log In"}
        </button>

        <div className="w-4/5 mx-auto mt-2 text-left">
          <span className="text-[#F5E0D9] text-sm">
            Don't have an account?{" "}
            <a
              href="/register"
              className="font-bold text-[#F5E0D9] hover:underline bg-transparent border-none cursor-pointer"
            >
              Register Here
            </a>
          </span>
        </div>

        <div className="w-4/5 mx-auto text-[#F5E0D9] text-xs text-center mt-6">
          <div className="flex items-center justify-center my-4">
            <div className="flex-grow h-px bg-[#FEDED2]"></div>
            <span className="px-2">OR</span>
            <div className="flex-grow h-px bg-[#FEDED2]"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-[#FFEDE7] shadow-lg transition-transform duration-200 hover:scale-95 active:scale-95 hover:shadow-xl ring-2 ring-[#F46B5D] ring-opacity-0 hover:ring-opacity-100 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Sign in with Google"
            disabled={isLoading}
          >
            <GoogleIcon className="w-10 h-10" />
          </button>
          <p className="mt-2">Log in using your Google account</p>
        </div>
      </form>
      <OTPModal
        open={showOtpForm}
        otpCode={otpCode}
        onChange={handleOtpChange}
        onSubmit={handleOtpSubmit}
        onClose={() => {
          setShowOtpForm(false);
          setOtpCode("");
        }}
        error={errors.otp}
        loading={isLoading}
        onResend={handleResendOtp}
      />
    </>
  );
}