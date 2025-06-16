import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import LogoutModal from "../../components/LogoutModal";
import { PersonalInfoForm } from "../../components/IndividualPage.jsx";
import { SecurityPage } from "../../components/IndividualPage.jsx";
import { NotificationPage } from "../../components/IndividualPage.jsx";
import { BillingPage } from "../../components/IndividualPage.jsx";
import { PoliciesPage } from "../../components/IndividualPage.jsx";
import { DeleteAccountPage } from "../../components/IndividualPage.jsx";
import { supabase } from "../../client"; // <-- Add this

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("My Profile");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => setShowLogoutModal(true);

  const handleLogoutConfirm = async () => {
    await supabase.auth.signOut();
    setShowLogoutModal(false);
    navigate('/', { replace: true });
  };

  const handleLogoutCancel = () => setShowLogoutModal(false);

  const tabs = [
    { id: "My Profile", component: <PersonalInfoForm /> },
    { id: "Security", component: <SecurityPage /> },
    { id: "Notification", component: <NotificationPage /> },
    { id: "Billing", component: <BillingPage /> },
    { id: "Policies and Standards", component: <PoliciesPage /> },
    { id: "Delete Account", component: <DeleteAccountPage /> }
  ];

  return (
    <div className="flex flex-row">
      {/* sidebarrr  */}
      <div className="w-80 p-6 space-y-2">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`p-4 rounded-3xl cursor-pointer transition-colors ${
              activeTab === tab.id
                ? "bg-profileBg text-profileText font-bold"
                : "bg-profileBg hover:bg-rose-200 text-profileText"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.id}
          </div>
        ))}
        
        {/* Logout*/}
        <div 
          className="flex items-center p-4 rounded-lg cursor-pointer hover:bg-profileBg text-profileText mt-4"
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

