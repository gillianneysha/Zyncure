import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";
import PasswordSuccessModal from "../components/PasswordSuccessModal";
import { Eye, EyeClosed } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [noSession, setNoSession] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setNoSession(true);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      setSubmitting(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setSubmitting(false);
      } else {
        setSubmitting(false);
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError("Something went wrong. Please try the reset link again.");
      setSubmitting(false);
    }
  };

  if (noSession) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "url('/zyncure_splash_screen_bg.png') center/cover no-repeat",
        }}
      >
        <div className="bg-white bg-opacity-90 rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-[#F46B5D]">Reset Password</h2>
          <div className="mb-3 text-red-500">
            Reset link expired or invalid. Please request a new password reset.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PasswordSuccessModal
        open={showSuccessModal}
        onClose={async () => {
          setShowSuccessModal(false);
          await supabase.auth.signOut();
          navigate("/login");
        }}
        title="Password Updated Successfully!"
        message="You may now log in with your new password."
        buttonText="Got it"
      />
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background: "url('/zyncure_splash_screen_bg.png') center/cover no-repeat",
        }}
      >
        <img
          src="/zyncure_logo.png"
          alt="ZynCure Logo"
          className="block mb-5 w-52 h-auto"
          draggable={false}
        />
        <div className="max-w-[600px] w-[500px] p-6 rounded-[24px] bg-gradient-to-b from-[#FB8F67] to-[#F15629] shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">Reset Password</h2>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="w-4/5 mx-auto mb-4 p-3 bg-red-200 border border-red-400 text-red-800 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            <div className="mb-3 relative">
              <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
                New Password:
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                className="w-4/5 block mx-auto mb-1 p-2 bg-[#FFEDE7] border-none rounded-[15.5px] h-10 text-base placeholder:text-sm pr-10"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={submitting || showSuccessModal}
                required
                style={{ fontSize: "1rem" }}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-[12%] top-12 -translate-y-1/2 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                style={{ background: "transparent" }}
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 text-[#F46B5D]" />
                ) : (
                  <EyeClosed className="w-5 h-5 text-[#F46B5D]" />
                )}
              </button>
            </div>
            <div className="mb-3 relative">
              <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
                Confirm New Password:
              </label>
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm New Password"
                className="w-4/5 block mx-auto mb-1 p-2 bg-[#FFEDE7] border-none rounded-[15.5px] h-10 text-base placeholder:text-sm pr-10"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                disabled={submitting || showSuccessModal}
                required
                style={{ fontSize: "1rem" }}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-[12%] top-12 -translate-y-1/2 focus:outline-none"
                onClick={() => setShowConfirm((v) => !v)}
                style={{ background: "transparent" }}
              >
                {showConfirm ? (
                  <Eye className="w-5 h-5 text-[#F46B5D]" />
                ) : (
                  <EyeClosed className="w-5 h-5 text-[#F46B5D]" />
                )}
              </button>
            </div>
            <button
              type="submit"
              className={`w-4/5 block mx-auto py-2 mt-6 mb-6 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 ${
                submitting || showSuccessModal
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#55A1A4] hover:bg-[#368487]"
              }`}
              disabled={submitting || showSuccessModal}
            >
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}