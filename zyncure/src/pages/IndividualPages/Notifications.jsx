import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, Info } from "lucide-react";
import { supabase } from "../../client";

export default function NotificationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [saveStatus, setSaveStatus] = useState(''); 
  const [isInitialized, setIsInitialized] = useState(false);

 
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [reminderPush, setReminderPush] = useState(true);
  const [reminderEmail, setReminderEmail] = useState(true);

 
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    initializeSettings();
  }, []);

  async function initializeSettings() {
    try {
    
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setCurrentUser(user);
      await loadNotificationSettings(user.id);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  }

  async function loadNotificationSettings(userId) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { 
        console.error('Error loading notification settings:', error);
        setSaveStatus('error');
        return;
      }

      if (data) {
        
        setReminderNotifications(data.reminder_notifications ?? true);
        setReminderPush(data.reminder_push ?? true);
        setReminderEmail(data.reminder_email ?? true);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setSaveStatus('error');
    }
  }

  async function saveNotificationSettings() {
    if (!currentUser) return;

    setSaving(true);
    setSaveStatus('');
    
    try {
      const settings = {
        user_id: currentUser.id,
        reminder_notifications: reminderNotifications,
        reminder_push: reminderPush,
        reminder_email: reminderEmail,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(settings, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error saving notification settings:', error);
        setSaveStatus('error');
      } else {
        console.log('Notification settings saved successfully');
        setSaveStatus('success');
       
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }


  useEffect(() => {
  
    if (!isInitialized || !currentUser) {
      return;
    }

   
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    
    saveTimeoutRef.current = setTimeout(() => {
      saveNotificationSettings();
    }, 500);

  
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [reminderNotifications, reminderPush, reminderEmail, isInitialized, currentUser]);

const handleReminderNotificationsToggle = (value) => {
  setReminderNotifications(value);
  
  if (!value) {
    setReminderPush(false);
    setReminderEmail(false);
  }
 
  if (isInitialized && currentUser) {
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setTimeout(() => saveNotificationSettings(), 100);
  }
};

  const handleReminderPushToggle = (value) => {
    setReminderPush(value);
    
    if (value && !reminderNotifications) {
      setReminderNotifications(true);
    }
  };

  const handleReminderEmailToggle = (value) => {
    setReminderEmail(value);
   
    if (value && !reminderNotifications) {
      setReminderNotifications(true);
    }
  };

  const Toggle = ({ enabled, onChange, disabled = false }) => {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-profileHeader focus:ring-offset-2 ${
          disabled 
            ? "bg-gray-300 cursor-not-allowed opacity-50" 
            : enabled 
              ? "bg-profileHeader hover:bg-[#368487]" 
              : "bg-mySidebar hover:bg-opacity-80"
        }`}
        onClick={() => !disabled && onChange(!enabled)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
            enabled ? "translate-x-6" : "translate-x-1"
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
      <div className="mb-8">
        <div className="text-profileHeader font-bold text-lg mb-2">{title}</div>
        <div className="text-mySidebar text-sm mb-4">
          {description}
        </div>

        <div className="bg-profileBg rounded-xl p-6 border border-mySidebar shadow-sm">
          {/* Enable all notifications */}
          <div className="flex justify-between items-center py-3 border-b border-mySidebar border-opacity-30">
            <div>
              <span className="text-profileHeader font-bold">
                Enable all notifications
              </span>
              <p className="text-mySidebar text-sm mt-1">
                Turn on to receive control all types of notifications including connection requests, appointments, and announcements notifications
              </p>
            </div>
            <div className="flex justify-end items-center">
              <Toggle 
                enabled={mainEnabled} 
                onChange={setMainEnabled}
                disabled={loading}
              />
            </div>
          </div>

          {/* Push notifications */}
          <div className="flex justify-between items-center py-3 border-b border-mySidebar border-opacity-30">
            <div>
              <span className={`text-profileHeader font-bold ${!mainEnabled ? 'opacity-50' : ''}`}>
                Push notifications
              </span>
              <p className="text-mySidebar text-sm mt-1">
                Receive push notifications on your device
              </p>
            </div>
            <div className="flex justify-end items-center">
              <Toggle
                enabled={pushEnabled}
                onChange={setPushEnabled}
                disabled={loading || !mainEnabled}
              />
            </div>
          </div>

          {/* Email notifications */}
          <div className="flex justify-between items-center py-3">
            <div>
              <span className={`text-profileHeader font-bold ${!mainEnabled ? 'opacity-50' : ''}`}>
                Email notifications
              </span>
              <p className="text-mySidebar text-sm mt-1">
                Receive notifications via email
              </p>
            </div>
            <div className="flex justify-end items-center">
              <Toggle
                enabled={emailEnabled}
                onChange={setEmailEnabled}
                disabled={loading || !mainEnabled}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-profileBg rounded-xl p-8 h-[700px] flex items-center justify-center w-full">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-profileHeader"></div>
          <span className="text-mySidebar">Loading notification settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-profileBg rounded-xl p-8 min-h-screen w-full max-w-none mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-profileHeader" />
          <h2 className="text-4xl text-profileHeader font-bold">Notification Settings</h2>
        </div>
        {/* Status indicator */}
        {saving && (
          <div className="flex items-center gap-2 text-sm text-mySidebar">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-profileHeader"></div>
            Saving...
          </div>
        )}
        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Settings saved
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <X className="w-4 h-4" />
            Error saving settings
          </div>
        )}
      </div>

      <p className="text-mySidebar text-left mb-6 font-medium">
        Manage account notifications and communication preferences.
      </p>

      {/* Info box */}
      <div className="mb-6 p-4 bg-profileBg border border-profileHeader border-opacity-30 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-profileHeader mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-profileHeader mb-1">How notification preferences work</h3>
            <p className="text-mySidebar text-sm">
              These settings control all notifications including connection requests, appointment updates, 
              and system announcements. Changes are automatically saved and take effect immediately.
            </p>
          </div>
        </div>
      </div>

      <NotificationCategory
        title="All Notifications"
        description="Control all types of notifications including connection requests, appointments, and announcements"
        mainEnabled={reminderNotifications}
        setMainEnabled={handleReminderNotificationsToggle}
        pushEnabled={reminderPush}
        setPushEnabled={handleReminderPushToggle}
        emailEnabled={reminderEmail}
        setEmailEnabled={handleReminderEmailToggle}
      />

      {/* Status section */}
      <div className="mt-6 pt-4 border-t border-mySidebar border-opacity-30">
        <p className="text-mySidebar text-xs mt-3">
          Changes are automatically saved as you make them. Your preferences will be respected 
          for all future notifications.
        </p>
      </div>
    </div>
  );
}