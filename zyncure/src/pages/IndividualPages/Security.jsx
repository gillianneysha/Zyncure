import { ChevronRight, ArrowLeft, LockKeyhole } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../client";
import PasswordInput from "../../components/PasswordInput";
import PasswordSuccessModal from "../../components/PasswordSuccessModal";

export default function SecurityPage() {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // For change password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Check 2FA status from user metadata
        setTwoFactorEnabled(user.user_metadata?.two_factor_enabled || false);
      }
    };
    getUser();
  }, []);

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

  // Toggle 2FA setting - Store in user metadata
  const handleToggle2FA = async () => {
    if (!user) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const newStatus = !twoFactorEnabled;

      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          two_factor_enabled: newStatus
        }
      });

      if (error) throw error;

      setTwoFactorEnabled(newStatus);
      setUser(data.user);
      setSuccess(
        newStatus
          ? "Two-factor authentication has been enabled. You'll receive a verification link via email when logging in."
          : "Two-factor authentication has been disabled."
      );
    } catch (err) {
      setError(err.message || "Failed to update 2FA setting.");
    } finally {
      setLoading(false);
    }
  };

  // Modal close handler
  const handleModalClose = () => {
    setShowSuccessModal(false);
    setShowChangePassword(false);
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
          <div className="rounded-xl bg-profileBg w-full transition-all duration-300 -mt-3 p-2">
            {error && <div className="text-red-500 mb-4 p-3 bg-red-100 rounded">{error}</div>}
            {success && (
              <div className="text-green-600 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-semibold text-green-800 mb-2">✅ {success}</div>
                <div className="text-sm text-green-700">
                  <strong>What happens next:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>When you log in, you'll enter your password first</li>
                    <li>Then you'll receive a verification link via email</li>
                    <li>Click the link to complete your login</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-profileHeader mb-4">Email-based Two-factor authentication</h3>
              <p className="text-mySidebar mb-4">
                When enabled, you'll receive a verification link via email each time you log in.
                This adds an extra layer of security to your account.
              </p>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="font-medium text-profileHeader">Two-Factor Authentication</span>
                  <span className="text-sm text-mySidebar">
                    {twoFactorEnabled ? "Enabled - Email verification required on login" : "Disabled - Only password required"}
                  </span>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFactorEnabled ? 'bg-[#55A1A4]' : 'bg-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>

            {twoFactorEnabled && (
              <div className="p-4 bg-green-100 rounded-lg">
                <div className="text-green-700 font-semibold mb-2">
                  ✅ Two-factor authentication is enabled
                </div>
                <p className="text-green-600 text-sm">
                  Your account is now protected with email-based two-factor authentication.
                  You'll receive a verification link via email when logging in.
                </p>
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

      <PasswordSuccessModal
        open={showSuccessModal}
        onClose={handleModalClose}
      />
    </div>
  );
}