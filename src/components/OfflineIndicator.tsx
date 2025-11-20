import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { offlineQueue } from "@/lib/offlineQueue";
import { useToast } from "@/hooks/use-toast";

export const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const updateCount = () => {
      setQueueCount(offlineQueue.getAll().length);
    };
    
    updateCount();
    const interval = setInterval(updateCount, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncQueue = async () => {
      if (isOnline && queueCount > 0 && !isSyncing) {
        setIsSyncing(true);
        const result = await offlineQueue.sync();
        setIsSyncing(false);
        
        if (result.synced > 0) {
          toast({
            title: "Synced!",
            description: `${result.synced} log${result.synced > 1 ? 's' : ''} synced successfully`,
          });
        }
        
        if (result.failed > 0) {
          toast({
            title: "Sync failed",
            description: `${result.failed} log${result.failed > 1 ? 's' : ''} failed to sync`,
            variant: "destructive",
          });
        }
      }
    };

    syncQueue();
  }, [isOnline, queueCount, isSyncing, toast]);

  if (isOnline && queueCount === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <Alert className={isOnline ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive"}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-primary" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          <AlertDescription className="text-sm">
            {!isOnline ? (
              <span className="font-medium">Offline mode - logs will sync when reconnected</span>
            ) : isSyncing ? (
              <span className="font-medium">Syncing {queueCount} log{queueCount > 1 ? 's' : ''}...</span>
            ) : (
              <span className="font-medium">{queueCount} log{queueCount > 1 ? 's' : ''} waiting to sync</span>
            )}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};
