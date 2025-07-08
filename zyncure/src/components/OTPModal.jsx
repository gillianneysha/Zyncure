import React, { useEffect, useState, useRef } from "react";

export default function OTPModal({
    open,
    otpCode,
    onChange,
    onSubmit,
    onClose,
    error,
    loading,
    onResend,
    resendCooldown = 60
}) {
    const [secondsLeft, setSecondsLeft] = useState(resendCooldown);
    const timerRef = useRef();

    useEffect(() => {
        if (!open) return;
        setSecondsLeft(resendCooldown);
        timerRef.current = setInterval(() => {
            setSecondsLeft((sec) => {
                if (sec <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return sec - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [open, resendCooldown]);

    const handleResend = () => {
        if (onResend && secondsLeft === 0) {
            onResend();
            setSecondsLeft(resendCooldown);
            // Restart timer
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setSecondsLeft((sec) => {
                    if (sec <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return sec - 1;
                });
            }, 1000);
        }
    };

    if (!open) return null;

    // Format timer as mm:ss
    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl p-8 w-full max-w-xs shadow-2xl relative">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                    onClick={onClose}
                    aria-label="Close"
                    disabled={loading}
                >
                    &times;
                </button>
                <h2 className="text-2xl font-bold mb-2 text-[#55A1A4] text-center">Enter OTP</h2>
                <p className="mb-4 text-gray-700 text-center text-sm">
                    Please enter the OTP sent to your email.<br />
                    <span className="text-xs text-gray-500">
                        Expires in <span className="font-semibold">{formatTime(secondsLeft)}</span>
                    </span>
                </p>
                <form onSubmit={onSubmit}>
                    <input
                        type="text"
                        value={otpCode}
                        onChange={onChange}
                        placeholder="Enter OTP code"
                        className="w-full p-3 mb-2 border rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#55A1A4] tracking-widest"
                        maxLength={6}
                        disabled={loading}
                        autoFocus
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                    {error && (
                        <div className="mb-2 text-red-500 text-sm text-center">{error}</div>
                    )}
                    <button
                        type="submit"
                        className="w-full py-2 mt-2 text-white bg-[#55A1A4] rounded-lg font-semibold transition-colors duration-200 hover:bg-[#368487]"
                        disabled={loading}
                    >
                        {loading ? "Verifying..." : "Verify OTP"}
                    </button>
                </form>
                <div className="mt-4 flex flex-col items-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={secondsLeft > 0 || loading}
                        className={`w-full py-2 font-semibold rounded-lg transition-colors
                            ${secondsLeft > 0 || loading
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-[#F46B5D] text-[#FFEDE7] hover:bg-[#d43d2e]"
                            }`}
                        style={{
                            letterSpacing: "0.05em"
                        }}
                    >
                        {secondsLeft > 0
                            ? `Resend OTP in ${formatTime(secondsLeft)}`
                            : "Resend OTP"}
                    </button>
                </div>
            </div>
        </div>
    );
}