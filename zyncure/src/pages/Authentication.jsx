import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegistrationForm from './RegistrationForm';

export default function AuthContainer({ setToken }) {
    const [activeTab, setActiveTab] = useState('register');

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
            {/* Tabs for Login and Register */}
            <div className="flex text-white text-center w-[500px] max-w-[600px] mx-auto mb-0 mt-4">
                <div
                    className={`w-1/2 py-3 px-4 cursor-pointer transition-colors duration-300 z-10 ${
                        activeTab === 'login'
                            ? 'bg-[#FB8F67] opacity-100 rounded-tl-2xl rounded-tr-2xl'
                            : 'bg-[#F15629] opacity-80 rounded-tl-2xl rounded-tr-2xl'
                    }`}
                    onClick={() => setActiveTab('login')}
                >
                    <span className="font-medium w-full block">Login</span>
                </div>
                <div
                    className={`w-1/2 py-3 px-4 cursor-pointer transition-colors duration-300 z-20 ${
                        activeTab === 'register'
                            ? 'bg-[#FB8F67] opacity-100 rounded-tl-2xl rounded-tr-2xl'
                            : 'bg-[#F15629] opacity-80 rounded-tl-2xl rounded-tr-2xl'
                    }`}
                    onClick={() => setActiveTab('register')}
                >
                    <span className="font-medium w-full block">Register</span>
                </div>
            </div>
            <div className="max-w-[600px] w-[500px] p-6 rounded-b-lg bg-gradient-to-b from-[#FB8F67] to-[#F15629] shadow-lg">
                {activeTab === 'login' ? (
                    <LoginForm setToken={setToken} />
                ) : (
                    <RegistrationForm />
                )}
            </div>
        </div>
    );
}