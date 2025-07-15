import { useState, useEffect } from "react";
import { SquareUser, PencilIcon } from "lucide-react";
import { supabase } from "../../client.js";

// Success Modal Component
function AdminInfoSuccessModal({ open, onClose }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Changes Saved Successfully!</h3>
                    <p className="text-gray-600 mb-6">Your personal information has been updated.</p>
                    <button
                        onClick={onClose}
                        className="bg-[#55A1A4] text-white px-6 py-2 rounded-xl font-semibold hover:bg-[#368487] transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AdminPersonalInfoForm() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [originalData, setOriginalData] = useState(null);

    useEffect(() => {
        async function fetchAdminInfo() {
            setLoading(true);
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError) {
                    console.error("Error getting user:", userError);
                    setError("Failed to authenticate user");
                    setLoading(false);
                    return;
                }

                if (!user) {
                    setError("No user found");
                    setLoading(false);
                    return;
                }

                console.log("Admin User ID:", user.id); 

                
                let { data: adminData, error: adminError } = await supabase
                    .from("admin")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (adminError && adminError.code !== 'PGRST116') { 
                    console.error("Error fetching admin data:", adminError);
                    setError("Failed to fetch admin data");
                    setLoading(false);
                    return;
                }

                let profile = {};
                if (adminData) {
                    profile = adminData;
                    console.log("Admin data found:", profile); 
                } else {
                    
                    profile = user.user_metadata || {};
                    console.log("Using user metadata:", profile); 
                }

               
                let firstName = "";
                let lastName = "";

                if (profile.full_name) {
                    const nameParts = profile.full_name.split(' ');
                    firstName = nameParts[0] || "";
                    lastName = nameParts.slice(1).join(' ') || "";
                }

                const formattedData = {
                    firstName: firstName,
                    lastName: lastName,
                    email: user.email || profile.email || "",
                };

                setFormData(formattedData);
                setOriginalData(formattedData);
                setLoading(false);
            } catch (err) {
                console.error("Unexpected error in fetchAdminInfo:", err);
                setError("An unexpected error occurred");
                setLoading(false);
            }
        }
        fetchAdminInfo();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) {
                console.error("Error getting user for save:", userError);
                setError("Authentication failed");
                setSaving(false);
                return;
            }

            if (!user) {
                setError("Not authenticated.");
                setSaving(false);
                return;
            }

            console.log("Attempting to save admin data for user:", user.id); 
            console.log("Form data to save:", formData); 

           
            const updateData = {
                user_id: user.id,
                full_name: `${formData.firstName} ${formData.lastName}`.trim(),
                email: formData.email,
                is_active: true,
                updated_at: new Date().toISOString(),
            };

            console.log("Updating admin table with data:", updateData); 

            const { data, error: updateError } = await supabase
                .from("admin")
                .upsert(updateData, {
                    onConflict: "user_id"
                });

            if (updateError) {
                console.error("Database error:", updateError);
                setError(`Failed to save changes: ${updateError.message}`);
            } else {
                console.log("Save successful:", data); 
                setShowSuccessModal(true);
                setIsEditing(false);
              
                setOriginalData({ ...formData });
            }
        } catch (err) {
            console.error("Unexpected error in handleSave:", err);
            setError("An unexpected error occurred while saving");
        }

        setSaving(false);
    };

    const isChanged = originalData
        ? Object.keys(formData).some(
            (key) => formData[key] !== originalData[key]
        )
        : false;

    if (loading) {
        return (
            <div className="bg-profileBg rounded-xl p-8 h-[700px] flex items-center justify-center">
                <div className="text-mySidebar">Loading...</div>
            </div>
        );
    }

    return (
        <div className="bg-profileBg rounded-xl p-8 h-[700px]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-4xl text-profileHeader font-bold flex items-center gap-3">
                    <SquareUser className="w-9 h-9 text-profileHeader" />
                    Admin Information
                </h2>
                <div className="relative group">
                    <button
                        className={`
              transition-all duration-300
              p-2 rounded-xl
              border
              ${isEditing
                                ? "bg-[#55A1A4]/10 border-[#55A1A4] text-[#55A1A4] scale-110 rotate-12 shadow"
                                : "border-transparent hover:bg-[#55A1A4]/10 hover:border-[#55A1A4] hover:text-[#55A1A4] text-mySidebar"
                            }
            `}
                        type="button"
                        onClick={() => {
                            if (isEditing) {
                                setFormData(originalData);
                                setIsEditing(false);
                            } else {
                                setIsEditing(true);
                            }
                        }}
                        aria-label={isEditing ? "Cancel Editing" : "Edit Admin Information"}
                        title={isEditing ? "Cancel Editing" : "Edit Admin Information"}
                    >
                        <PencilIcon size={20} />
                    </button>
                    <div
                        className={`
              absolute z-10 left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded
              text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity
            `}
                        style={{
                            whiteSpace: "nowrap",
                            background: "#55A1A4"
                        }}
                    >
                        {isEditing ? "Cancel Editing" : "Edit Admin Information"}
                    </div>
                </div>
            </div>

            {error && <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-lg">{error}</div>}

            <form className="space-y-6" onSubmit={handleSave}>
                <div>
                    <label className="block text-mySidebar mb-2 font-medium">First Name</label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full p-3 border border-mySidebar rounded-xl bg-profileBg focus:outline-none focus:ring-2 focus:ring-[#55A1A4] focus:border-transparent"
                        disabled={!isEditing || loading || saving}
                        placeholder="Enter your first name"
                    />
                </div>

                <div>
                    <label className="block text-mySidebar mb-2 font-medium">Last Name</label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full p-3 border border-mySidebar rounded-xl bg-profileBg focus:outline-none focus:ring-2 focus:ring-[#55A1A4] focus:border-transparent"
                        disabled={!isEditing || loading || saving}
                        placeholder="Enter your last name"
                    />
                </div>

                <div>
                    <label className="block text-mySidebar mb-2 font-medium">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full p-3 border border-mySidebar rounded-xl bg-profileBg text-gray-600 cursor-not-allowed"
                        placeholder="Email cannot be changed"
                    />
                    <p className="text-sm text-gray-500 mt-1">Email address cannot be modified</p>
                </div>

                <div className="flex justify-center pt-6">
                    <button
                        type="submit"
                        className={`bg-[#55A1A4] text-white px-6 py-3 rounded-xl font-semibold text-lg hover:bg-[#368487] transition-colors ${(!isEditing || loading || saving || !isChanged)
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:shadow-lg"
                            }`}
                        disabled={!isEditing || loading || saving || !isChanged}
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>

            <AdminInfoSuccessModal
                open={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
            />
        </div>
    );
}