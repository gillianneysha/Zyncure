import { PencilIcon, ChevronRight, ArrowLeft, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../client";
import PasswordInput from "./PasswordInput";
import PasswordSuccessModal from "./PasswordSuccessModal";
import PersonalInfoSuccessModal from "./PersonalInfoSuccessModal";


export function PersonalInfoForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    birthdate: "",
    mobileNumber: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [originalData, setOriginalData] = useState(null); 

  
  useEffect(() => {
    async function fetchUserInfo() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
  
      let profile = {};
      let { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) {
        profile = profileData;
      } else {
        profile = user.user_metadata || {};
      }
      setFormData({
        firstName: profile.first_name || "",
        middleName: profile.middle_name || "",
        lastName: profile.last_name || "",
        email: user.email || "",
        birthdate: profile.birthdate || "",
        mobileNumber: profile.contact_number || "",
      });
      setOriginalData({
        firstName: profile.first_name || "",
        middleName: profile.middle_name || "",
        lastName: profile.last_name || "",
        email: user.email || "",
        birthdate: profile.birthdate || "",
        mobileNumber: profile.contact_number || "",
      }); // <-- Add this
      setLoading(false);
    }
    fetchUserInfo();
  }, []);

 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

 
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        birthdate: formData.birthdate,
        contact_number: formData.mobileNumber,
        updated_at: new Date().toISOString(),
      });
    if (updateError) {
      setError("Failed to save changes.");
    } else {
      setSuccess("");
      setShowSuccessModal(true); 
      setIsEditing(false);
    }
    setSaving(false);
  };

  const isChanged = originalData
    ? Object.keys(formData).some(
        (key) => formData[key] !== originalData[key]
      )
    : false;

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">
          Personal Information
        </h2>
        <button
          className={`
            transition-all duration-300
            p-2 rounded-xl
            ${isEditing
              ? "bg-[#55A1A4]/10 border border-[#55A1A4] text-[#55A1A4] scale-110 shadow"
              : "hover:bg-[#55A1A4]/10 hover:border hover:border-[#55A1A4] hover:text-[#55A1A4] text-mySidebar"
            }
          `}
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label="Edit Personal Information"
        >
          <PencilIcon size={20} />
        </button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <form className="space-y-4" onSubmit={handleSave}>
        <div>
          <label className="block text-mySidebar mb-1">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
            disabled={!isEditing || loading || saving}
          />
        </div>
        <div>
          <label className="block text-mySidebar mb-1">Middle Name</label>
          <input
            type="text"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
            disabled={!isEditing || loading || saving}
          />
        </div>
        <div>
          <label className="block text-mySidebar mb-1">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
            disabled={!isEditing || loading || saving}
          />
        </div>
        <div>
          <label className="block text-mySidebar mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-mySidebar mb-1">Birthdate</label>
            <input
              type="date"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleChange}
              className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
              disabled={!isEditing || loading || saving}
            />
          </div>
          <div className="flex-1">
            <label className="block text-mySidebar mb-1">Mobile Number</label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
              disabled={!isEditing || loading || saving}
            />
          </div>
        </div>
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            className={`bg-[#55A1A4] text-white px-8 py-2 rounded-xl font-semibold text-lg hover:bg-[#368487] transition ${
              (!isEditing || loading || saving || !isChanged) ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!isEditing || loading || saving || !isChanged}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
      <PersonalInfoSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}

export function SecurityPage() {
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
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${enabled ? "bg-profileHeader" : "bg-gray-200"}`}
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

export function NotificationPage() {

  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [reminderPush, setReminderPush] = useState(true);
  const [reminderEmail, setReminderEmail] = useState(true);

  const [eventNotifications, setEventNotifications] = useState(true);
  const [eventPush, setEventPush] = useState(true);
  const [eventEmail, setEventEmail] = useState(true);

  
  const Toggle = ({ enabled, onChange }) => {
    return (
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${enabled ? "bg-profileHeader" : "bg-gray-200"
          }`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? "translate-x-6" : "translate-x-1"
            }`}
        />
      </button>
    );
  };

  
  const NotificationCategory = ({
    title,
    description,
    mainEnabled,
    setMainEnabled,
    pushEnabled,
    setPushEnabled,
    emailEnabled,
    setEmailEnabled
  }) => {
    return (
      <div className="mb-8 ">
        <div className="text-profileText font-bold text-lg">{title}</div>
        <div className="text-profileSubtext text-base mb-2">Manage {description} notifications.</div>

        <div className="bg-profileBg rounded-lg p-4 border border-mySidebar">
          <div className="flex justify-between items-center py-2">
            <span className="text-mySidebar">Allow reminder notifications</span>
            <Toggle enabled={mainEnabled} onChange={setMainEnabled} />
          </div>

          <div className="flex justify-between items-center py-2 ">
            <span className="text-mySidebar">Push</span>
            <Toggle
              enabled={mainEnabled && pushEnabled}
              onChange={setPushEnabled}
            />
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-mySidebar">Email</span>
            <Toggle
              enabled={mainEnabled && emailEnabled}
              onChange={setEmailEnabled}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px] overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Notifications</h2>
      </div>

      <NotificationCategory
        title="Reminders"
        description="reminders"
        mainEnabled={reminderNotifications}
        setMainEnabled={setReminderNotifications}
        pushEnabled={reminderPush}
        setPushEnabled={setReminderPush}
        emailEnabled={reminderEmail}
        setEmailEnabled={setReminderEmail}
      />

      <NotificationCategory
        title="Events"
        description="events"
        mainEnabled={eventNotifications}
        setMainEnabled={setEventNotifications}
        pushEnabled={eventPush}
        setPushEnabled={setEventPush}
        emailEnabled={eventEmail}
        setEmailEnabled={setEventEmail}
      />
    </div>
  );
}

export function BillingPage() {
  const [showPlans, setShowPlans] = useState(false);
  const [selectedTier, setSelectedTier] = useState("");
  const [billingStep, setBillingStep] = useState("home");

  const handleOptionClick = (option) => {
    if (option === "Subscriptions") setShowPlans(true);
    else if (option === "Payment methods") setBillingStep("methods");
    else if (option === "Contact Information") {
      // Add logic for Contact Information if ever
    }
  };

  const SecurityOption = ({ title, onClick }) => (
    <div
      className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-200 transition-colors"
      onClick={() => onClick(title)}
    >
      <span className="text-mySidebar">{title}</span>
      <ChevronRight className="text-mySidebar" size={20} />
    </div>
  );

  if (showPlans) {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] overflow-y-auto">
        <button
          onClick={() => setShowPlans(false)}
          className="flex items-center text-mySidebar mb-6 hover:underline"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Billing
        </button>
        <h2 className="text-4xl text-[#55A1A4] font-bold mb-2">Upgrade to Premium</h2>
        <p className="text-[#55A1A4] mb-8">Enjoy an enhanced experience</p>
        <div className="flex gap-6">
          {/* Tier 1 */}
          <div className="bg-[#FFEDE7] rounded-2xl p-6 flex-1 relative">
            <h3 className="font-bold text-[#F46B5D] mb-2">
              Tier 1: Free <span className="font-normal text-sm">(Basic Access)</span>
            </h3>
            <ul className="text-[#F46B5D] text-sm space-y-2">
              <li>✓ View and manage personal health records.</li>
              <li>✓ Upload and store up to 2GB of medical files.</li>
              <li>✓ Share records with up to 3 healthcare providers.</li>
              <li>✓ Track up to 3 symptoms with the ability to add custom symptoms.</li>
              <li>✓ Basic notifications for upcoming medical appointments.</li>
              <li>✓ Access to a health dashboard.</li>
              <li>✓ Ability to export health records in a standard format (e.g., PDF).</li>
            </ul>
          </div>
          {/* Tier 2 */}
          <div className="bg-[#FFEDE7] rounded-2xl p-6 flex-1 relative">
            <input
              type="radio"
              name="subscriptionTier"
              value="premium"
              checked={selectedTier === "premium"}
              onChange={() => setSelectedTier("premium")}
              className="absolute top-6 right-6 w-5 h-5 accent-[#F46B5D] cursor-pointer"
              aria-label="Select Premium"
              style={{
                borderWidth: "1.5px",
                borderColor: "#F46B5D"
              }}
            />
            <h3 className="font-bold text-[#F46B5D] mb-2">
              Tier 2: Premium <span className="font-normal text-sm">(Enhanced Access)</span>
            </h3>
            <ul className="text-[#F46B5D] text-sm space-y-2">
              <li>✓ All features in the Free tier</li>
              <li>✓ Increased storage capacity up to 5GB.</li>
              <li>✓ Track all predefined symptoms and custom symptoms.</li>
              <li>✓ Share records with unlimited healthcare providers.</li>
            </ul>
          </div>
          {/* Tier 3 */}
          <div className="bg-[#FFEDE7] rounded-2xl p-6 flex-1 relative">
            <input
              type="radio"
              name="subscriptionTier"
              value="pro"
              checked={selectedTier === "pro"}
              onChange={() => setSelectedTier("pro")}
              className="absolute top-6 right-6 w-5 h-5 accent-[#F46B5D] cursor-pointer"
              aria-label="Select Pro"
              style={{
                borderWidth: "1.5px",
                borderColor: "#F46B5D"
              }}
            />
            <h3 className="font-bold text-[#F46B5D] mb-2">
              Tier 3: Pro <span className="font-normal text-sm">(Comprehensive Access)</span>
            </h3>
            <ul className="text-[#F46B5D] text-sm space-y-2">
              <li>✓ All features in the Premium tier</li>
              <li>✓ Priority support for technical issues</li>
              <li>✓ Early access to future feature expansions and integrations.</li>
              <li>✓ Unlimited storage for medical files.</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-center mt-8">
          <button
            className="bg-[#55A1A4] text-white px-10 py-2 rounded-xl font-semibold text-lg hover:bg-[#368487] transition"
            disabled={!selectedTier}
          >
            Subscribe
          </button>
        </div>
      </div>
    );
  }

  if (billingStep === "methods") {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px]">
        <button
          onClick={() => setBillingStep("home")}
          className="flex items-center text-mySidebar mb-6 hover:underline w-fit"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Billing
        </button>
        <h2 className="text-4xl text-profileHeader font-bold mb-2">Payment Methods</h2>
        <p className="text-zyncureOrange mb-8">Select your mode of payment and input your information</p>
        <div
          className="bg-[#FFEDE7] rounded-xl flex items-center px-6 py-5 cursor-pointer hover:bg-[#f9d3c2] transition mb-4"
          onClick={() => setBillingStep("details")}
        >
          <div className="w-10 h-10 mr-4 rounded-lg flex items-center justify-center bg-black">
            <img
              src="https://cdn.brandfetch.io/id_IE4goUp/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
              alt="Maya Bank"
              className="w-8 h-8"
              style={{ objectFit: "contain" }}
            />
          </div>
          <span className="text-[#F46B5D] font-semibold text-lg flex-1">Maya Bank</span>
          <ChevronRight className="text-[#F46B5D]" size={28} />
        </div>
      </div>
    );
  }

  if (billingStep === "details") {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px]">
        <button
          onClick={() => setBillingStep("methods")}
          className="flex items-center text-mySidebar mb-6 hover:underline w-fit"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Payment Methods
        </button>
        <h2 className="text-4xl text-profileHeader font-bold mb-2">Enter payment details</h2>
        <p className="text-zyncureOrange mb-8">Select your mode of payment and input your information</p>
        <div className="bg-[#FFEDE7] rounded-xl px-8 py-8 max-w-xl mx-auto">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 mr-4 rounded-lg flex items-center justify-center bg-black">
              <img
                src="https://cdn.brandfetch.io/id_IE4goUp/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
                alt="Maya Bank"
                className="w-8 h-8"
                style={{ objectFit: "contain" }}
              />
            </div>
            <span className="text-[#F46B5D] font-semibold text-lg">Maya Bank</span>
          </div>
          <label className="block text-[#3BA4A0] font-semibold mb-2">
            Enter your Maya mobile number
          </label>
          <div className="flex items-center mb-4">
            <span className="px-4 py-2 bg-[#FEDED2] border border-[#F46B5D] rounded-l-[15.5px] text-[#F46B5D] font-semibold">+63</span>
            <input
              type="tel"
              className="w-full p-2 bg-[#FEDED2] border-t border-b border-r border-[#F46B5D] rounded-r-[15.5px] outline-none"
              placeholder="Mobile Number"
            />
          </div>
          <p className="text-[#F46B5D] text-xs mb-4">
            By checking the checkbox below, you agree that ZynCure will automatically continue your membership and charge the membership fee to your payment method until you cancel. You may cancel at any time to avoid future charges.
          </p>
          <div className="flex items-center mb-6">
            <input type="checkbox" id="agree" className="mr-2 accent-[#F46B5D] w-5 h-5" />
            <label htmlFor="agree" className="text-[#F46B5D] font-semibold">I Agree.</label>
          </div>
          <div className="flex justify-center mb-4">
            <button className="bg-[#55A1A4] text-white px-10 py-2 rounded-xl font-semibold text-lg hover:bg-[#368487] transition">
              Save
            </button>
          </div>
          <p className="text-[#F46B5D] text-xs text-center">
            You'll be taken to Maya to complete the payment setup, but you won't be charged right away.
          </p>
        </div>
      </div>
    );
  }

  // --- Default Billing Home ---
  if (billingStep === "home") {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px]">
        <div className="mb-6">
          <h2 className="text-4xl text-profileHeader font-bold">Billing</h2>
          <p className="text-zyncureOrange text-left mt-3">
            Payment methods and subscriptions are monitored here
          </p>
        </div>
        <div className="mt-8">
          <SecurityOption
            title="Subscriptions"
            onClick={handleOptionClick}
          />
          <SecurityOption
            title="Payment methods"
            onClick={handleOptionClick}
          />
          <SecurityOption
            title="Contact Information"
            onClick={handleOptionClick}
          />
        </div>
      </div>
    );
  }
}

export function TermsOfServicePage({ onBack }) {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px] overflow-y-auto">
      <button onClick={onBack} className="flex items-center text-mySidebar mb-6 hover:underline">
        <ArrowLeft className="mr-2" size={20} /> Back to Policies
      </button>
      <h2 className="text-4xl text-profileHeader font-bold mb-4">ZynCure’s Terms and Conditions</h2>
      <div className="text-mySidebar space-y-4 text-base max-w-3xl">
        <h3 className="font-bold text-lg mt-4 mb-2">I. Introduction</h3>
        <p>
          Welcome to ZynCure! ZynCure is a patient-centered digital health record system designed to enhance accessibility and management of electronic health records (EHR) for patients and medical professionals. By using ZynCure, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use immediately.
        </p>
        <h3 className="font-bold text-lg mt-4 mb-2">II. User Agreement</h3>
        <ul className="list-disc ml-6">
          <li>You are at least 18 years old or have legal capacity to enter into contracts.</li>
          <li>You have provided accurate and truthful information when registering for an account.</li>
          <li>You will not use the platform for unlawful or harmful purposes.</li>
          <li>You will not violate the intellectual property rights of others.</li>
          <li>You agree to ZynCure’s privacy policy and data security practices.</li>
          <li>You agree to be bound by ZynCure’s dispute resolution process.</li>
        </ul>
        <p>
          ZynCure may modify these Terms and Conditions at any time. Users will be notified via email or in-app notifications. Continued use of ZynCure after modifications implies acceptance of the updated terms.
        </p>
        <h3 className="font-bold text-lg mt-4 mb-2">III. Patient Registration and Services</h3>
        <ul className="list-disc ml-6">
          <li><b>Overview:</b> ZynCure provides an online platform where patients can upload, store, and access personal health records.</li>
          <li><b>Registration:</b> Patients must provide complete and accurate personal information. Any falsification may result in account suspension or termination.</li>
          <li><b>Data Access:</b> Patients can view their medical records, including medical professional notes and past consultations. Medical providers can only access patient records with explicit patient permission.</li>
          <li><b>System Features:</b>
            <ul className="list-decimal ml-6">
              <li>Account Creation and Management: Users can create and manage personal accounts.</li>
              <li>Medical Record Viewing: Patients can view, update, and download their medical records.</li>
              <li>Data Sharing: Patients can grant time-limited, revocable access to healthcare providers to ensure controlled data sharing.</li>
              <li>Security and Encryption: All data transmissions are encrypted to protect sensitive health information.</li>
              <li>Medical Professional’s Consultation Tracking: Patients can track their consultation history, including diagnoses and prescribed treatments.</li>
              <li>User Role Management: Different access levels for patients and healthcare providers to ensure secure system interactions.</li>
              <li>Audit Logs: Tracks all user activity within the system for security and compliance purposes.</li>
              <li>Multi-Factor Authentication (MFA): Provides an extra layer of security for user accounts.</li>
              <li>Offline Data Access: Limited offline functionality for reviewing previously downloaded records.</li>
              <li>Automated Notifications: Alerts and reminders for patients regarding updates or access requests.</li>
            </ul>
          </li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">IV. Data Privacy and Security</h3>
        <ul className="list-disc ml-6">
          <li>ZynCure complies with relevant data privacy laws, including the Data Privacy Act of 2012.</li>
          <li><b>Data Collection:</b> ZynCure collects personal and medical information for service delivery, system improvements, and compliance with legal obligations.</li>
          <li><b>Data Protection:</b>
            <ul className="list-decimal ml-6">
              <li>Encryption: All health records are encrypted using end-to-end encryption (E2EE).</li>
              <li>Role-Based Access Control (RBAC): Only authorized personnel can access patient records, reducing data breaches.</li>
              <li>Multi-Factor Authentication (MFA): Users must verify their identity before accessing or modifying records.</li>
              <li>Data Storage: ZynCure stores records in secure cloud-based servers with continuous monitoring.</li>
            </ul>
          </li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">V. Patient Control and Record Management</h3>
        <ul className="list-disc ml-6">
          <li>Patient-Controlled Access: Patients have full control over who can view and edit their records.</li>
          <li>Permission-Based Sharing: Patients can grant and revoke access to medical professionals through unique time-limited access links.</li>
          <li>Medical Record Updates: Medical professionals can update patient records only with patient consent.</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">VI. Payment and Fees</h3>
        <ul className="list-disc ml-6">
          <li><b>Freemium Model & Subscription Tiers:</b> ZynCure operates on a freemium model, where basic access is free, and additional premium features require a subscription.
            <ul className="list-decimal ml-6">
              <li>
                <b>Tier 1: Free (Basic Access)</b> – View and manage personal health records.
                <ul className="list-disc ml-6">
                  <li>Upload and store up to 2GB of medical files.</li>
                  <li>Share records with up to 3 healthcare providers.</li>
                  <li>Track up to 3 symptoms with the ability to add custom symptoms.</li>
                  <li>Basic notifications for upcoming medical appointments.</li>
                  <li>Access to a health dashboard.</li>
                  <li>Ability to export health records in a standard format (e.g., PDF).</li>
                </ul>
              </li>
              <li>
                <b>Tier 2: Premium (Enhanced Access)</b> – Paid Subscription
                <ul className="list-disc ml-6">
                  <li>All features in the Free tier</li>
                  <li>Increased storage capacity up to 5GB.</li>
                  <li>Track all predefined symptoms and custom symptoms.</li>
                  <li>Share records with unlimited healthcare providers.</li>
                </ul>
              </li>
              <li>
                <b>Tier 3: Pro (Comprehensive Access)</b> – Paid Subscription
                <ul className="list-disc ml-6">
                  <li>All features in the Premium tier</li>
                  <li>Priority support for technical issues</li>
                  <li>Early access to future feature expansions and integrations.</li>
                  <li>Unlimited storage for medical files.</li>
                </ul>
              </li>
            </ul>
          </li>
          <li>Transactions: All payments must be processed through Maya’s secure payment gateway.</li>
          <li>Refunds: Any payment disputes will be resolved through ZynCure’s support team.</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">VII. Intellectual Property</h3>
        <ul className="list-disc ml-6">
          <li>All content, including software, text, graphics, and logos, is the property of ZynCure or its licensors. Users may not copy, distribute, or modify content without permission.</li>
          <li>If you believe your intellectual property rights have been infringed, contact ZynCure with supporting documentation.</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">VIII. Limitations of Liability</h3>
        <ul className="list-disc ml-6">
          <li>ZynCure provides services "as is" and does not guarantee uninterrupted or error-free service.</li>
          <li>ZynCure is not responsible for inaccuracies in user-provided data.</li>
          <li>ZynCure is not liable for indirect, incidental, or consequential damages resulting from platform use.</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">IX. Account Termination and Suspension</h3>
        <ul className="list-disc ml-6">
          <li>ZynCure may suspend or terminate accounts that violate these terms or engage in prohibited activities.</li>
          <li>Users may request account deletion by contacting ZynCure’s support team.</li>
          <li>Inactive accounts may be archived, but user data will be maintained according to data retention policies.</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">X. Dispute Resolution</h3>
        <ul className="list-disc ml-6">
          <li>Users are encouraged to resolve disputes through ZynCure’s support channels.</li>
          <li>If a resolution is not reached, disputes may be escalated to arbitration or legal proceedings as permitted by law.</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">XI. Governing Law</h3>
        <ul className="list-disc ml-6">
          <li>These Terms and Conditions shall be governed by and interpreted in accordance with the laws of the Philippines.</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">XII. Amendments and Contact Information</h3>
        <ul className="list-disc ml-6">
          <li>ZynCure reserves the right to amend these Terms and Conditions at any time.</li>
          <li>Users will be notified of significant changes through email or in-app notifications.</li>
          <li>For questions or concerns, contact ZynCure Support at <a className="underline" href="mailto:ZynCure@gmail.com">ZynCure@gmail.com</a>.</li>
        </ul>
        <p>
          By using ZynCure, you acknowledge and agree to these Terms and Conditions. If you do not agree, please discontinue use immediately.
        </p>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage({ onBack }) {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px] overflow-y-auto">
      <button onClick={onBack} className="flex items-center text-mySidebar mb-6 hover:underline">
        <ArrowLeft className="mr-2" size={20} /> Back to Policies
      </button>
      <h2 className="text-4xl text-profileHeader font-bold mb-4">ZynCure’s Privacy Agreement</h2>
      <div className="text-mySidebar space-y-4 text-base max-w-3xl">
        <h3 className="font-bold text-lg mt-4 mb-2">Privacy Agreement for ZynCure</h3>
        <p>
          Welcome to ZynCure, a patient-centered Electronic Health Record (EHR) system designed specifically for individuals managing Polycystic Ovary Syndrome (PCOS). Your privacy and the security of your personal health information are our top priorities. This Privacy Agreement outlines how we collect, use, protect, and share your information. By using ZynCure, you agree to the terms outlined in this agreement.
        </p>
        <h3 className="font-bold text-lg mt-4 mb-2">I. Information We Collect</h3>
        <ul className="list-disc ml-6">
          <li>
            <b>1.1 Personal Information</b><br />
            Name, date of birth, and contact information (email, phone number, address).<br />
            Insurance information and payment details (if applicable).
          </li>
          <li>
            <b>1.2 Health Information</b><br />
            Medical history, symptoms, diagnoses, and treatment plans related to PCOS.<br />
            Lab results, imaging reports, and medication records.<br />
            Lifestyle data (e.g., diet, exercise, menstrual cycle tracking) voluntarily provided by you.
          </li>
          <li>
            <b>1.3 Technical Information</b><br />
            Device information (e.g., IP address, browser type, operating system).<br />
            Usage data (e.g., pages visited, features used, time spent on the platform).
          </li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">II. How We Use Your Information</h3>
        <ul className="list-disc ml-6">
          <li>To provide personalized care and treatment recommendations for PCOS.</li>
          <li>To facilitate communication between you and your healthcare providers.</li>
          <li>To improve the functionality and user experience of the ZynCure platform.</li>
          <li>To comply with legal and regulatory requirements.</li>
          <li>To send you relevant educational materials, updates, and reminders (if you opt-in).</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">III. How We Protect Your Information</h3>
        <ul className="list-disc ml-6">
          <li>Encryption of data in transit and at rest.</li>
          <li>Access controls to ensure only authorized personnel can view your information.</li>
          <li>Secure authentication methods (e.g., two-factor authentication).</li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">IV. Sharing Your Information</h3>
        <ul className="list-disc ml-6">
          <li>
            <b>With Your Consent:</b> We will share your information with healthcare providers, specialists, or third parties only if you explicitly authorize it.
          </li>
          <li>
            <b>For Legal Purposes:</b> We may disclose your information if required by law or to protect the rights, safety, or property of ZynCure or others.
          </li>
          <li>
            <b>With Service Providers:</b> We may share your information with trusted third-party vendors who assist us in operating the platform (e.g., cloud storage providers, payment processors). These vendors are contractually obligated to protect your data.
          </li>
        </ul>
        <h3 className="font-bold text-lg mt-4 mb-2">V. Your Rights and Choices</h3>
        <ul className="list-disc ml-6">
          <li>
            <b>Access:</b> You can request a copy of your health records and personal information stored in ZynCure.
          </li>
          <li>
            <b>Correction:</b> You can update or correct any inaccurate or incomplete information.
          </li>
          <li>
            <b>Deletion:</b> You can request the deletion of your account and associated data, subject to legal and regulatory requirements.
          </li>
          <li>
            <b>Opt-Out:</b> You can opt-out of receiving non-essential communications (e.g., newsletters, promotional emails).
          </li>
        </ul>
        <p>
          To exercise these rights, please contact us at <a className="underline" href="mailto:ZynCure@gmail.com">ZynCure@gmail.com</a>.
        </p>
        <h3 className="font-bold text-lg mt-4 mb-2">VI. Data Retention</h3>
        <p>
          ZynCure retains your information for as long as necessary to fulfill the purposes outlined in this agreement or as required by law. If you delete your account, we will securely archive or anonymize your data in accordance with legal requirements.
        </p>
        <h3 className="font-bold text-lg mt-4 mb-2">VII. Changes to This Agreement</h3>
        <p>
          ZynCure may update this Privacy Agreement from time to time. We will notify you of any significant changes through the platform or via email. Your continued use of ZynCure after such changes constitutes your acceptance of the updated agreement.
        </p>
        <h3 className="font-bold text-lg mt-4 mb-2">VIII. Contact Us</h3>
        <p>
          If you have any questions, concerns, or requests regarding this Privacy Agreement or your data, please contact us at:<br />
          <b>Email:</b> <a className="underline" href="mailto:ZynCure@gmail.com">ZynCure@gmail.com</a><br />
          <b>Phone:</b> +63 (2) 1234-5678 
 
        </p>
        <p>
          Thank you for trusting ZynCure with your health information. We are committed to supporting you on your PCOS journey while protecting your privacy every step of the way.
        </p>
        <p>
          Sincerely,<br />
          ZynCure Team
        </p>
      </div>
    </div>
  );
}

export function PoliciesPage() {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleOptionClick = (option) => {
    if (option === "Terms of Service") setShowTerms(true);
    else if (option === "Privacy Policy") setShowPrivacy(true);
  };

  const SecurityOption = ({ title, onClick }) => (
    <div
      className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-200 transition-colors"
      onClick={() => onClick(title)}
    >
      <span className="text-mySidebar">{title}</span>
      <ChevronRight className="text-mySidebar" size={20} />
    </div>
  );

  if (showTerms) {
    return <TermsOfServicePage onBack={() => setShowTerms(false)} />;
  }
  if (showPrivacy) {
    return <PrivacyPolicyPage onBack={() => setShowPrivacy(false)} />;
  }

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Policies and Standards</h2>
      </div>
      <div className="mt-8">
        <SecurityOption
          title="Terms of Service"
          onClick={handleOptionClick}
        />
        <SecurityOption
          title="Privacy Policy"
          onClick={handleOptionClick}
        />
        <SecurityOption
          title="Community Standards"
          onClick={handleOptionClick}
        />
      </div>
    </div>
  );
}

export function DeleteAccountPage() {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">
          Saying Goodbye?
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-mySidebar mb-1">Email</label>
          <input
            type="text"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>

        <div>
          <label className="block text-mySidebar mb-1">Password</label>
          <input
            type="text"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>
        <div className="flex justify-center mt-6">
          <button className="bg-profileHeader text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
