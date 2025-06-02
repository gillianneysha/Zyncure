import React, { useState, memo, useCallback } from 'react';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

// Memoize the form components
const MemoizedLoginForm = memo(LoginForm);
const MemoizedRegistrationForm = memo(RegistrationForm);

export default function AuthContainer({ setToken }) {
    const [activeTab, setActiveTab] = useState('register');

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
    }, []);

    const handleLoginClick = useCallback(() => handleTabChange('login'), [handleTabChange]);
    const handleRegisterClick = useCallback(() => handleTabChange('register'), [handleTabChange]);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center bg-[#F46B5D] py-16"
            style={{
                backgroundImage: "url('/zyncure_register_bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <img
                src="/zyncure_logo.png"
                alt="Zyncure Logo"
                className="block mb-6 w-52 h-auto"
            />
            
            {/* Tabs */}
            <div className="flex text-white text-center w-[500px] max-w-[600px] mx-auto mb-0 mt-4">
                <button
                    type="button"
                    className={`w-1/2 py-3 px-4 transition-colors duration-300 z-10 ${
                        activeTab === 'login'
                            ? 'bg-[#FB8F67] opacity-100 rounded-tl-2xl rounded-tr-2xl'
                            : 'bg-[#F15629] opacity-80 rounded-tl-2xl rounded-tr-2xl'
                    }`}
                    onClick={handleLoginClick}
                >
                    <span className="font-medium w-full block">Login</span>
                </button>
                <button
                    type="button"
                    className={`w-1/2 py-3 px-4 transition-colors duration-300 z-20 ${
                        activeTab === 'register'
                            ? 'bg-[#FB8F67] opacity-100 rounded-tl-2xl rounded-tr-2xl'
                            : 'bg-[#F15629] opacity-80 rounded-tl-2xl rounded-tr-2xl'
                    }`}
                    onClick={handleRegisterClick}
                >
                    <span className="font-medium w-full block">Register</span>
                </button>
            </div>

            <div className="max-w-[600px] w-[500px] p-6 rounded-b-lg bg-gradient-to-b from-[#FB8F67] to-[#F15629] shadow-lg">
                {activeTab === 'login' ? (
                    <MemoizedLoginForm setToken={setToken} />
                ) : (
                    <MemoizedRegistrationForm />
                )}
            </div>
        </div>
    );
}