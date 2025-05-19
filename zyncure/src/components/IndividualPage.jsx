import { PencilIcon } from "lucide-react";

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
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Security</h2>
        <p className="text-zyncureOrange text-left">
          Manage account password and login preferences.
        </p>
      </div>
    </div>
  );
}

export function NotificationPage() {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Notifications</h2>
      </div>
    </div>
  );
}

export function BillingPage() {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Billing</h2>
        <p className="text-zyncureOrange text-left">
          Payment methods and subscriptions are monitored here.
        </p>
      </div>
    </div>
  );
}

export function PoliciesPage() {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Policies and Standards</h2>
      </div>
    </div>
  );
}

export function DeleteAccountPage() {
  return (
    <div className="bg-profileBg rounded-xl p-8 h-[700px]">
      <div className="mb-6">
        <h2 className="text-4xl text-profileHeader font-bold">Saying Goodbye?</h2>
        
      </div>
    </div>
  );
}
