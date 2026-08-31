import { useState, useEffect, useCallback } from "react";

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      setPermission('unsupported');
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission as PermissionState);

    // Register service worker
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      
    }).catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Use service worker to show notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/logo.png',
          badge: '/logo.png',
          ...options
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/logo.png',
        ...options
      });
    }
  }, [permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification
  };
};
