import React, { useState } from 'react';
// import { supabase } from '../client';

export default function RegistrationForm() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        contactNumber: '',
        birthdate: '',
        userType: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    function handleChange(event) {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    }

    function handleSubmit(event) {
        event.preventDefault();
        alert('Registration form submitted! (Implement submission logic)');
        // Implement actual registration logic with Supabase here
    }

    return (
        <form onSubmit={handleSubmit}>
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">First Name:</label>
            <input
                placeholder="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Last Name:</label>
            <input
                placeholder="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Contact Number:</label>
            <input
                placeholder="Contact Number"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Birthdate:</label>
            <input
                type="date"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] placeholder:text-[#b0b0b0]"
                required
            />
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">User Type:</label>
            <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px] text-[#b0b0b0]"
                required
            >
                <option value="" className="text-[#b0b0b0]">Select user type</option>
                <option value="patient" className="text-black">Patient</option>
                <option value="doctor" className="text-black">Doctor</option>
            </select>
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Email:</label>
            <input
                placeholder="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Password:</label>
            <input
                placeholder="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Confirm Password:</label>
            <input
                placeholder="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-4/5 block mx-auto mb-4 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <button
                type="submit"
                className="w-4/5 block mx-auto py-2 mt-8 bg-[#55A1A4] hover:bg-[#368487] text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200"
            >
                Sign Up
            </button>
            <div className="mt-2 w-4/5 mx-auto text-[#F5E0D9] text-xs text-left">
                By creating an account, you agree to our <span className="underline">Terms</span> and have read and acknowledge the <span className="underline">Privacy Agreement</span>.
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
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M5.26644 9.76453C6.19903 6.93863 8.85469 4.90909 12.0002 4.90909C13.6912 4.90909 15.2184 5.50909 16.4184 6.49091L19.9093 3C17.7821 1.14545 15.0548 0 12.0002 0C7.27031 0 3.19799 2.6983 1.24023 6.65002L5.26644 9.76453Z" fill="#EA4335"/>
                        <path d="M16.0406 18.0142C14.9508 18.718 13.5659 19.0926 11.9998 19.0926C8.86633 19.0926 6.21896 17.0785 5.27682 14.2695L1.2373 17.3366C3.19263 21.2953 7.26484 24.0017 11.9998 24.0017C14.9327 24.0017 17.7352 22.959 19.834 21.0012L16.0406 18.0142Z" fill="#34A853"/>
                        <path d="M19.8342 20.9978C22.0292 18.9503 23.4545 15.9019 23.4545 11.9982C23.4545 11.2891 23.3455 10.5255 23.1818 9.81641H12V14.4528H18.4364C18.1188 16.0119 17.2663 17.2194 16.0407 18.0108L19.8342 20.9978Z" fill="#4A90E2"/>
                        <path d="M5.27698 14.2663C5.03833 13.5547 4.90909 12.7922 4.90909 11.9984C4.90909 11.2167 5.03444 10.4652 5.2662 9.76294L1.23999 6.64844C0.436587 8.25884 0 10.0738 0 11.9984C0 13.918 0.444781 15.7286 1.23746 17.3334L5.27698 14.2663Z" fill="#FBBC05"/>
                    </svg>
                </button>
                <span className="mt-3 text-[#F5E0D9] text-sm">Sign up using your Google account</span>
            </div>
        </form>
    );
}