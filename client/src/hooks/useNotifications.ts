import { useEffect, useRef } from "react";

interface UseNotificationsOptions {
  enabled?: boolean;
}

/**
 * Hook to request notification permissions and show notifications
 */
export function useNotifications({ enabled = true }: UseNotificationsOptions = {}) {
  const permissionRef = useRef<NotificationPermission | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (!enabled || !("Notification" in window)) return;

    const requestPermission = async () => {
      if (Notification.permission === "granted") {
        permissionRef.current = "granted";
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        permissionRef.current = permission;
      }
    };

    requestPermission();
  }, [enabled]);

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!enabled || !("Notification" in window)) return;

    // Only show if user granted permission and tab is hidden
    if (Notification.permission === "granted" && document.hidden) {
      try {
        new Notification(title, {
          icon: "/favicon.ico",
          ...options,
        });
      } catch (error) {
        console.error("Failed to show notification:", error);
      }
    }
  };

  return { showNotification };
}
