import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "./usePushNotifications";

interface Notification {
  id: string;
  notification_type: string;
  subject: string | null;
  message: string;
  status: string | null;
  created_at: string;
  recipient_id: string | null;
}

export const useNotifications = (schoolId: string | null) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { permission, showNotification, requestPermission, isSupported } = usePushNotifications();

  useEffect(() => {
    if (!schoolId) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("id, notification_type, subject, message, status, created_at, recipient_id")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => n.status === 'sent').length);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
          filter: `school_id=eq.${schoolId}`
        },
        (payload) => {
          
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);

          // Show browser push notification
          if (permission === 'granted') {
            showNotification(newNotification.subject || 'New Notification', {
              body: newNotification.message,
              tag: newNotification.id,
              data: { url: '/notifications' }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId, permission, showNotification]);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const enablePushNotifications = useCallback(async () => {
    return await requestPermission();
  }, [requestPermission]);

  return { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead,
    pushPermission: permission,
    isPushSupported: isSupported,
    enablePushNotifications
  };
};
