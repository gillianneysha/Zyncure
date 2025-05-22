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
                </button>
                <p className="mt-2">Log in using your Google account</p>
            </div>
        </form>
    );
}