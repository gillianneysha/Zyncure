import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import { Eye, EyeOff } from "lucide-react";
import PasswordInput from "../components/PasswordInput";
import GoogleIcon from "../components/GoogleIcon";

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
      <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
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

  // Regular email/password login
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setMfaError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("mfa")) {
          // Handle MFA challenge
          setMfaChallenge(error.mfa_challenge);
          return;
        }
        throw error;
      }

      // Login successful
      setToken(data.session);
      const redirectPath = getRedirectPath(data.user);
      navigate(redirectPath);

    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        submit: error.message || "Login failed. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      setErrors({ email: "Please enter your email address first" });
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
      setToken(data.session);
      const redirectPath = getRedirectPath(data.user);
      navigate(redirectPath);

    } catch (error) {
      console.error("MFA verification error:", error);
      setMfaError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={mfaChallenge ? handleMfaSubmit : handleSubmit}>
        {/* Error Message */}
        {errors.submit && (
          <div className="w-4/5 mx-auto mb-4 p-3 bg-red-200 border border-red-400 text-red-800 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        {/* MFA Challenge Form */}
        {mfaChallenge && (
          <div className="w-4/5 mx-auto mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Two-Factor Authentication</h3>
            <p className="text-sm text-blue-600 mb-3">
              Please enter the verification code from your authenticator app.
            </p>
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full p-2 border border-blue-300 rounded-lg mb-2"
              maxLength="6"
              disabled={isLoading}
            />
            {mfaError && (
              <p className="text-sm text-red-600 mb-2">{mfaError}</p>
            )}
          </div>
        )}

        {/* Regular Login Form */}
        {!mfaChallenge && (
          <>
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
          </>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-4/5 block mx-auto py-2 mt-4 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 ${isLoading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-[#55A1A4] hover:bg-[#368487]"
            }`}
        >
          {isLoading ? "Logging in..." : (mfaChallenge ? "Verify Code" : "Log In")}
        </button>

        {!mfaChallenge && (
          <>
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
          </>
        )}
      </form>
    </>
  );
}