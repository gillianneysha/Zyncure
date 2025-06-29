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

  // Two-factor authentication handlers
  const handleEnable2FA = async () => {
    setError("");
    setSuccess("");
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      setError(error.message);
      setEnrolling(false);
      return;
    }
    setQrUrl(data.totp.qr_code);
  };

  const handleVerify2FA = async () => {
    setError("");
    setSuccess("");
    const { error } = await supabase.auth.mfa.verify({
      factorType: "totp",
      code: verificationCode,
    });
    if (error) {
      setError("Invalid code. Please try again.");
      return;
    }
    setSuccess("Two-factor authentication enabled!");
    setTwoFactorEnabled(true);
    setEnrolling(false);
    setQrUrl("");
    setVerificationCode("");
  };

  const handleDisable2FA = async () => {
    setError("");
    setSuccess("");
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setError(error.message);
      return;
    }
    const factors = data?.factors || [];
    const totpFactor = factors.find(f => f.factor_type === "totp");
    if (!totpFactor) {
      setError("No TOTP factor found.");
      return;
    }
    await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
    setSuccess("Two-factor authentication disabled.");
    setTwoFactorEnabled(false);
  };

  // Modal close handler
  const handleModalClose = () => {
    setShowSuccessModal(false);
    setShowChangePassword(false);
  };

  useEffect(() => {
    // Check if user already has TOTP enabled
    const check2FA = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return; // handle error if needed
      const factors = data?.factors || [];
      const totpFactor = factors.find(f => f.factor_type === "totp");
      setTwoFactorEnabled(!!totpFactor);
    };
    if (showTwoFactor) check2FA();
  }, [showTwoFactor]);

  // UI
  if (showChangePassword) {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] flex flex-col">
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
        <PasswordSuccessModal
          open={showSuccessModal}
          onClose={handleModalClose}
        />
      </div>
    );
  }

  if (showTwoFactor) {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] flex flex-col">
        <button
          onClick={() => setShowTwoFactor(false)}
          className="flex items-center text-mySidebar mb-6 hover:underline w-fit"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Security
        </button>
        <h2 className="text-4xl text-profileHeader font-bold mb-8">Two-factor Authentication</h2>
        <div className="border border-[#F46B5D] rounded-xl bg-profileBg w-full transition-all duration-300 p-6">
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {success && (
            <div className="text-green-600 mb-2">
              {success}
              <br />
              Next time you log in, you will be asked for a code from your authenticator app.
            </div>
          )}
          {!twoFactorEnabled && !enrolling && (
            <button
              className="bg-[#55A1A4] text-white px-4 py-2 rounded"
              onClick={handleEnable2FA}
            >
              Enable 2FA (TOTP)
            </button>
          )}

          {enrolling && qrUrl && (
            <div>
              <div className="mb-4">
                <p>Scan this QR code with your authenticator app:</p>
                <img src={qrUrl} alt="2FA QR Code" width={180} height={180} />
              </div>
              <input
                type="text"
                placeholder="Enter code from app"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                className="border p-2 rounded mb-2"
              />
              <button
                className="bg-[#55A1A4] text-white px-4 py-2 rounded ml-2"
                onClick={handleVerify2FA}
              >
                Verify & Enable
              </button>
            </div>
          )}

          {twoFactorEnabled && !enrolling && (
            <div>
              <div className="mb-4 text-green-700 font-semibold">
                Two-factor authentication is enabled for your account.
              </div>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={handleDisable2FA}
              >
                Disable 2FA
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Main Security Page ---
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
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
          <span className="text-mySidebar">Two-factor authentication</span>
          <ChevronRight className="text-mySidebar" size={20} />
        </div>
      </div>
    </div>
  );
}
