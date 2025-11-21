import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BPm9SpRjUTcNMFzP7CzfQ7Uv6SZliqus_yLBwLU2Es83HzDw1i_AQptX6JPHVGJtdPe4rmWE8tr0HGrCrsNMPWc";

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const subscribeToPushNotifications = async () => {
  try {
    console.log('Starting push notification subscription...');
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready:', registration);
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    console.log('Push subscription created:', subscription);

    // Save subscription to backend
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session for subscription');
      throw new Error('No active session');
    }

    console.log('Saving subscription to backend...');
    const response = await supabase.functions.invoke('push-notifications', {
      body: { 
        action: 'subscribe',
        subscription 
      },
    });

    console.log('Subscription save response:', response);

    if (response.error) {
      console.error('Error saving subscription:', response.error);
      throw response.error;
    }

    console.log('Push subscription saved successfully');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
};

export const sendMedicationNotification = async (
  childId: string,
  medicationName: string,
  givenBy: string
) => {
  try {
    console.log('Sending notification for:', { childId, medicationName, givenBy });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session for notification');
      throw new Error('No active session');
    }

    console.log('Invoking push-notifications edge function...');
    const response = await supabase.functions.invoke('push-notifications', {
      body: {
        action: 'notify',
        childId,
        medicationName,
        givenBy,
      },
    });

    console.log('Notification response:', response);

    if (response.error) {
      console.error('Notification error:', response.error);
      throw response.error;
    }

    console.log('Notification sent successfully:', response.data);
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
