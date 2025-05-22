import React, { useState } from "react";
import { supabase } from "../client";

export default function RegistrationForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    birthdate: "",
    userType: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  }

  function validateForm() {
    const newErrors = {};

    // password 
    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    // confirm password 
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    // contact number 
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(formData.contactNumber)) {
      newErrors.contactNumber = "Please enter a valid contact number";
    }

    // age  
    const birthDate = new Date(formData.birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      newErrors.birthdate = "You must be at least 18 years old to register";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Create auth user with profile data in metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            contact_number: formData.contactNumber,
            birthdate: formData.birthdate,
            user_type: formData.userType,
          },
        },
      });

      if (authError) throw authError;

      // Manually create profile if trigger doesnt work
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          contact_number: formData.contactNumber,
          birthdate: formData.birthdate,
          user_type: formData.userType,
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      setSuccessMessage(
        "Registration successful! Please check your email for verification."
      );

      // Clear form
      setFormData({
        firstName: "",
        lastName: "",
        contactNumber: "",
        birthdate: "",
        userType: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({
        submit: error.message || "Registration failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Success Message */}
      {successMessage && (
        <div className="w-4/5 mx-auto mb-4 p-3 bg-green-200 border border-green-400 text-green-800 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errors.submit && (
        <div className="w-4/5 mx-auto mb-4 p-3 bg-red-200 border border-red-400 text-red-800 rounded-lg text-sm">
          {errors.submit}
        </div>
      )}

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        First Name:
      </label>
      <input
        placeholder="First Name"
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] ${
          errors.firstName ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      />
      {errors.firstName && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.firstName}
        </p>
      )}
      <div className="mb-3"></div>

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        Last Name:
      </label>
      <input
        placeholder="Last Name"
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] ${
          errors.lastName ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      />
      {errors.lastName && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.lastName}
        </p>
      )}
      <div className="mb-3"></div>

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        Contact Number:
      </label>
      <input
        placeholder="Contact Number"
        name="contactNumber"
        value={formData.contactNumber}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] ${
          errors.contactNumber ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      />
      {errors.contactNumber && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.contactNumber}
        </p>
      )}
      <div className="mb-3"></div>

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        Birthdate:
      </label>
      <input
        type="date"
        name="birthdate"
        value={formData.birthdate}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] placeholder:text-[#b0b0b0] ${
          errors.birthdate ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      />
      {errors.birthdate && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.birthdate}
        </p>
      )}
      <div className="mb-3"></div>

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        User Type:
      </label>
      <select
        name="userType"
        value={formData.userType}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] text-[#b0b0b0] ${
          errors.userType ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      >
        <option value="" className="text-[#b0b0b0]">
          Select user type
        </option>
        <option value="patient" className="text-black">
          Patient
        </option>
        <option value="doctor" className="text-black">
          Doctor
        </option>
      </select>
      {errors.userType && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.userType}
        </p>
      )}
      <div className="mb-3"></div>

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        Email:
      </label>
      <input
        placeholder="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] ${
          errors.email ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      />
      {errors.email && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.email}
        </p>
      )}
      <div className="mb-3"></div>

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        Password:
      </label>
      <input
        placeholder="Password (min 6 characters)"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] ${
          errors.password ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      />
      {errors.password && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.password}
        </p>
      )}
      <div className="mb-3"></div>

      <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">
        Confirm Password:
      </label>
      <input
        placeholder="Confirm Password"
        name="confirmPassword"
        type="password"
        value={formData.confirmPassword}
        onChange={handleChange}
        className={`w-4/5 block mx-auto mb-1 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] ${
          errors.confirmPassword ? "ring-2 ring-red-400" : ""
        }`}
        required
        disabled={isLoading}
      />
      {errors.confirmPassword && (
        <p className="w-4/5 mx-auto mb-2 text-sm text-red-300">
          {errors.confirmPassword}
        </p>
      )}
      <div className="mb-4"></div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-4/5 block mx-auto py-2 mt-8 text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200 ${
          isLoading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-[#55A1A4] hover:bg-[#368487]"
        }`}
      >
        {isLoading ? "Creating Account..." : "Sign Up"}
      </button>

      <div className="mt-2 w-4/5 mx-auto text-[#F5E0D9] text-xs text-left">
        By creating an account, you agree to our{" "}
        <span className="underline">Terms</span> and have read and acknowledge
        the <span className="underline">Privacy Agreement</span>.
      </div>

      <div className="w-full flex items-center justify-center mt-8 mb-8">
        <span className="flex-1 h-px bg-[#FEDED2] mx-2"></span>
        <span className="text-[#F5E0D9] text-base font-semibold px-4">OR</span>
        <span className="flex-1 h-px bg-[#FEDED2] mx-2"></span>
      </div>

      <div className="flex flex-col items-center mb-8">
        <button
          type="button"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#FFEDE7] shadow-lg hover:shadow-xl transition"
          aria-label="Sign up with Google"
          disabled={isLoading}
        ></button>
        <span className="mt-3 text-[#F5E0D9] text-sm">
          Sign up using your Google account
        </span>
      </div>
    </form>
  );
}
