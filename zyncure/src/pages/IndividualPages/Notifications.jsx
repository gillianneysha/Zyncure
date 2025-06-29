
import { useState } from "react";


export default function NotificationPage() {

  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [reminderPush, setReminderPush] = useState(true);
  const [reminderEmail, setReminderEmail] = useState(true);

  const [eventNotifications, setEventNotifications] = useState(true);
  const [eventPush, setEventPush] = useState(true);
  const [eventEmail, setEventEmail] = useState(true);


  const Toggle = ({ enabled, onChange }) => {
    return (
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${enabled ? "bg-profileHeader" : "bg-gray-200"
          }`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? "translate-x-6" : "translate-x-1"
            }`}
        />
      </button>
    );
  };


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