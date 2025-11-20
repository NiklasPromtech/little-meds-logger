import { supabase } from "@/integrations/supabase/client";

interface QueuedLog {
  id: string;
  type: "medication" | "measurement";
  data: any;
  timestamp: number;
}

const QUEUE_KEY = "offline_log_queue";

export const offlineQueue = {
  add: (type: "medication" | "measurement", data: any) => {
    const queue = offlineQueue.getAll();
    const queuedLog: QueuedLog = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
    };
    queue.push(queuedLog);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return queuedLog.id;
  },

  getAll: (): QueuedLog[] => {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  remove: (id: string) => {
    const queue = offlineQueue.getAll().filter((item) => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clear: () => {
    localStorage.removeItem(QUEUE_KEY);
  },

  sync: async () => {
    const queue = offlineQueue.getAll();
    if (queue.length === 0) return { success: true, synced: 0 };

    let synced = 0;
    const failed: QueuedLog[] = [];

    for (const item of queue) {
      try {
        if (item.type === "medication") {
          const { error } = await supabase
            .from("medication_logs")
            .insert(item.data);
          
          if (error) throw error;
        } else if (item.type === "measurement") {
          const { error } = await supabase
            .from("measurement_logs")
            .insert(item.data);
          
          if (error) throw error;
        }
        
        offlineQueue.remove(item.id);
        synced++;
      } catch (error) {
        console.error("Failed to sync item:", item, error);
        failed.push(item);
      }
    }

    return { success: failed.length === 0, synced, failed: failed.length };
  },
};
