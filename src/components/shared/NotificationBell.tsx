import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export const NotificationBell = () => {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead,
    pushPermission,
    isPushSupported,
    enablePushNotifications
  } = useNotifications(schoolId);

  useEffect(() => {
    const fetchSchoolId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (roleData?.school_id) {
        setSchoolId(roleData.school_id);
      }
    };

    fetchSchoolId();
  }, []);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      markAsRead();
    }
  };

  const handleEnablePush = async () => {
    const granted = await enablePushNotifications();
    if (granted) {
      toast({
        title: "Notifications enabled",
        description: "You'll receive browser notifications for new alerts",
      });
    } else {
      toast({
        title: "Permission denied",
        description: "Please enable notifications in your browser settings",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'attendance':
        return 'bg-orange-500';
      case 'fee_reminder':
        return 'bg-red-500';
      case 'exam':
        return 'bg-blue-500';
      case 'announcement':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-3 flex items-center justify-between">
          <h4 className="font-semibold">Notifications</h4>
          {isPushSupported && pushPermission !== 'granted' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleEnablePush}
              className="text-xs h-7"
            >
              <BellRing className="h-3 w-3 mr-1" />
              Enable
            </Button>
          )}
          {pushPermission === 'granted' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <BellRing className="h-3 w-3" />
              Push on
            </span>
          )}
          {pushPermission === 'denied' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BellOff className="h-3 w-3" />
              Blocked
            </span>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <span className="text-sm text-muted-foreground">No notifications</span>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getTypeColor(notification.notification_type)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.subject || notification.notification_type}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
