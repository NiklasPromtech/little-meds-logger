import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pill, RotateCcw } from "lucide-react";
import { LogMedicationDialog } from "./LogMedicationDialog";
import { LogMeasurementDialog } from "./LogMeasurementDialog";
import { EditMedicationLogDialog } from "./EditMedicationLogDialog";
import { EditMeasurementLogDialog } from "./EditMeasurementLogDialog";


interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
  wait_hours: number | null;
}

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
}

interface ActivityItem {
  id: string;
  type: "medication" | "measurement";
  name: string;
  timestamp: string;
  value?: string;
  quantity?: string;
  notes?: string;
  medication_id?: string;
  measurement_id?: string;
  wait_hours?: number | null;
  next_dose_time?: Date | null;
  accurate_medical_name?: string | null;
  dosage?: string | null;
}

interface ChildData {
  id: string;
  name: string;
  color: string;
}

interface ActivityLogProps {
  childId: string;
  child: ChildData;
  onActivityUpdate?: () => void;
  refreshTrigger?: number;
}

export function ActivityLog({ childId, child, onActivityUpdate, refreshTrigger }: ActivityLogProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState<ActivityItem | null>(null);
  const [logAgainItem, setLogAgainItem] = useState<ActivityItem | null>(null);
  const [filter, setFilter] = useState<"all" | "medication" | "measurement">("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [childId, refreshTrigger]);

  const fetchData = async () => {
    try {
      const { data: medsData } = await supabase
        .from("medications")
        .select("*")
        .eq("child_id", childId);

      const { data: measData } = await supabase
        .from("measurements")
        .select("*")
        .eq("child_id", childId);

      setMedications(medsData || []);
      setMeasurements(measData || []);

      await fetchActivity();
    } catch (error: any) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const { data: medLogs } = await supabase
        .from("medication_logs")
        .select("id, given_at, quantity, notes, medication_id, wait_hours, medications(name, accurate_medical_name, dosage, wait_hours)")
        .eq("medications.child_id", childId)
        .order("given_at", { ascending: false })
        .limit(50);

      const { data: measLogs } = await supabase
        .from("measurement_logs")
        .select("id, recorded_at, value, notes, measurement_id, measurements(name, unit)")
        .eq("measurements.child_id", childId)
        .order("recorded_at", { ascending: false })
        .limit(50);

      const combined: ActivityItem[] = [
        ...(medLogs || []).map((log: any) => {
          // Use log's custom wait_hours if set, otherwise use medication's default
          const waitHours = log.wait_hours ?? log.medications?.wait_hours;
          const nextDoseTime = waitHours 
            ? new Date(new Date(log.given_at).getTime() + waitHours * 60 * 60 * 1000)
            : null;
          
          return {
            id: log.id,
            type: "medication" as const,
            name: log.medications?.name || "Unknown",
            timestamp: log.given_at,
            quantity: log.quantity,
            notes: log.notes,
            medication_id: log.medication_id,
            wait_hours: waitHours,
            next_dose_time: nextDoseTime,
            accurate_medical_name: log.medications?.accurate_medical_name,
            dosage: log.medications?.dosage,
          };
        }),
        ...(measLogs || []).map((log: any) => ({
          id: log.id,
          type: "measurement" as const,
          name: log.measurements?.name || "Unknown",
          timestamp: log.recorded_at,
          value: `${log.value}${log.measurements?.unit ? " " + log.measurements.unit : ""}`,
          notes: log.notes,
          measurement_id: log.measurement_id,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivity(combined.slice(0, 50));
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const getTimeUntilNextDose = (nextDoseTime: Date | null) => {
    if (!nextDoseTime) return null;
    
    const now = new Date();
    const diff = nextDoseTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Ready now";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Wait ${hours}h ${minutes}m`;
    }
    return `Wait ${minutes}m`;
  };

  const getWaitProgress = (timestamp: string, nextDoseTime: Date | null, waitHours: number | null) => {
    if (!nextDoseTime || !waitHours) return null;
    
    const givenTime = new Date(timestamp).getTime();
    const nextTime = nextDoseTime.getTime();
    const now = new Date().getTime();
    
    const totalWait = nextTime - givenTime;
    const elapsed = now - givenTime;
    const percentage = Math.min(100, Math.max(0, (elapsed / totalWait) * 100));
    
    return {
      percentage,
      isReady: percentage >= 100,
    };
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const hasItems = medications.length > 0 || measurements.length > 0;
  const filteredActivity = activity.filter(item => 
    filter === "all" || item.type === filter
  );

  return (
    <div className="space-y-6">
      {!hasItems ? (
        <Card className="p-12 text-center">
          <Pill className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Nothing to track yet</h3>
          <p className="text-muted-foreground mb-6">
            Add medications or health tracking items in Settings
          </p>
        </Card>
      ) : (
        <>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Activity</h3>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "ghost"}
                onClick={() => setFilter("all")}
                className="text-xs h-7 px-3"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === "medication" ? "default" : "ghost"}
                onClick={() => setFilter("medication")}
                className="text-xs h-7 px-3"
              >
                Medication
              </Button>
              <Button
                size="sm"
                variant={filter === "measurement" ? "default" : "ghost"}
                onClick={() => setFilter("measurement")}
                className="text-xs h-7 px-3"
              >
                Health
              </Button>
            </div>
          </div>
          {filteredActivity.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No activity logged yet</p>
            </Card>
          ) : (
              <div className="space-y-2">
                {filteredActivity.map((item) => {
                  const timeUntil = item.next_dose_time ? getTimeUntilNextDose(item.next_dose_time) : null;
                  const waitProgress = item.wait_hours && item.next_dose_time
                    ? getWaitProgress(item.timestamp, item.next_dose_time, item.wait_hours)
                    : null;
                  
                  return (
                    <Card 
                      key={item.id} 
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setEditingLog(item)}
                    >
                      <div className="flex items-center gap-3">
                        {waitProgress && (
                          <div className="relative flex-shrink-0">
                            <svg className="w-12 h-12 transform -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                className="text-muted"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - waitProgress.percentage / 100)}`}
                                className={`transition-all duration-1000 ${
                                  waitProgress.isReady ? "text-primary" : "text-accent"
                                }`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-semibold">
                                {Math.round(waitProgress.percentage)}%
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.type === "medication" && item.accurate_medical_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.accurate_medical_name}
                            </p>
                          )}
                          {item.type === "medication" && item.dosage && (
                            <p className="text-xs text-muted-foreground">
                              Dosage: {item.dosage}
                            </p>
                          )}
                          {item.quantity && (
                            <p className="text-xs text-muted-foreground">
                              Quantity: {item.quantity}
                            </p>
                          )}
                          {item.value && (
                            <p className="text-xs text-muted-foreground">
                              {item.value}
                            </p>
                          )}
                          {item.type === "measurement" && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleString()}
                            </p>
                          )}
                          {waitProgress && (
                            <p className={`text-xs mt-1 ${
                              waitProgress.isReady ? "text-primary font-semibold" : "text-muted-foreground"
                            }`}>
                              {waitProgress.isReady ? "Ready now" : timeUntil}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic mt-1 truncate">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {waitProgress?.isReady && item.type === "medication" && (
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogAgainItem(item);
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-2" />
                          Log Again
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {logAgainItem && logAgainItem.type === "medication" && (
        <LogMedicationDialog
          open={!!logAgainItem}
          onOpenChange={(open) => !open && setLogAgainItem(null)}
          medication={medications.find(m => m.id === logAgainItem.medication_id) || { id: "", name: "", accurate_medical_name: null, dosage: null, wait_hours: null }}
          onLogAdded={() => {
            fetchActivity();
            setLogAgainItem(null);
            onActivityUpdate?.();
            toast({ title: "Medication logged!" });
          }}
        />
      )}

      {logAgainItem && logAgainItem.type === "measurement" && (
        <LogMeasurementDialog
          open={!!logAgainItem}
          onOpenChange={(open) => !open && setLogAgainItem(null)}
          measurement={measurements.find(m => m.id === logAgainItem.measurement_id) || { id: "", name: "", unit: null }}
          onLogAdded={() => {
            fetchActivity();
            setLogAgainItem(null);
            onActivityUpdate?.();
            toast({ title: "Measurement logged!" });
          }}
        />
      )}

      {editingLog && editingLog.type === "medication" && (
        <EditMedicationLogDialog
          open={!!editingLog}
          onOpenChange={(open) => !open && setEditingLog(null)}
          log={editingLog}
          onLogUpdated={() => {
            fetchActivity();
            setEditingLog(null);
            onActivityUpdate?.();
            toast({ title: "Log updated!" });
          }}
          onDelete={() => {
            fetchActivity();
            setEditingLog(null);
            onActivityUpdate?.();
          }}
        />
      )}

      {editingLog && editingLog.type === "measurement" && (
        <EditMeasurementLogDialog
          open={!!editingLog}
          onOpenChange={(open) => !open && setEditingLog(null)}
          log={editingLog}
          onLogUpdated={() => {
            fetchActivity();
            setEditingLog(null);
            onActivityUpdate?.();
            toast({ title: "Log updated!" });
          }}
          onDelete={() => {
            fetchActivity();
            setEditingLog(null);
            onActivityUpdate?.();
          }}
        />
      )}
    </div>
  );
}