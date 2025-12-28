import { Bell, BellOff, AlertCircle, CheckCircle, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export function NotificationSettings() {
  const {
    isSupported,
    isIOSPWA,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success("Notifications disabled");
      } else {
        toast.error("Failed to disable notifications");
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success("Notifications enabled!");
      } else if (permission === "denied") {
        toast.error("Notifications blocked. Please enable in browser settings.");
      } else {
        toast.error("Failed to enable notifications");
      }
    }
  };

  // Not supported at all
  if (!isSupported) {
    // Check if it's iOS but not in PWA mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS && !isIOSPWA) {
      return (
        <Card className="p-4 border-terminal-amber/30">
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-terminal-amber mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-terminal-amber">Add to Home Screen</h4>
              <p className="text-xs text-muted-foreground mt-1">
                To enable notifications on iOS, add this app to your home screen first:
              </p>
              <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>Tap the Share button</li>
                <li>Scroll and tap "Add to Home Screen"</li>
                <li>Open the app from your home screen</li>
              </ol>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4 border-muted">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <h4 className="text-sm font-medium">Notifications Not Supported</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Your browser doesn't support push notifications.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Permission denied
  if (permission === "denied") {
    return (
      <Card className="p-4 border-destructive/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-destructive">Notifications Blocked</h4>
            <p className="text-xs text-muted-foreground mt-1">
              You've blocked notifications. To enable them:
            </p>
            <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
              <li>Open browser settings</li>
              <li>Find site permissions</li>
              <li>Allow notifications for this site</li>
            </ol>
          </div>
        </div>
      </Card>
    );
  }

  // Subscribed
  if (isSubscribed) {
    return (
      <Card className="p-4 border-green-500/30">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400">
              Notifications Enabled
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              You'll be notified when caregivers log activities.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Disable"
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Not subscribed - show enable button
  return (
    <Card className="p-4 border-terminal-amber/30">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-terminal-amber" />
        <div className="flex-1">
          <h4 className="text-sm font-medium">Enable Notifications</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Get notified when caregivers log medications, measurements, or notes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
          className="bg-terminal-amber text-black hover:bg-terminal-amber/90"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Enable"
          )}
        </Button>
      </div>
    </Card>
  );
}
