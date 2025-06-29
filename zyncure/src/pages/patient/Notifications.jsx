import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  User,
  Calendar,
  Clock,
} from "lucide-react";
import { supabase } from "../../client";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  // Removed unused currentUser state

  useEffect(() => {
    initializeNotifications();
  }, []);

  async function initializeNotifications() {
    // Get current user first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    
    // setCurrentUser(user); // Removed unused currentUser state
    await fetchNotifications(user.id);
    
    // Set up real-time subscription with the correct user ID
    const subscription = supabase
  .channel("notifications")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      setNotifications((prev) => [payload.new, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
  )
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === payload.new.id ? payload.new : n))
      );
      // Recalculate unread count
      setUnreadCount((prev) => {
        const wasRead = payload.old.is_read;
        const isRead = payload.new.is_read;
        if (!wasRead && isRead) {
          return Math.max(0, prev - 1);
        } else if (wasRead && !isRead) {
          return prev + 1;
        }
        return prev;
      });
    }
  )
  // Add DELETE event listener
  .on(
    "postgres_changes",
    {
      event: "DELETE",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`,
    },
    (payload) => {
      setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
      // Update unread count if the deleted notification was unread
      if (!payload.old.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  )
  .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  async function fetchNotifications(userId) {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    }
    setLoading(false);
  }

  async function markAsRead(notificationId) {
    const { error } = await supabase.rpc("mark_notification_read", {
      notification_id: notificationId,
    });

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function markAllAsRead() {
    const { error } = await supabase.rpc("mark_all_notifications_read");

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }

async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("Error deleting notification:", error);
    // You might want to show a user-friendly error message here
    alert("Failed to delete notification. Please try again.");
    return;
  }

  // Only update local state if the database operation succeeded
  setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  
  // Update unread count if the deleted notification was unread
  const deletedNotification = notifications.find(
    (n) => n.id === notificationId
  );
  if (deletedNotification && !deletedNotification.is_read) {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }
}

  const getNotificationIcon = (type) => {
    switch (type) {
      case "connection_request":
        return <User className="w-5 h-5 text-blue-500" />;
      case "connection_accepted":
        return <Check className="w-5 h-5 text-green-500" />;
      case "connection_rejected":
        return <X className="w-5 h-5 text-red-500" />;
      case "appointment_created":
      case "appointment_updated":
      case "appointment_cancelled":
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case "announcement":
        return <Bell className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type, isRead) => {
    const baseClasses = isRead
      ? "bg-gray-50 border-gray-200"
      : "bg-white border-l-4";

    if (isRead) return baseClasses;

    switch (type) {
      case "connection_request":
        return `${baseClasses} border-l-blue-500`;
      case "connection_accepted":
        return `${baseClasses} border-l-green-500`;
      case "connection_rejected":
        return `${baseClasses} border-l-red-500`;
      case "appointment_created":
      case "appointment_updated":
      case "appointment_cancelled":
        return `${baseClasses} border-l-purple-500`;
      case "announcement":
        return `${baseClasses} border-l-orange-500`;
      default:
        return `${baseClasses} border-l-gray-500`;
    }
  };

  const handleNotificationAction = async (notification) => {
    if (
      notification.type.includes("appointment") &&
      notification.metadata.appointment_id
    ) {
      // You can add navigation to appointment details here
      // For example: navigate to appointment page or show appointment details
      console.log("Appointment notification clicked:", notification.metadata);

      // Mark as read when user interacts with appointment notification
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-[#55A1A4]" />
          <div>
            <h2 className="text-3xl font-bold text-[#55A1A4]">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-[#55A1A4] text-white rounded-lg hover:bg-[#4a8d91] transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#55A1A4]"></div>
          <span className="ml-3 text-gray-600">Loading notifications...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No notifications yet</p>
          <p className="text-gray-400 text-sm">
            You'll see notifications here when you have connection requests or
            updates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-xl px-6 py-4 border transition-all duration-200 cursor-pointer hover:shadow-md ${getNotificationColor(
                notif.type,
                notif.is_read
              )}`}
              onClick={() => handleNotificationAction(notif)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3
                        className={`font-semibold ${
                          notif.is_read ? "text-gray-700" : "text-gray-900"
                        }`}
                      >
                        {notif.title}
                      </h3>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>

                    <p
                      className={`text-sm ${
                        notif.is_read ? "text-gray-600" : "text-gray-800"
                      }`}
                    >
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.created_at).toLocaleString()}
                      </div>

                      {notif.metadata &&
                        Object.keys(notif.metadata).length > 0 && (
                          <div className="text-xs text-gray-500">
                            {notif.type.includes("appointment") && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded">
                                Appointment
                              </span>
                            )}
                            {notif.type.includes("connection") && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded">
                                Connection
                              </span>
                            )}
                            {notif.type === "announcement" && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded">
                                Announcement
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Show appointment details if available */}
                    {notif.type.includes("appointment") &&
                      notif.metadata.appointment_date && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(
                              notif.metadata.appointment_date
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(
                              notif.metadata.appointment_date
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {notif.metadata.reason && (
                            <div className="mt-1">
                              Reason: {notif.metadata.reason}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!notif.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                      className="p-1 text-gray-400 hover:text-[#55A1A4] transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}