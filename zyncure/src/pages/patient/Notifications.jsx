import { useEffect, useState } from "react";
import { supabase } from "../../client";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setNotifications(data);
      setLoading(false);
    }
    fetchNotifications();
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6 text-[#55A1A4]">Notifications</h2>
      {loading ? (
        <div>Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-gray-400">No notifications yet.</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-[#FFE0D2] rounded-xl px-6 py-4 text-[#F46B5D] font-semibold"
            >
              {notif.message}
              <div className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}