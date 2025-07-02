import { ChevronRight, ArrowLeft, LockKeyhole } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../client";
import PasswordInput from "../../components/PasswordInput";
import PasswordSuccessModal from "../../components/PasswordSuccessModal";

export default function SecurityPage() {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [enrollmentFactor, setEnrollmentFactor] = useState(null);

  // For change password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (signInError) {
        setError("Old password is incorrect.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setShowSuccessModal(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  // Improved cleanup function with more thorough error handling
  const cleanupAbandonedEnrollments = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        console.error("Error listing factors:", error);
        throw error;
      }
      const factors = data?.factors || [];
      const unverifiedFactors = factors.filter(f => f.status === "unverified");
      for (const factor of unverifiedFactors) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (factorError) {
          // Continue with other factors
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error("Error in cleanupAbandonedEnrollments:", err);
      throw err;
    }
  };

  const handleEnable2FA = async () => {
    setError("");
    setSuccess("");
    setEnrolling(true);

    try {
      const { data: initialCheck, error: checkError } = await supabase.auth.mfa.listFactors();
      if (checkError) throw new Error(`Failed to check existing factors: ${checkError.message}`);

      const existingVerified = initialCheck?.factors?.find(f =>
        f.factor_type === "totp" && f.status === "verified"
      );

      if (existingVerified) {
        setError("Two-factor authentication is already enabled for this account.");
        setEnrolling(false);
        setTwoFactorEnabled(true);
        return;
      }

      await cleanupAbandonedEnrollments();

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App"
      });

      if (error) {
        if (error.message?.includes("factor already exists")) {
          setError("A pending enrollment already exists. Please try again in a moment.");
        } else if (error.message?.includes("too many factors")) {
          setError("Maximum number of factors reached. Please contact support.");
        } else {
          setError(`Enrollment failed: ${error.message}`);
        }
        setEnrolling(false);
        return;
      }

      if (!data || !data.totp || !data.totp.qr_code) {
        setError("Invalid enrollment response. Please try again.");
        setEnrolling(false);
        return;
      }

      setQrUrl(data.totp.qr_code);
      setEnrollmentFactor(data);

    } catch (err) {
      setError(err.message || "Failed to start 2FA enrollment. Please try again.");
      setEnrolling(false);
    }
  };

  const handleVerify2FA = async () => {
    setError("");
    setSuccess("");
    if (!verificationCode.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    if (!enrollmentFactor) {
      setError("No enrollment factor found. Please try again.");
      return;
    }
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrollmentFactor.id,
        code: verificationCode,
      });

      if (error) {
        setError(`Verification failed: ${error.message}`);
        return;
      }

      setSuccess("Two-factor authentication enabled successfully!");
      setTwoFactorEnabled(true);
      setEnrolling(false);
      setQrUrl("");
      setVerificationCode("");
      setEnrollmentFactor(null);

      await check2FA();
    } catch (err) {
      setError(err.message || "Failed to verify code.");
    }
  };

  const handleDisable2FA = async () => {
    setError("");
    setSuccess("");
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
        return;
      }

      const factors = data?.factors || [];
      const totpFactor = factors.find(f => f.factor_type === "totp" && f.status === "verified");

      if (!totpFactor) {
        setError("No active TOTP factor found.");
        return;
      }

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id
      });

      if (unenrollError) {
        setError(unenrollError.message);
        return;
      }

      setSuccess("Two-factor authentication disabled successfully.");
      setTwoFactorEnabled(false);
    } catch (err) {
      setError(err.message || "Failed to disable 2FA.");
    }
  };

  // Modal close handler
  const handleModalClose = () => {
    setShowSuccessModal(false);
    setShowChangePassword(false);
  };

  // Check if user already has TOTP enabled
  const check2FA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return;
      const factors = data?.factors || [];
      const totpFactor = factors.find(f => f.factor_type === "totp" && f.status === "verified");
      setTwoFactorEnabled(!!totpFactor);
    } catch (err) { }
  };

  useEffect(() => {
    if (showTwoFactor) {
      check2FA();
    }
    // eslint-disable-next-line
  }, [showTwoFactor]);

  const handleCancelEnrollment = async () => {
    setError("");
    if (enrollmentFactor) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollmentFactor.id });
      } catch (err) { }
    }
    setEnrolling(false);
    setQrUrl("");
    setVerificationCode("");
    setEnrollmentFactor(null);
    setSuccess("");
  };

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px] flex flex-col relative">
      {showChangePassword && (
        <div>
          <button
            onClick={() => setShowChangePassword(false)}
            className="flex items-center text-mySidebar mb-6 hover:underline w-fit"
          >
            <ArrowLeft className="mr-2" size={20} /> Back to Security
          </button>
          <h2 className="text-4xl text-profileHeader font-bold mb-2">Change Password</h2>
          <form className="flex flex-col gap-2 w-full" onSubmit={handleChangePassword}>
            {error && <div className="text-red-500">{error}</div>}
            {success && <div className="text-green-600">{success}</div>}
            <div className="mt-4">
              <PasswordInput
                label="Old Password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Old Password"
                disabled={loading}
                name="oldPassword"
                inputClassName="mb-0.5 w-full"
              />
            </div>
            <PasswordInput
              label="New Password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New Password"
              disabled={loading}
              name="newPassword"
              inputClassName="mb-0.5 w-full"
            />
            <PasswordInput
              label="Re-enter New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter New Password"
              disabled={loading}
              name="confirmPassword"
              inputClassName="mb-0.5 w-full"
            />
            <div className="flex justify-center mt-4">
              <button
                type="submit"
                className="bg-[#55A1A4] text-white px-8 py-2 rounded-xl font-semibold text-lg hover:bg-[#368487] transition"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showTwoFactor && (
        <div>
          <button
            onClick={() => setShowTwoFactor(false)}
            className="flex items-center text-mySidebar mb-6 hover:underline w-fit"
          >
            <ArrowLeft className="mr-2" size={20} /> Back to Security
          </button>
          <h2 className="text-4xl text-profileHeader font-bold mb-8">Two-factor Authentication</h2>
          <div className="border border-[#F46B5D] rounded-xl bg-profileBg w-full transition-all duration-300 p-6">
            {error && <div className="text-red-500 mb-4 p-3 bg-red-100 rounded">{error}</div>}
            {success && (
              <div className="text-green-600 mb-4 p-3 bg-green-100 rounded">
                {success}
                <br />
                Next time you log in, you will be asked for a code from your authenticator app.
              </div>
            )}

            {!twoFactorEnabled && !enrolling && (
              <div>
                <p className="text-mySidebar mb-4">
                  Two-factor authentication adds an extra layer of security to your account.
                  You'll need an authenticator app like Google Authenticator or Authy.
                </p>
                <button
                  className="bg-[#55A1A4] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#368487] transition"
                  onClick={handleEnable2FA}
                >
                  Enable 2FA (TOTP)
                </button>
              </div>
            )}

            {enrolling && qrUrl && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-profileHeader mb-2">Step 1: Scan QR Code</h3>
                  <p className="text-mySidebar mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                  </p>
                  <div className="flex justify-center mb-4">
                    <img src={qrUrl} alt="2FA QR Code" width={200} height={200} className="border rounded" />
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-profileHeader mb-2">Step 2: Enter Verification Code</h3>
                  <p className="text-mySidebar mb-2">
                    Enter the 6-digit code from your authenticator app:
                  </p>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    className="border border-gray-300 p-3 rounded-lg mb-4 w-full max-w-xs"
                    maxLength={6}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    className="bg-[#55A1A4] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#368487] transition"
                    onClick={handleVerify2FA}
                  >
                    Verify & Enable
                  </button>
                  <button
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
                    onClick={handleCancelEnrollment}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {twoFactorEnabled && !enrolling && (
              <div>
                <div className="mb-6 p-4 bg-green-100 rounded-lg">
                  <div className="text-green-700 font-semibold mb-2">
                    ✅ Two-factor authentication is enabled for your account.
                  </div>
                  <p className="text-green-600 text-sm">
                    Your account is now protected with an additional security layer.
                    You'll need to enter a code from your authenticator app when logging in.
                  </p>
                </div>
                <button
                  className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition"
                  onClick={handleDisable2FA}
                >
                  Disable 2FA
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!showChangePassword && !showTwoFactor && (
        <div>
          <div className="mb-6">
            <h2 className="text-4xl text-profileHeader font-bold flex items-center gap-3">
              <LockKeyhole className="w-9 h-9 text-profileHeader" />
              Security
            </h2>
            <p className="text-zyncureOrange text-left mt-3">
              Manage account password and login preferences.
            </p>
          </div>
          <div className="mt-8">
            <div
              className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-200 transition-colors"
              onClick={() => setShowChangePassword(true)}
            >
              <span className="text-mySidebar">Change password</span>
              <ChevronRight className="text-mySidebar" size={20} />
            </div>
            <div
              className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-200 transition-colors"
              onClick={() => setShowTwoFactor(true)}
            >
              <div className="flex flex-col">
                <span className="text-mySidebar">Two-factor authentication</span>
                {twoFactorEnabled && (
                  <span className="text-green-600 text-sm">✅ Enabled</span>
                )}
              </div>
              <ChevronRight className="text-mySidebar" size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Make sure modal is always rendered at this level, not just inside the showChangePassword block */}
      <PasswordSuccessModal
        open={showSuccessModal}
        onClose={handleModalClose}
      />
    </div>
  );
}