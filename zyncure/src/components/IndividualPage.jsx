import { PencilIcon, ChevronRight, ArrowLeft, Eye, EyeClosed, PhilippinePeso, Smartphone, CreditCard, SquareUser, LockKeyhole, BookOpenText, Trash, PhilippinePesoIcon } from "lucide-react";
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
        <h2 className="text-4xl text-profileHeader font-bold flex items-center gap-3">
          <SquareUser className="w-9 h-9 text-profileHeader" />
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

export function ContactInformationPage({ onBack }) {
  const [contactData, setContactData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchContactInfo() {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Failed to authenticate user");
          setLoading(false);
          return;
        }

        // Get user type from profiles table
        let { data: profileData, error: _profileError } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single();

        let currentUserType = profileData?.user_type || user.user_metadata?.user_type;

        if (!currentUserType) {
          setError("User type not found");
          setLoading(false);
          return;
        }

        // Determine which table to query based on user type
        const tableName = currentUserType === 'patient' ? 'patients' : 'medicalprofessionals';
        const idColumn = currentUserType === 'patient' ? 'patient_id' : 'med_id';

        // Fetch user data from the appropriate table
        let { data: userData, error: userDataError } = await supabase
          .from(tableName)
          .select("*")
          .eq(idColumn, user.id)
          .single();

        if (userDataError && userDataError.code !== 'PGRST116') {
          console.error(`Error fetching from ${tableName}:`, userDataError);
          setError(`Failed to fetch user data from ${tableName}`);
          setLoading(false);
          return;
        }

        let profile = userData || user.user_metadata || {};

        const formattedData = {
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          email: user.email || profile.email || "",
          mobileNumber: profile.contact_no || "",
        };

        setContactData(formattedData);
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error in fetchContactInfo:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    }
    fetchContactInfo();
  }, []);

  if (loading) {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] flex items-center justify-center">
        <div className="text-mySidebar">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <button
        onClick={onBack}
        className="flex items-center text-mySidebar mb-6 hover:underline"
      >
        <ArrowLeft className="mr-2" size={20} /> Back to Billing
      </button>

      <h2 className="text-4xl text-profileHeader font-bold mb-6 flex items-center gap-3">
        <Smartphone className="w-9 h-9 text-profileHeader" />
        Contact Information
      </h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="space-y-6">
        <div>
          <label className="block text-mySidebar mb-2 font-semibold">Full Name</label>
          <div className="w-full p-3 border border-mySidebar rounded-xl bg-profileBg text-mySidebar">
            {contactData.firstName && contactData.lastName
              ? `${contactData.firstName} ${contactData.lastName}`
              : "Not provided"
            }
          </div>
        </div>

        <div>
          <label className="block text-mySidebar mb-2 font-semibold">Email Address</label>
          <div className="w-full p-3 border border-mySidebar rounded-xl bg-profileBg text-mySidebar">
            {contactData.email || "Not provided"}
          </div>
        </div>

        <div>
          <label className="block text-mySidebar mb-2 font-semibold">Mobile Number</label>
          <div className="w-full p-3 border border-mySidebar rounded-xl bg-profileBg text-mySidebar">
            {contactData.mobileNumber || "Not provided"}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> To update your contact information, please go to the Personal Information section in your profile settings.
          </p>
        </div>
      </div>
    </div>
  );
}

export function BillingPage() {
  const [showPlans, setShowPlans] = useState(false);
  const [selectedTier, setSelectedTier] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Check for payment success/failure in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      setPaymentStatus("Payment successful! Your subscription is being activated.");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled === 'true') {
      setPaymentStatus("Payment was canceled. Please try again.");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Tier pricing (in PHP - keep as regular amounts, NOT centavos)
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
          const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

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

    if (option === "Subscriptions" || option === "Manage Subscription") setShowPlans(true);
    // else if (option === "Contact Information") {
      
    // }
  };

  // Create PayMongo Checkout Session with improved error handling
  const createCheckoutSession = async (amount, description) => {
    if (!user) {
      setError('Please log in to continue');
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      // Validate inputs
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
      }
      if (!description || !selectedTier) {
        throw new Error('Missing required information');
      }

      // Validate tier
      if (!tierPricing[selectedTier]) {
        throw new Error('Invalid subscription tier selected');
      }

      // Create payment record with proper data structure
      const paymentData = {
        user_id: user.id,
        amount: Math.round(amount * 100), // Convert PHP to centavos for database storage
        currency: 'PHP',
        status: 'pending',
        payment_method: 'online',
        tier: selectedTier,
        description: description
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

      // Create PayMongo checkout session using edge function
      const requestBody = {
        amount: amount, // Send amount in PHP (not centavos) - edge function will convert
        description: description,
        user_id: user.id,
        tier: selectedTier,
        payment_record_id: paymentRecord.id
      };

      console.log('Calling edge function with:', requestBody);

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: requestBody
      });

      if (checkoutError) {
        console.error('Checkout session creation error:', checkoutError);
        throw new Error(`Failed to create checkout session: ${checkoutError.message}`);
      }

      console.log('Checkout session response:', checkoutData);

      if (checkoutData?.checkout_url) {
        console.log('Redirecting to:', checkoutData.checkout_url);

        // Redirect to PayMongo checkout
        window.location.href = checkoutData.checkout_url;
      } else {
        throw new Error('No checkout URL received from checkout session creation');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(`Payment processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle subscription
  const handleSubscribe = () => {
    if (!selectedTier) {
      setError('Please select a subscription tier');
      return;
    }

    if (!user) {
      setError('Please log in to continue');
      return;
    }

    const amount = tierPricing[selectedTier];
    if (!amount) {
      setError('Invalid subscription tier selected');
      return;
    }

    const description = `ZynCure ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Subscription`;

    createCheckoutSession(amount, description);
  };

  // Handle plan upgrade/downgrade
  const handlePlanChange = () => {
    if (!selectedTier) {
      setError('Please select a new subscription tier');
      return;
    }

    const amount = tierPricing[selectedTier];
    const description = `ZynCure ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Subscription (Plan Change)`;

    createCheckoutSession(amount, description);
  };

  // Handle cancellation
  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    if (confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', currentSubscription.id);

        if (error) throw error;

        setCurrentSubscription({ ...currentSubscription, status: 'cancelled' });
        setPaymentStatus('Your subscription has been cancelled successfully.');
      } catch (error) {
        setError(`Failed to cancel subscription: ${error.message}`);
      }
    }
  };

  // Handle payment success (call this when user returns from PayMongo)
  const handlePaymentSuccess = async (paymentRecordId, userId, tier) => {
    try {
      console.log('Handling payment success:', { paymentRecordId, userId, tier });

      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if webhook already processed the payment
      let paymentRecord = null;

      if (paymentRecordId) {
        const { data: payment, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentRecordId)
          .single();

        if (!fetchError && payment) {
          paymentRecord = payment;
        }
      }

      if (paymentRecord) {
        console.log('Found payment record:', paymentRecord);

        if (paymentRecord.status === 'completed') {
          // Payment already processed by webhook
          console.log('Payment already completed by webhook');
        } else {
          // Update payment status manually (fallback)
          console.log('Updating payment status manually...');
          const { error: paymentError } = await supabase
            .from('payments')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentRecord.id);

          if (paymentError) {
            console.error('Payment update error:', paymentError);
            throw paymentError;
          }
        }

        // Refresh current subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!subError && subscription) {
          console.log('Updated subscription:', subscription);
          setCurrentSubscription(subscription);
        }
      } else {
        console.log('No payment record found, creating subscription manually...');

        // Create subscription manually (fallback)
        const subscriptionData = {
          user_id: userId,
          tier: tier,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert(subscriptionData)
          .select()
          .single();

        if (subscriptionError) {
          console.error('Subscription creation error:', subscriptionError);
          throw subscriptionError;
        }

        console.log('Subscription created manually:', subscription);
        setCurrentSubscription(subscription);
      }

      // Clear any errors and show success
      setError('');
      setShowPlans(false);

      // Clean up URL parameters
      const url = new URL(window.location);
      url.searchParams.delete('success');
      url.searchParams.delete('payment_record_id');
      url.searchParams.delete('user_id');
      url.searchParams.delete('tier');
      url.searchParams.delete('canceled');
      window.history.replaceState({}, document.title, url.toString());

    } catch (error) {
      console.error('Payment success handling error:', error);
      setError(`Failed to complete subscription: ${error.message}`);
    }
  };

  // Check URL parameters for payment success/failure on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const paymentRecordId = urlParams.get('payment_record_id');
    const userId = urlParams.get('user_id');
    const tier = urlParams.get('tier');

    if (success === 'true' && paymentRecordId) {
      handlePaymentSuccess(paymentRecordId, userId, tier);
    } else if (canceled === 'true') {
      setError('Payment was canceled');
      // Update payment record to canceled if we have the ID
      if (paymentRecordId) {
        supabase
          .from('payments')
          .update({ status: 'cancelled' })
          .eq('id', paymentRecordId)
          .then(() => console.log('Payment marked as cancelled'));
      }
    }
  }, []);

  // Helper function to check if user has active subscription
  const hasActiveSubscription = () => {
    return currentSubscription && currentSubscription.status === 'active';
  };

  // Helper function to get current tier
  const getCurrentTier = () => {
    if (!hasActiveSubscription()) return 'free';
    return currentSubscription.tier;
  };

  // Helper function to check if subscription is expired
  const isSubscriptionExpired = () => {
    if (!currentSubscription) return false;
    return currentSubscription.expires_at && new Date(currentSubscription.expires_at) < new Date();
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


  // Fetch subscription helper
  const fetchSubscription = async () => {
    if (!user) return;
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!subError && subscription) {
      setCurrentSubscription(subscription);
    }
  };

  const reactivateSubscription = async () => {
    try {
      // Update subscription status to active
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Refresh subscription data
      await fetchSubscription();
      
      // Show success message
      alert('Subscription reactivated successfully!');
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      alert('Failed to reactivate subscription. Please try again.');
    }
  };

// Handle refund request
const handleRefundRequest = async (paymentId) => {
  try {
    setIsProcessing(true);
    setError("");

    const {  error: refundError } = await supabase.functions.invoke('request-refund', {
      body: { payment_id: paymentId }
    });

    if (refundError) {
      throw new Error(`Refund request failed: ${refundError.message}`);
    }

    setPaymentStatus("Refund request submitted successfully. You will receive an email confirmation.");
    
    // Refresh subscription data
    await fetchSubscription();
    
  } catch (error) {
    console.error('Refund request error:', error);
    setError(`Refund request failed: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};

// Get recent payments for refund eligibility
const getRecentPayments = async () => {
  if (!user) return [];
  
  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return payments || [];
};

 // --- ADD REFUND BUTTON COMPONENT HERE ---
  const RefundButton = () => {
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [recentPayments, setRecentPayments] = useState([]);

    const checkRefundEligibility = async () => {
      const payments = await getRecentPayments();
      setRecentPayments(payments);
      setShowRefundModal(true);
    };

    if (showRefundModal) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Request Refund</h3>
            
            {recentPayments.length === 0 ? (
              <p className="text-gray-600 mb-4">
                No recent payments eligible for refund. Refunds are only available for payments made within the last 7 days.
              </p>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Select a payment to refund (only payments from last 7 days):
                </p>
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="border rounded p-3 mb-2">
                    <p className="font-medium">₱{payment.amount / 100}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">{payment.tier} plan</p>
                    <button
                      onClick={() => {
                        handleRefundRequest(payment.id);
                        setShowRefundModal(false);
                      }}
                      className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Request Refund'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={checkRefundEligibility}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
      >
        Request Refund
      </button>
    );
  };

  // Enhanced subscription status display
  const renderSubscriptionStatus = () => {
  if (!currentSubscription) return null;

  const isActive = currentSubscription.status === 'active';
  const isExpired = isSubscriptionExpired();
  const isCancelled = currentSubscription.status === 'cancelled';


  let statusText = 'Active';
  let bgColor = 'bg-green-50 border-green-200';
  let textColor = 'text-green-800';
  let statusIcon = '✓';

  if (isCancelled) {
    
    statusText = 'Cancelled';
    bgColor = 'bg-red-50 border-red-200';
    textColor = 'text-red-800';
    statusIcon = '✗';
  } else if (isExpired) {
    
    statusText = 'Expired';
    bgColor = 'bg-orange-50 border-orange-200';
    textColor = 'text-orange-800';
    statusIcon = '⚠';
  }

  return (
    <div className={`${bgColor} border rounded-lg p-6 mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${textColor} font-semibold text-lg flex items-center gap-2`}>
          <span className="text-xl">{statusIcon}</span>
          Current Subscription
        </h3>
        {isActive && !isExpired && (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {statusText}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className={`${textColor} font-medium`}>
            Plan: {currentSubscription.tier.charAt(0).toUpperCase() + currentSubscription.tier.slice(1)}
          </p>
          <p className={`${textColor} text-sm`}>
            Monthly fee: ₱{tierPricing[currentSubscription.tier] || 0}
          </p>
        </div>
        
        <div>
          {currentSubscription.expires_at && (
            <p className={`${textColor} text-sm`}>
              Expires: {new Date(currentSubscription.expires_at).toLocaleDateString()}
            </p>
          )}
          {currentSubscription.started_at && (
            <p className={`${textColor} text-sm`}>
              Started: {new Date(currentSubscription.started_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {isActive && !isExpired && (
        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={() => setShowPlans(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Change Plan
          </button>
          <button
            onClick={handleCancelSubscription}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
          >
            Cancel Subscription
          </button>
          <RefundButton />
        </div>
      )}

      {(isExpired || isCancelled) && (
        <div className="mt-4">
          <button
            onClick={reactivateSubscription}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm"
          >
            Reactivate Subscription
          </button>
        </div>
      )}
    </div>
  );
};

  // Payment status message component
  const renderPaymentStatus = () => {
    if (!paymentStatus) return null;

    const isSuccess = paymentStatus.includes('successful');
    const bgColor = isSuccess ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200';
    const textColor = isSuccess ? 'text-green-800' : 'text-orange-800';

    return (
      <div className={`${bgColor} border rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className={`${textColor} font-semibold`}>
            {isSuccess ? '✓ Payment Status' : 'Payment Status'}
          </div>
          <button
            onClick={() => setPaymentStatus("")}
            className={`${textColor} hover:opacity-70`}
          >
            ×
          </button>
        </div>
        <p className={`${textColor} text-sm mt-1`}>{paymentStatus}</p>
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="text-red-800 font-semibold">Error</div>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  };

  // Testing mode indicator
  const renderTestingNotice = () => {
    const isTestEnvironment = import.meta.env.DEV ||
      window.location.hostname === 'localhost' ||
      import.meta.env.VITE_PAYMONGO_MODE === 'test';

    if (!isTestEnvironment) return null;

    // return (
    //   <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
    //     <h3 className="text-yellow-800 font-semibold">🧪 Testing Mode</h3>
    //     <p className="text-yellow-700 text-sm">
    //       This is sandbox mode - no real payments will be processed.
    //       <br />
    //       Use test card numbers provided by PayMongo for testing.
    //     </p>
    //   </div>
    // );
  };

  // Enhanced subscriptions page
  if (showPlans) {
    const currentTier = getCurrentTier();
    const isUpgrading = hasActiveSubscription();

    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] overflow-y-auto">
        <button
          onClick={() => setShowPlans(false)}
          className="flex items-center text-mySidebar mb-6 hover:underline"
        >
          <ArrowLeft className="mr-2" size={20} /> Back to Billing
        </button>

        {renderTestingNotice()}
        {renderPaymentStatus()}
        {renderError()}
        {renderSubscriptionStatus()}

        <h2 className="text-4xl text-teal-600 font-bold mb-2">
          {isUpgrading ? 'Change Your Plan' : 'Upgrade to Premium'}
        </h2>
        <p className="text-teal-600 mb-8">
          {isUpgrading ? 'Select a new plan to switch to' : 'Enjoy an enhanced experience'}
        </p>

        <div className="flex gap-6">
          {/* Tier 1 - Free */}
          <div className={`rounded-2xl p-6 flex-1 relative ${
            currentTier === 'free' ? 'bg-teal-50 border-2 border-teal-500' : 'bg-orange-50'
          }`}>
            {currentTier === 'free' && (
              <div className="absolute -top-3 left-4 bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Current Plan
              </div>
            )}
            <h3 className={`font-bold mb-2 ${currentTier === 'free' ? 'text-teal-600' : 'text-orange-600'}`}>
              Tier 1: Free <span className="font-normal text-sm">(Basic Access)</span>
            </h3>
            <ul className={`text-sm space-y-2 ${currentTier === 'free' ? 'text-teal-600' : 'text-orange-600'}`}>
              <li>✓ View and manage personal health records.</li>
              <li>✓ Upload and store up to 2GB of medical files.</li>
              <li>✓ Share records with up to 3 healthcare providers.</li>
              <li>✓ Track up to 3 symptoms with the ability to add custom symptoms.</li>
              <li>✓ Basic notifications for upcoming medical appointments.</li>
              <li>✓ Access to a health dashboard.</li>
              <li>✓ Ability to export health records in a standard format (e.g., PDF).</li>
            </ul>
            {currentTier !== 'free' && hasActiveSubscription() && (
              <button
                onClick={handleCancelSubscription}
                className="mt-4 w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition text-sm"
              >
                Downgrade to Free
              </button>
            )}
          </div>

          {/* Tier 2 - Premium */}
          <div className={`rounded-2xl p-6 flex-1 relative ${
            currentTier === 'premium' ? 'bg-teal-50 border-2 border-teal-500' : 'bg-orange-50'
          }`}>
            {currentTier === 'premium' && (
              <div className="absolute -top-3 left-4 bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Current Plan
              </div>
            )}
            {currentTier !== 'premium' && (
              <input
                type="radio"
                name="subscriptionTier"
                value="premium"
                checked={selectedTier === "premium"}
                onChange={() => setSelectedTier("premium")}
                className="absolute top-6 right-6 w-5 h-5 accent-orange-600 cursor-pointer"
                aria-label="Select Premium"
              />
            )}
            <h3 className={`font-bold mb-2 ${currentTier === 'premium' ? 'text-teal-600' : 'text-orange-600'}`}>
              Tier 2: Premium <span className="font-normal text-sm">(Enhanced Access)</span>
            </h3>
            <p className={`font-bold mb-2 ${currentTier === 'premium' ? 'text-teal-600' : 'text-orange-600'}`}>
              ₱299/month
            </p>
            <ul className={`text-sm space-y-2 ${currentTier === 'premium' ? 'text-teal-600' : 'text-orange-600'}`}>
              <li>✓ All features in the Free tier</li>
              <li>✓ Increased storage capacity up to 5GB.</li>
              <li>✓ Track all predefined symptoms and custom symptoms.</li>
              <li>✓ Share records with unlimited healthcare providers.</li>
            </ul>
          </div>

          {/* Tier 3 - Pro */}
          <div className={`rounded-2xl p-6 flex-1 relative ${
            currentTier === 'pro' ? 'bg-teal-50 border-2 border-teal-500' : 'bg-orange-50'
          }`}>
            {currentTier === 'pro' && (
              <div className="absolute -top-3 left-4 bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Current Plan
              </div>
            )}
            {currentTier !== 'pro' && (
              <input
                type="radio"
                name="subscriptionTier"
                value="pro"
                checked={selectedTier === "pro"}
                onChange={() => setSelectedTier("pro")}
                className="absolute top-6 right-6 w-5 h-5 accent-orange-600 cursor-pointer"
                aria-label="Select Pro"
              />
            )}
            <h3 className={`font-bold mb-2 ${currentTier === 'pro' ? 'text-teal-600' : 'text-orange-600'}`}>
              Tier 3: Pro <span className="font-normal text-sm">(Comprehensive Access)</span>
            </h3>
            <p className={`font-bold mb-2 ${currentTier === 'pro' ? 'text-teal-600' : 'text-orange-600'}`}>
              ₱599/month
            </p>
            <ul className={`text-sm space-y-2 ${currentTier === 'pro' ? 'text-teal-600' : 'text-orange-600'}`}>
              <li>✓ All features in the Premium tier</li>
              <li>✓ Priority support for technical issues</li>
              <li>✓ Early access to future feature expansions and integrations.</li>
              <li>✓ Unlimited storage for medical files.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          {!hasActiveSubscription() ? (
            <button
              className="bg-teal-600 text-white px-10 py-2 rounded-xl font-semibold text-lg hover:bg-teal-700 transition disabled:opacity-50"
              disabled={!selectedTier || isProcessing || !user}
              onClick={handleSubscribe}
            >
              {isProcessing ? 'Processing...' : !user ? 'Please log in' : 'Subscribe Now'}
            </button>
          ) : (
            <button
              className="bg-teal-600 text-white px-10 py-2 rounded-xl font-semibold text-lg hover:bg-teal-700 transition disabled:opacity-50"
              disabled={!selectedTier || isProcessing || !user || selectedTier === currentTier}
              onClick={handlePlanChange}
            >
              {isProcessing ? 'Processing...' : 
               !user ? 'Please log in' : 
               selectedTier === currentTier ? 'Current Plan' : 'Change Plan'}
            </button>
          )}
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            {isUpgrading ? 
              'Your plan will be changed immediately upon successful payment.' :
              'You\'ll be redirected to PayMongo to complete your payment securely.'
            }
            <br />
            All major payment methods are supported (Cards, GCash, Maya, etc.)
          </p>
          {import.meta.env.DEV && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">
                <strong>For Testing:</strong> Use test card 4343434343434345, any future expiry date, and any 3-digit CVC.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }


  // Default Billing Home
  if (showContactInfo) {
    return <ContactInformationPage onBack={() => setShowContactInfo(false)} />;
  }


  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold flex items-center gap-3">
          <PhilippinePesoIcon className="w-9 h-9 text-profileHeader" />
          Billing
        </h2>
        <p className="text-zyncureOrange text-left mt-3">
          {hasActiveSubscription() ? 
            'Manage your active subscription and billing information' :
            'Manage your subscriptions and billing information'
          }
        </p>
      </div>

      {renderTestingNotice()}
      {renderPaymentStatus()}
      {renderError()}
      {renderSubscriptionStatus()}

      <div className="mt-8">
        <SecurityOption
          title={hasActiveSubscription() ? "Manage Subscription" : "Subscriptions"}
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
          <li>For questions or concerns, contact ZynCure Support at <a className="underline" href="mailto:zyncure2025@gmail.com">zyncure2025@gmail.com</a>.</li>
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
          To exercise these rights, please contact us at <a className="underline" href="mailto:zyncure2025@gmail.com">zyncure2025@gmail.com</a>.
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
          <b>Email:</b> <a className="underline" href="mailto:zyncure2025@gmail.com">zyncure2025@gmail.com</a><br />
          <b>Phone:</b> +63 921 642 4770

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
        <h2 className="text-4xl text-profileHeader font-bold flex items-center gap-3">
          <BookOpenText className="w-9 h-9 text-profileHeader" />
          Policies and Standards
        </h2>
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
      </div>
    </div>
  );
}

export function DeleteAccountPage() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error || success) {
      setShowModal(false);
    }
  }, [error, success]);

  const handleDelete = () => setShowModal(true);
  const handleCancel = () => setShowModal(false);

  const handleConfirmDelete = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
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

      // 3. Calling Edge Function to delete the user
      const { error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: user.id }
      });
      if (fnError) {
        setError("Failed to delete account: " + fnError.message);
        setLoading(false);
        return;
      }

      setSuccess("Account deleted successfully.");

      await supabase.auth.signOut();

      setTimeout(() => {
        window.location.href = "/register";
      }, 1000);

    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl text-profileHeader font-bold flex items-center gap-3">
          <Trash className="w-9 h-9 text-profileHeader" />
          Saying Goodbye?
        </h2>
      </div>

      <div className="space-y-4">
        {error && <div className="text-red-500 mt-4">{error}</div>}
        {success && <div className="text-green-600 mt-4">{success}</div>}

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
            className={`px-6 py-2 rounded-xl font-semibold transition-colors ${email && password
              ? "bg-profileHeader text-white hover:bg-red-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            onClick={handleDelete}
            type="button"
            disabled={!email || !password}
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
      </div>
    </div>
  );
}

export function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/register";
      }}
    >
      Logout
    </button>
  );
}
