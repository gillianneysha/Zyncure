import { PencilIcon, ChevronRight } from "lucide-react";
import { useState } from "react";


export function PersonalInfoForm() {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">
          Personal Information
        </h2>
        <button className="text-mySidebar">
          <PencilIcon size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-mySidebar mb-1">First Name</label>
          <input
            type="text"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>

        <div>
          <label className="block text-mySidebar mb-1">Middle Name</label>
          <input
            type="text"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>

        <div>
          <label className="block text-mySidebar mb-1">Last Name</label>
          <input
            type="text"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>

        <div>
          <label className="block text-mySidebar mb-1">Email</label>
          <input
            type="email"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-mySidebar mb-1">Birthdate</label>
            <input
              type="date"
              className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
            />
          </div>
          <div className="flex-1">
            <label className="block text-mySidebar mb-1">Mobile Number</label>
            <input
              type="tel"
              className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SecurityPage() {
  

  const handleOptionClick = (option) => {
    // Here you would typically navigate to the respective page or open a modal
    console.log(`Clicked on ${option}`);
  };

  const SecurityOption = ({ title, onClick }) => {
    return (
      <div 
        className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-200 transition-colors"
        onClick={() => onClick(title)}
      >
        <span className="text-mySidebar">{title}</span>
        <ChevronRight className="text-mySidebar" size={20} />
      </div>
    );
  };

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Security</h2>
        <p className="text-zyncureOrange text-left">
          Manage account password and login preferences.
        </p>
      </div>

      <div className="mt-8">
        <SecurityOption 
          title="Change password" 
          onClick={handleOptionClick}
        />
        <SecurityOption 
          title="Two-factor authentication" 
          onClick={handleOptionClick}
        />
      </div>
    </div>
  );
}

export function NotificationPage() {
  // State for toggle switches
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [reminderPush, setReminderPush] = useState(true);
  const [reminderEmail, setReminderEmail] = useState(true);
  
  const [eventNotifications, setEventNotifications] = useState(true);
  const [eventPush, setEventPush] = useState(true);
  const [eventEmail, setEventEmail] = useState(true);

  // Toggle component
  const Toggle = ({ enabled, onChange }) => {
    return (
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${
          enabled ? "bg-profileHeader" : "bg-gray-200"
        }`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  };

  // Notification category component
  const NotificationCategory = ({ 
    title, 
    description, 
    mainEnabled, 
    setMainEnabled,
    pushEnabled,
    setPushEnabled,
    emailEnabled,
    setEmailEnabled
  }) => {
    return (
      <div className="mb-8 ">
        <div className="text-profileText font-bold text-lg">{title}</div>
        <div className="text-profileSubtext text-base mb-2">Manage {description} notifications.</div>
        
        <div className="bg-profileBg rounded-lg p-4 border border-mySidebar">
          <div className="flex justify-between items-center py-2">
            <span className="text-mySidebar">Allow reminder notifications</span>
            <Toggle enabled={mainEnabled} onChange={setMainEnabled} />
          </div>
          
          <div className="flex justify-between items-center py-2 ">
            <span className="text-mySidebar">Push</span>
            <Toggle 
              enabled={mainEnabled && pushEnabled} 
              onChange={setPushEnabled} 
            />
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-mySidebar">Email</span>
            <Toggle 
              enabled={mainEnabled && emailEnabled} 
              onChange={setEmailEnabled} 
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px] overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Notifications</h2>
      </div>
      
      <NotificationCategory
        title="Reminders"
        description="reminders"
        mainEnabled={reminderNotifications}
        setMainEnabled={setReminderNotifications}
        pushEnabled={reminderPush}
        setPushEnabled={setReminderPush}
        emailEnabled={reminderEmail}
        setEmailEnabled={setReminderEmail}
      />
      
      <NotificationCategory
        title="Events"
        description="events"
        mainEnabled={eventNotifications}
        setMainEnabled={setEventNotifications}
        pushEnabled={eventPush}
        setPushEnabled={setEventPush}
        emailEnabled={eventEmail}
        setEmailEnabled={setEventEmail}
      />
    </div>
  );
}

export function BillingPage() {
  

  const handleOptionClick = (option) => {
    // Here you would typically navigate to the respective page or open a modal
    console.log(`Clicked on ${option}`);
  };

  const SecurityOption = ({ title, onClick }) => {
    return (
      <div 
        className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-200 transition-colors"
        onClick={() => onClick(title)}
      >
        <span className="text-mySidebar">{title}</span>
        <ChevronRight className="text-mySidebar" size={20} />
      </div>
    );
  };

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Billing</h2>
        <p className="text-zyncureOrange text-left">
          Payment methods and subscriptions are monitored here
        </p>
      </div>

      <div className="mt-8">
        <SecurityOption 
          title="Subscriptions" 
          onClick={handleOptionClick}
        />
        <SecurityOption 
          title="Payment methods" 
          onClick={handleOptionClick}
        />
        <SecurityOption 
          title="Contact Information" 
          onClick={handleOptionClick}
        />
      </div>
    </div>
  );
}

export function PoliciesPage() {
 

  const handleOptionClick = (option) => {
    // Here you would typically navigate to the respective page or open a modal
    console.log(`Clicked on ${option}`);
  };

  const SecurityOption = ({ title, onClick }) => {
    return (
      <div 
        className="flex items-center justify-between rounded-xl border border-mySidebar px-5 py-4 mb-4 cursor-pointer hover:bg-red-200 transition-colors"
        onClick={() => onClick(title)}
      >
        <span className="text-mySidebar">{title}</span>
        <ChevronRight className="text-mySidebar" size={20} />
      </div>
    );
  };

  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Policies and Standards</h2>
      </div>

      <div className="mt-8">
        <SecurityOption 
          title="Terms of Service" 
          onClick={handleOptionClick}
        />
        <SecurityOption 
          title="Privacy Policy" 
          onClick={handleOptionClick}
        />
        <SecurityOption 
          title="Community Standards" 
          onClick={handleOptionClick}
        />
      </div>
    </div>
  );
}

export function DeleteAccountPage() {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">
          Saying Goodbye?
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-mySidebar mb-1">Email</label>
          <input
            type="text"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>

        <div>
          <label className="block text-mySidebar mb-1">Password</label>
          <input
            type="text"
            className="w-full p-2 border border-mySidebar rounded-xl bg-profileBg"
          />
        </div>
        <div className="flex justify-center mt-6">
          <button className="bg-profileHeader text-white px-6 py-2 rounded-xl font-bold hover:bg-red-600 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
