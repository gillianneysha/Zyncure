import { ChevronRight, ArrowLeft } from "lucide-react";
import { useState} from "react";
import { supabase } from "../../client";
import PasswordInput from "../../components/PasswordInput";
import PasswordSuccessModal from "../../components/PasswordSuccessModal";


export default function SecurityPage() {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // For change password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // const [showOldPassword, setShowOldPassword] = useState(false);
  // const [showNewPassword, setShowNewPassword] = useState(false);
  // const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (showChangePassword) {
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

    const handleModalClose = () => {
      setShowSuccessModal(false);

      setShowChangePassword(false);
    };

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

    const Toggle = ({ enabled, onChange }) => (
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${enabled ? "bg-profileHeader" : "bg-mySidebar"}`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    );

    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] flex flex-col">
        <button
          onClick={() => setShowTwoFactor(false)}
          className="flex items-center text-mySidebar mb-6 hover:underline w-fit"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Security
        </button>
        <h2 className="text-4xl text-profileHeader font-bold mb-8">Two-factor Authentication</h2>
        <div className="border border-[#F46B5D] rounded-xl bg-profileBg w-full transition-all duration-300">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <div>
              <span className="block text-[#F46B5D] font-semibold text-base mb-1">
                Enable Two-factor Authentication
              </span>
              <span className="block text-[#F46B5D] text-sm mb-1">
                m*****@gmail.com
              </span>
            </div>
            <Toggle enabled={twoFactorEnabled} onChange={setTwoFactorEnabled} />
          </div>
          <div className="border-t border-[#F46B5D] px-6 py-4">
            <button
              type="button"
              className="text-profileHeader font-semibold underline hover:text-[#368487] transition text-base"
            >
              Use a different email address
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Security Page ---
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Security</h2>
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
