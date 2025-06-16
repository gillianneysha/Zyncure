import { useState } from "react";
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
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Not authenticated.");
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        contact_number: form.contactNumber,
        birthdate: form.birthdate,
        user_type: form.userType,
        updated_at: new Date().toISOString(),
      });
    if (updateError) {
      setError(updateError.message || "Failed to save profile.");
    } else {
      // Fetch the profile again to confirm all fields are present
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (
        profile &&
        profile.first_name &&
        profile.last_name &&
        profile.contact_number &&
        profile.birthdate &&
        profile.user_type
      ) {
        navigate("/home");
      } else {
        setError("Profile incomplete. Please fill in all fields.");
      }
    }
  };

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
              >
                <option value="" className="text-[#b0b0b0]">Select user type</option>
                <option value="patient" className="text-black">Patient</option>
                <option value="doctor" className="text-black">Doctor</option>
              </select>
              {/* Custom down arrow */}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b0b0]">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="w-4/5 block mx-auto py-2 mt-4 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 bg-[#55A1A4] hover:bg-[#368487]"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}