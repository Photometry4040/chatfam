import { useEffect } from "react";

interface UsePageVisibilityOptions {
  onVisible?: () => void;
  onHidden?: () => void;
}

export function usePageVisibility({
  onVisible,
  onHidden,
}: UsePageVisibilityOptions) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHidden?.();
      } else {
        onVisible?.();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onVisible, onHidden]);
}

/**
 * Update document title with unread badge when tab becomes hidden
 * Removes badge when tab becomes visible again
 */
export function useUnreadBadgeTitle(totalUnreadCount: number) {
  useEffect(() => {
    if (totalUnreadCount === 0) {
      document.title = "FamilyChatter";
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden && totalUnreadCount > 0) {
        document.title = `(${totalUnreadCount > 99 ? "99+" : totalUnreadCount}) FamilyChatter`;
      } else {
        document.title = "FamilyChatter";
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set initial title if already hidden
    if (document.hidden && totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount > 99 ? "99+" : totalUnreadCount}) FamilyChatter`;
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.title = "FamilyChatter";
    };
  }, [totalUnreadCount]);
}
