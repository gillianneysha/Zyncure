import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

function LogoutModal({ open, onCancel, onConfirm }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-[370px] max-w-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Log out of ZynCure?</h2>
                <p className="text-gray-500 mb-6">You can always log back in at any time.</p>
                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold bg-white hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-lg bg-[#F46B5D] text-white font-semibold hover:bg-[#e05a4d] transition"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LogoutModal;