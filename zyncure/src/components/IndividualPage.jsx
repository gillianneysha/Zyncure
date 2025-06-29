import { PencilIcon, ChevronRight, ArrowLeft, Eye, EyeClosed, Smartphone, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../client";
import PasswordInput from "./PasswordInput";
import PasswordSuccessModal from "./PasswordSuccessModal";
import PersonalInfoSuccessModal from "./PersonalInfoSuccessModal";
import LogoutModal from "./LogoutModal";
import DeleteAccountModal from "./DeleteAccountModal";
import Security from "../pages/IndividualPages/Security";
import Notification from "../pages/IndividualPages/Notifications";

export function PersonalInfoForm() {
  const [formData, setFormData] = useState({
    firstName: "",
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
  const [userType, setUserType] = useState(null); // Track user type

  useEffect(() => {
    async function fetchUserInfo() {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          setError("Failed to authenticate user");
          setLoading(false);
          return;
        }

        if (!user) {
          setError("No user found");
          setLoading(false);
          return;
        }

        console.log("User ID:", user.id); // Debug log

        // First, try to get user type from profiles table
        let { data: profileData, error: _profileError } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single();

        let currentUserType = null;
        if (profileData && profileData.user_type) {
          currentUserType = profileData.user_type;
        } else {
          // Fallback to user metadata if profiles table doesn't have user_type
          currentUserType = user.user_metadata?.user_type;
        }

        if (!currentUserType) {
          setError("User type not found");
          setLoading(false);
          return;
        }

        setUserType(currentUserType);
        console.log("User type:", currentUserType); // Debug log

        // Determine which table to query based on user type
        const tableName = currentUserType === 'patient' ? 'patients' : 'medicalprofessionals';
        const idColumn = currentUserType === 'patient' ? 'patient_id' : 'med_id';
        
        console.log("Querying table:", tableName, "with ID column:", idColumn); // Debug log

        // Fetch user data from the appropriate table
        let { data: userData, error: userDataError } = await supabase
          .from(tableName)
          .select("*")
          .eq(idColumn, user.id)
          .single();

        if (userDataError && userDataError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error(`Error fetching from ${tableName}:`, userDataError);
          setError(`Failed to fetch user data from ${tableName}`);
          setLoading(false);
          return;
        }

        let profile = {};
        if (userData) {
          profile = userData;
          console.log(`${tableName} data found:`, profile); // Debug log
        } else {
          profile = user.user_metadata || {};
          console.log("Using user metadata:", profile); // Debug log
        }

        const formattedData = {
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          email: user.email || profile.email || "",
          birthdate: profile.birthdate || "",
          mobileNumber: profile.contact_no || "",
        };

        setFormData(formattedData);
        setOriginalData(formattedData);
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error in fetchUserInfo:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
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

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user for save:", userError);
        setError("Authentication failed");
        setSaving(false);
        return;
      }

      if (!user) {
        setError("Not authenticated.");
        setSaving(false);
        return;
      }

      console.log("Attempting to save for user:", user.id); // Debug log
      console.log("User type:", userType); // Debug log
      console.log("Form data to save:", formData); // Debug log

      // Determine which table to update based on user type
      const tableName = userType === 'patient' ? 'patients' : 'medicalprofessionals';
      const idColumn = userType === 'patient' ? 'patient_id' : 'med_id';

      // Prepare the data for upsert based on table structure
      let updateData = {};
      
      if (userType === 'patient') {
        updateData = {
          patient_id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          birthdate: formData.birthdate,
          contact_no: formData.mobileNumber,
          email: formData.email,
          // Keep existing status if it exists, otherwise set default
          status: 'active', // You might want to preserve existing status
        };
      } else if (userType === 'doctor') {
        updateData = {
          med_id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          birthdate: formData.birthdate,
          contact_no: formData.mobileNumber,
          email: formData.email,
          // Keep existing status if it exists, otherwise set default
          status: 'active', // You might want to preserve existing status
        };
      }

      console.log(`Updating ${tableName} with data:`, updateData); // Debug log

      const { data, error: updateError } = await supabase
        .from(tableName)
        .upsert(updateData, {
          onConflict: idColumn
        });

      if (updateError) {
        console.error("Database error:", updateError);
        setError(`Failed to save changes: ${updateError.message}`);
      } else {
        console.log("Save successful:", data); // Debug log
        setSuccess("");
        setShowSuccessModal(true);
        setIsEditing(false);
        // Update originalData to reflect the saved state
        setOriginalData({ ...formData });
      }
    } catch (err) {
      console.error("Unexpected error in handleSave:", err);
      setError("An unexpected error occurred while saving");
    }

    setSaving(false);
  };

  const isChanged = originalData
    ? Object.keys(formData).some(
      (key) => formData[key] !== originalData[key]
    )
    : false;

  if (loading) {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] flex items-center justify-center">
        <div className="text-mySidebar">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">
          Personal Information
        </h2>
        <div className="relative group">
          <button
            className={`
              transition-all duration-300
              p-2 rounded-xl
              border
              ${isEditing
                ? "bg-[#55A1A4]/10 border-[#55A1A4] text-[#55A1A4] scale-110 rotate-12 shadow"
                : "border-transparent hover:bg-[#55A1A4]/10 hover:border-[#55A1A4] hover:text-[#55A1A4] text-mySidebar"
              }
            `}
            type="button"
            onClick={() => {
              if (isEditing) {
                setFormData(originalData);
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}
            aria-label={isEditing ? "Cancel Editing" : "Edit Personal Information"}
            title={isEditing ? "Cancel Editing" : "Edit Personal Information"}
          >
            <PencilIcon size={20} />
          </button>
          <div
            className={`
              absolute z-10 left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded
              text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity
              ${isEditing ? "" : ""}
            `}
            style={{
              whiteSpace: "nowrap",
              background: "#55A1A4"
            }}
          >
            {isEditing ? "Cancel Editing" : "Edit Personal Information"}
          </div>
        </div>
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
            className={`bg-[#55A1A4] text-white px-6 py-2 rounded-xl font-semibold text-lg hover:bg-[#368487] transition ${(!isEditing || loading || saving || !isChanged) ? "opacity-50 cursor-not-allowed" : ""
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

export { Security as SecurityPage }

export { Notification as NotificationPage }


export function BillingPage() {
  const [showPlans, setShowPlans] = useState(false);
  const [selectedTier, setSelectedTier] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  // Tier pricing (in PHP)
  const tierPricing = {
    premium: 299,
    pro: 599
  };

  // Get current user and subscription on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        setUser(user);

        if (user) {
          // Fixed subscription query - use proper filter format
          const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle instead of single to avoid error if no records

          if (subError) {
            console.error('Subscription fetch error:', subError);
          } else {
            setCurrentSubscription(subscription);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };

    getCurrentUser();
  }, []);

  const handleOptionClick = (option) => {
    if (option === "Subscriptions") setShowPlans(true);
    else if (option === "Contact Information") {
      // Add logic for Contact Information if needed
    }
  };

  // Create PayMongo Payment Link
  const createPaymentLink = async (amount, description) => {
    if (!user) {
      alert('Please log in to continue');
      return;
    }

    try {
      setIsProcessing(true);

      // Create payment record with proper data structure
      const paymentData = {
        user_id: user.id,
        amount: amount * 100, // Convert to centavos
        currency: 'PHP',
        status: 'pending',
        payment_method: 'online', // Generic since PayMongo handles the specific method
        tier: selectedTier
      };

      console.log('Creating payment record:', paymentData);

      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('Payment insert error:', paymentError);
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }

      console.log('Payment record created:', paymentRecord);

      // Create PayMongo payment link using edge function
      const { data: paymentLinkData, error: linkError } = await supabase.functions.invoke('create-payment-link', {
        body: {
          amount: amount * 100, // Convert to centavos
          currency: 'PHP',
          description: description,
          remarks: `ZynCure ${selectedTier} subscription - User: ${user.id}`,
          payment_record_id: paymentRecord.id
        }
      });

      if (linkError) {
        console.error('Payment link creation error:', linkError);
        throw new Error(`Failed to create payment link: ${linkError.message}`);
      }

      if (paymentLinkData?.checkout_url) {
        // Update payment record with PayMongo link ID
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            paymongo_link_id: paymentLinkData.link_id,
            paymongo_payment_id: paymentLinkData.payment_id
          })
          .eq('id', paymentRecord.id);

        if (updateError) {
          console.error('Payment update error:', updateError);
        }

        // Redirect to PayMongo checkout
        window.location.href = paymentLinkData.checkout_url;
      } else {
        throw new Error('No checkout URL received from payment link creation');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle subscription
  const handleSubscribe = () => {
    if (!selectedTier) {
      alert('Please select a subscription tier');
      return;
    }

    if (!user) {
      alert('Please log in to continue');
      return;
    }

    const amount = tierPricing[selectedTier];
    const description = `ZynCure ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Subscription`;

    createPaymentLink(amount, description);
  };

  const SecurityOption = ({ title, onClick }) => (
    <div
      className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-50 transition-colors"
      onClick={() => onClick(title)}
    >
      <span className="text-mySidebar">{title}</span>
      <ChevronRight className="text-mySidebar" size={20} />
    </div>
  );

  // Show current subscription status
  const renderSubscriptionStatus = () => {
    if (!currentSubscription) return null;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="text-green-800 font-semibold">Current Subscription</h3>
        <p className="text-green-600">
          {currentSubscription.tier.charAt(0).toUpperCase() + currentSubscription.tier.slice(1)} Plan
        </p>
        {currentSubscription.expires_at && (
          <p className="text-green-600 text-sm">
            Expires: {new Date(currentSubscription.expires_at).toLocaleDateString()}
          </p>
        )}
        <p className="text-green-600 text-sm">
          Status: {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
        </p>
      </div>
    );
  };

  // Subscriptions page
  if (showPlans) {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] overflow-y-auto">
        <button
          onClick={() => setShowPlans(false)}
          className="flex items-center text-gray-600 mb-6 hover:underline"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Billing
        </button>

        {renderSubscriptionStatus()}

        <h2 className="text-4xl text-teal-600 font-bold mb-2">Upgrade to Premium</h2>
        <p className="text-teal-600 mb-8">Enjoy an enhanced experience</p>

        <div className="flex gap-6">
          {/* Tier 1 - Free */}
          <div className="bg-orange-50 rounded-2xl p-6 flex-1 relative">
            <h3 className="font-bold text-orange-600 mb-2">
              Tier 1: Free <span className="font-normal text-sm">(Basic Access)</span>
            </h3>
            <ul className="text-orange-600 text-sm space-y-2">
              <li>✓ View and manage personal health records.</li>
              <li>✓ Upload and store up to 2GB of medical files.</li>
              <li>✓ Share records with up to 3 healthcare providers.</li>
              <li>✓ Track up to 3 symptoms with the ability to add custom symptoms.</li>
              <li>✓ Basic notifications for upcoming medical appointments.</li>
              <li>✓ Access to a health dashboard.</li>
              <li>✓ Ability to export health records in a standard format (e.g., PDF).</li>
            </ul>
          </div>

          {/* Tier 2 - Premium */}
          <div className="bg-orange-50 rounded-2xl p-6 flex-1 relative">
            <input
              type="radio"
              name="subscriptionTier"
              value="premium"
              checked={selectedTier === "premium"}
              onChange={() => setSelectedTier("premium")}
              className="absolute top-6 right-6 w-5 h-5 accent-orange-600 cursor-pointer"
              aria-label="Select Premium"
            />
            <h3 className="font-bold text-orange-600 mb-2">
              Tier 2: Premium <span className="font-normal text-sm">(Enhanced Access)</span>
            </h3>
            <p className="text-orange-600 font-bold mb-2">₱299/month</p>
            <ul className="text-orange-600 text-sm space-y-2">
              <li>✓ All features in the Free tier</li>
              <li>✓ Increased storage capacity up to 5GB.</li>
              <li>✓ Track all predefined symptoms and custom symptoms.</li>
              <li>✓ Share records with unlimited healthcare providers.</li>
            </ul>
          </div>

          {/* Tier 3 - Pro */}
          <div className="bg-orange-50 rounded-2xl p-6 flex-1 relative">
            <input
              type="radio"
              name="subscriptionTier"
              value="pro"
              checked={selectedTier === "pro"}
              onChange={() => setSelectedTier("pro")}
              className="absolute top-6 right-6 w-5 h-5 accent-orange-600 cursor-pointer"
              aria-label="Select Pro"
            />
            <h3 className="font-bold text-orange-600 mb-2">
              Tier 3: Pro <span className="font-normal text-sm">(Comprehensive Access)</span>
            </h3>
            <p className="text-orange-600 font-bold mb-2">₱599/month</p>
            <ul className="text-orange-600 text-sm space-y-2">
              <li>✓ All features in the Premium tier</li>
              <li>✓ Priority support for technical issues</li>
              <li>✓ Early access to future feature expansions and integrations.</li>
              <li>✓ Unlimited storage for medical files.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button
            className="bg-teal-600 text-white px-10 py-2 rounded-xl font-semibold text-lg hover:bg-teal-700 transition disabled:opacity-50"
            disabled={!selectedTier || isProcessing || !user}
            onClick={handleSubscribe}
          >
            {isProcessing ? 'Processing...' : !user ? 'Please log in' : 'Subscribe Now'}
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            You'll be redirected to PayMongo to complete your payment securely.
            <br />
            All major payment methods are supported (Cards, GCash, Maya, etc.)
          </p>
        </div>
      </div>
    );
  }

  // Default Billing Home
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Billing</h2>
        <p className="text-zyncureOrange text-left mt-3">
          Manage your subscriptions and billing information
        </p>
      </div>

      {renderSubscriptionStatus()}

      <div className="mt-8">
        <SecurityOption
          title="Subscriptions"
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
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // <-- Add this
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = () => setShowModal(true);
  const handleCancel = () => setShowModal(false);

  const handleConfirmDelete = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    // 1. Re-authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }
    if (!email || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }
    if (email !== user.email) {
      setError("Entered email does not match your account.");
      setLoading(false);
      return;
    }
    // 2. Sign in again to verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError("Incorrect password.");
      setLoading(false);
      return;
    }
    // 3. Call the Edge Function to delete the user
    const { error: fnError } = await supabase.functions.invoke('delete-user', {
      body: { user_id: user.id }
    });
    if (fnError) {
      setError("Failed to delete account: " + fnError.message);
      setLoading(false);
      return;
    }
    setSuccess("Account deleted successfully.");
    setLoading(false);
    // Optionally: redirect or log out
    setTimeout(() => {
      window.location.href = "/register";
    }, 2000);
  };

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <label className="block text-mySidebar mb-1">Password</label>
          <input
            type={showPassword ? "text" : "password"}
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-12 -translate-y-1/2 flex items-center text-[#F46B5D] focus:outline-none"
            tabIndex={-1}
            style={{ background: "none", border: "none", padding: 0 }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <Eye size={22} /> : <EyeClosed size={22} />}
          </button>
        </div>
        <div className="flex justify-center py-5">
          <button
            className="bg-profileHeader text-white px-6 py-2 rounded-xl font-semibold hover:bg-red-600 transition-colors"
            onClick={handleDelete}
            type="button"
          >
            Delete Account
          </button>
        </div>
        {showModal && (
          <DeleteAccountModal
            open={showModal}
            onCancel={handleCancel}
            onConfirm={handleConfirmDelete}
            title="This will delete your account"
            description="Proceed with your deletion request?"
            loading={loading}
          />
        )}
        {error && <div className="text-red-500 mt-4">{error}</div>}
        {success && <div className="text-green-600 mt-4">{success}</div>}
      </div>
    </div>
  );
}
