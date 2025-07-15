import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../client";

export default function CompleteProfile() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    birthdate: "",
    userType: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setIsInitialLoading(true);

      // Wait a bit for auth to settle (especially important for OAuth)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      console.log("Auth user:", user); // Debug log

      if (userError) {
        console.error('User error:', userError);
        navigate('/login');
        return;
      }

      if (!user) {
        console.log('No user found, redirecting to login');
        navigate('/login');
        return;
      }

      setUser(user);

      // Check if user already has a complete profile
      const profileExists = await checkExistingProfile(user.id);
      if (profileExists) {
        console.log('Profile exists, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }

      // Pre-fill form with user metadata if available
      console.log("User metadata:", user.user_metadata); // Debug log

      if (user.user_metadata) {
        setForm({
          firstName: user.user_metadata.first_name || user.user_metadata.full_name?.split(' ')[0] || "",
          lastName: user.user_metadata.last_name || user.user_metadata.full_name?.split(' ').slice(1).join(' ') || "",
          contactNumber: user.user_metadata.contact_number || "",
          birthdate: user.user_metadata.birthdate || "",
          userType: user.user_metadata.user_type || "",
        });
      }

      // For Google users, try to extract name from email or other fields
      if (user.app_metadata?.provider === 'google' && !user.user_metadata?.first_name) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const nameParts = name.split(' ');
        setForm(prev => ({
          ...prev,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(' ') || "",
        }));
      }

    } catch (error) {
      console.error('Error checking user:', error);
      setError('Authentication error. Please try logging in again.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const checkExistingProfile = async (userId) => {
    try {
      console.log("Checking existing profile for user:", userId); // Debug log

      // Check both tables for existing profile
      const [patientResult, doctorResult] = await Promise.all([
        supabase
          .from('patients')
          .select('*')
          .eq('patient_id', userId)
          .maybeSingle(),
        supabase
          .from('medicalprofessionals')
          .select('*')
          .eq('med_id', userId)
          .maybeSingle()
      ]);

      console.log("Patient result:", patientResult); // Debug log
      console.log("Doctor result:", doctorResult); // Debug log

      const existingProfile = patientResult.data || doctorResult.data;
      console.log("Existing profile:", existingProfile); // Debug log

      return existingProfile;
    } catch (error) {
      console.error('Error checking existing profile:', error);
      return false;
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    setError(""); // Clear previous errors

    if (!form.firstName.trim()) {
      setError("First name is required");
      return false;
    }
    if (!form.lastName.trim()) {
      setError("Last name is required");
      return false;
    }
    if (!form.contactNumber.trim()) {
      setError("Contact number is required");
      return false;
    }
    if (!form.birthdate) {
      setError("Birthdate is required");
      return false;
    }
    if (!form.userType) {
      setError("User type is required");
      return false;
    }

    // Validate age (18+)
    const birthDate = new Date(form.birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))) {
      setError("You must be at least 18 years old");
      return false;
    }

    // Validate contact number format
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(form.contactNumber)) {
      setError("Please enter a valid contact number");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;
    if (!user) {
      setError("Not authenticated. Please log in again.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Submitting form with data:", form); 
      console.log("User ID:", user.id); 
      console.log("User email:", user.email); 

      let insertError;

      if (form.userType === 'patient') {
        console.log("Inserting patient profile"); 
        
        const { data, error } = await supabase
          .from('patients')
          .insert([{
            patient_id: user.id,
            first_name: form.firstName,
            last_name: form.lastName,
            user_type: form.userType,
            birthdate: form.birthdate,
            contact_no: form.contactNumber,
            email: user.email,
            status: 'active'
          }])
          .select(); 

        console.log("Patient insert result:", { data, error }); 
        insertError = error;
      } else if (form.userType === 'doctor') {
        console.log("Inserting doctor profile"); 
        
        const { data, error } = await supabase
          .from('medicalprofessionals')
          .insert([{
            med_id: user.id,
            first_name: form.firstName,
            last_name: form.lastName,
            user_type: form.userType,
            birthdate: form.birthdate,
            contact_no: form.contactNumber,
            email: user.email,
            status: 'active'
          }])
          .select(); 

        console.log("Doctor insert result:", { data, error }); 
        insertError = error;
      }

      if (insertError) {
        console.error('Database insertion error:', insertError);
        setError(insertError.message || "Failed to save profile.");
        return;
      }

      
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            contact_number: form.contactNumber,
            birthdate: form.birthdate,
            user_type: form.userType,
          }
        });

        if (updateError) {
          console.error('Metadata update error:', updateError);
          
        }
      } catch (metaError) {
        console.error('Metadata update failed:', metaError);
      
      }

      console.log("Profile saved successfully, navigating to dashboard"); // Debug log
    
      navigate('/dashboard');

    } catch (error) {
      console.error('Profile completion error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

 
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F46B5D]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F46B5D]">
        <div className="text-white text-xl">Redirecting...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#F46B5D] py-16 bg-fixed"
      style={{
        backgroundImage: "url('/zyncure_register_bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'absolute',
      }}
    >
      <img
        src="/zyncure_logo.png"
        alt="Zyncure Logo"
        className="block mb-6 w-52 h-auto"
      />
      <div className="max-w-[600px] w-[500px] p-6 rounded-2xl bg-gradient-to-b from-[#FB8F67] to-[#F15629] shadow-lg">
        <h2 className="text-2xl font-bold text-center text-[#F5E0D9] mb-6">Complete Your Profile</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="w-4/5 mx-auto mb-4 p-3 bg-red-200 border border-red-400 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">First Name:</label>
            <input
              name="firstName"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange}
              className="w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-3">
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Last Name:</label>
            <input
              name="lastName"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange}
              className="w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-3">
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Contact Number:</label>
            <input
              name="contactNumber"
              placeholder="Contact Number"
              value={form.contactNumber}
              onChange={handleChange}
              className="w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-3">
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Birthdate:</label>
            <input
              name="birthdate"
              type="date"
              placeholder="Birthdate"
              value={form.birthdate}
              onChange={handleChange}
              className="w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">User Type:</label>
            <div className="relative w-4/5 mx-auto">
              <select
                name="userType"
                value={form.userType}
                onChange={handleChange}
                className="appearance-none w-full mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] text-[#b0b0b0]"
                required
                disabled={isLoading}
              >
                <option value="" className="text-[#b0b0b0]">Select user type</option>
                <option value="patient" className="text-black">Patient</option>
                <option value="doctor" className="text-black">Doctor</option>
              </select>
              
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-4/5 block mx-auto py-2 mt-4 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 bg-[#55A1A4] hover:bg-[#368487] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}