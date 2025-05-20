import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../client';

export default function LoginForm({ setToken }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        loginEmail: '',
        loginPassword: ''
    });

    function handleChange(event) {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.loginEmail,
                password: formData.loginPassword
            });

            if (error) throw error;
            setToken(data); 
            navigate('/home');
        }
        catch (error) {
            alert(error);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Email:</label>
            <input
                type="email"
                name="loginEmail"
                value={formData.loginEmail}
                onChange={handleChange}
                placeholder="Email"
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <label className="block w-4/5 mx-auto mb-1 text-[#F5E0D9] text-left">Password:</label>
            <input
                type="password"
                name="loginPassword"
                value={formData.loginPassword}
                onChange={handleChange}
                placeholder="Password"
                className="w-4/5 block mx-auto mb-3 p-2 bg-[#E5E7DD] border-none rounded-[15.5px]"
                required
            />
            <div className="w-4/5 mx-auto text-right mb-4">
                <a href="#" className="text-xs text-[#F5E0D9] hover:underline">Forgot Password?</a>
            </div>
            <button
                type="submit"
                className="w-4/5 block mx-auto py-2 mt-4 bg-[#55A1A4] hover:bg-[#368487] text-white border-none rounded-[15.5px] font-semibold transition-colors duration-200"
            >
                Log In
            </button>
            <div className="w-4/5 mx-auto text-[#F5E0D9] text-xs text-center mt-6">
                <div className="flex items-center justify-center my-4">
                    <div className="flex-grow h-px bg-[#FEDED2]"></div>
                    <span className="px-2">OR</span>
                    <div className="flex-grow h-px bg-[#FEDED2]"></div>
                </div>
                <button 
                    type="button" 
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-[#FFEDE7] shadow-lg hover:shadow-xl transition mx-auto"
                    aria-label="Sign in with Google"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M5.26644 9.76453C6.19903 6.93863 8.85469 4.90909 12.0002 4.90909C13.6912 4.90909 15.2184 5.50909 16.4184 6.49091L19.9093 3C17.7821 1.14545 15.0548 0 12.0002 0C7.27031 0 3.19799 2.6983 1.24023 6.65002L5.26644 9.76453Z" fill="#EA4335"/>
                        <path d="M16.0406 18.0142C14.9508 18.718 13.5659 19.0926 11.9998 19.0926C8.86633 19.0926 6.21896 17.0785 5.27682 14.2695L1.2373 17.3366C3.19263 21.2953 7.26484 24.0017 11.9998 24.0017C14.9327 24.0017 17.7352 22.959 19.834 21.0012L16.0406 18.0142Z" fill="#34A853"/>
                        <path d="M19.8342 20.9978C22.0292 18.9503 23.4545 15.9019 23.4545 11.9982C23.4545 11.2891 23.3455 10.5255 23.1818 9.81641H12V14.4528H18.4364C18.1188 16.0119 17.2663 17.2194 16.0407 18.0108L19.8342 20.9978Z" fill="#4A90E2"/>
                        <path d="M5.27698 14.2663C5.03833 13.5547 4.90909 12.7922 4.90909 11.9984C4.90909 11.2167 5.03444 10.4652 5.2662 9.76294L1.23999 6.64844C0.436587 8.25884 0 10.0738 0 11.9984C0 13.918 0.444781 15.7286 1.23746 17.3334L5.27698 14.2663Z" fill="#FBBC05"/>
                    </svg>
                </button>
                <p className="mt-2">Log in using your Google account</p>
            </div>
        </form>
    );
}