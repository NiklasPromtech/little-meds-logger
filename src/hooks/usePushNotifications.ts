import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// VAPID public key - this should match the one in edge function secrets
const VAPID_PUBLIC_KEY = "BNbxGYNMhEIi9zrneh7mqV4oUanjLuxrkzBV-_L4HaH1nxCvVbHLodY-_SVrfODNPOwvCKHtCPghZCUuJl1F7iY";

interface NotificationPayload {
  childId: string;
  type: "medication" | "measurement" | "note" | "ai_review";
  itemName?: string;
  value?: string | number;
  severity?: number;
}

interface PushNotificationState {
  isSupported: boolean;
  isIOSPWA: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isIOSPWA: false,
    permission: "unsupported",
    isSubscribed: false,
    isLoading: true,
  });

  // Check if running as iOS PWA (standalone mode)
  const isIOSPWA = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  }, []);

  // Check if push notifications are supported
  const isPushSupported = useCallback(() => {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }, []);

  // Initialize state
  useEffect(() => {
    const initPushState = async () => {
      const supported = isPushSupported();
      const iosPWA = isIOSPWA();

      if (!supported) {
        setState({
          isSupported: false,
          isIOSPWA: iosPWA,
          permission: "unsupported",
          isSubscribed: false,
          isLoading: false,
        });
        return;
      }

      const permission = Notification.permission;

      // Check if already subscribed
      let isSubscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch (error) {
        console.error("Error checking subscription:", error);
      }

      setState({
        isSupported: supported,
        isIOSPWA: iosPWA,
        permission,
        isSubscribed,
        isLoading: false,
      });
    };

    initPushState();
  }, [isPushSupported, isIOSPWA]);

  // Request permission and subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.error("Push notifications not supported");
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        setState((prev) => ({ 
          ...prev, 
          permission, 
          isLoading: false 
        }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("Push subscription:", JSON.stringify(subscription.toJSON()));

      // Save subscription to backend
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("push-notifications", {
        body: {
          action: "subscribe",
          subscription: subscription.toJSON(),
        },
      });

      if (response.error) {
        throw response.error;
      }

      setState((prev) => ({
        ...prev,
        permission: "granted",
        isSubscribed: true,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Send notification to other caregivers
  const sendNotification = useCallback(
    async (payload: NotificationPayload): Promise<boolean> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("Not authenticated");
          return false;
        }

        const response = await supabase.functions.invoke("push-notifications", {
          body: {
            action: "notify",
            childId: payload.childId,
            type: payload.type,
            itemName: payload.itemName,
            value: payload.value,
            severity: payload.severity,
            loggedBy: user.id,
          },
        });

        if (response.error) {
          console.error("Error sending notification:", response.error);
          return false;
        }

        console.log("Notification sent:", response.data);
        return true;
      } catch (error) {
        console.error("Error sending notification:", error);
        return false;
      }
    },
    []
  );

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendNotification,
  };
}
