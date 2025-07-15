import { useState } from "react";
import { LogOut } from "lucide-react";
import LogoutModal from "../../components/LogoutModal.jsx";
import { AdminPersonalInfoForm } from "./AdminPersonalInfoForm.jsx"; // Import the new component
import { SecurityPage, PoliciesPage, DeleteAccountPage } from "../../components/IndividualPage.jsx";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../client.js";

export default function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState("My Profile");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleLogoutClick = () => setShowLogoutModal(true);

  const handleLogoutConfirm = async () => {
    await supabase.auth.signOut();
    setShowLogoutModal(false);
    navigate("/", { replace: true });
  };

  const handleLogoutCancel = () => setShowLogoutModal(false);

  const tabs = [
    { id: "My Profile", component: <AdminPersonalInfoForm /> }, 
    { id: "Security", component: <SecurityPage /> },
    { id: "Policies and Standards", component: <PoliciesPage /> },
    { id: "Delete Account", component: <DeleteAccountPage /> }
  ];

  return (
    <div className="flex flex-row h-full">
      {/* Sidebar for profile tabs */}
      <div className="w-80 p-6 space-y-2">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`p-4 rounded-3xl cursor-pointer transition-colors ${activeTab === tab.id
              ? "bg-profileBg text-profileText font-bold"
              : "bg-profileBg hover:bg-rose-200 text-profileText"
              }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.id}
          </div>
        ))}
        {/* Logout */}
        <div
          className="flex items-center p-4 rounded-3xl cursor-pointer hover:bg-rose-200 text-profileText mt-4"
          onClick={handleLogoutClick}
        >
          <LogOut size={20} className="mr-2" />
          <span>Log out</span>
        </div>
      </div>
      {/* Main content area */}
      <div className="flex-1 p-6">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
      {/* Logout Modal */}
      <LogoutModal
        open={showLogoutModal}
        onCancel={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}