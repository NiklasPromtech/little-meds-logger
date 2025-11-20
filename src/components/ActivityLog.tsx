import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pill, Pencil, Trash2 } from "lucide-react";
import { LogMedicationDialog } from "./LogMedicationDialog";
import { LogMeasurementDialog } from "./LogMeasurementDialog";
import { EditMedicationLogDialog } from "./EditMedicationLogDialog";
import { EditMeasurementLogDialog } from "./EditMeasurementLogDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface Medication {
  id: string;
  name: string;
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
}

interface ChildData {
  id: string;
  name: string;
  color: string;
}

interface ActivityLogProps {
  childId: string;
  child: ChildData;
}

export function ActivityLog({ childId, child }: ActivityLogProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [editingLog, setEditingLog] = useState<ActivityItem | null>(null);
  const [deleteLog, setDeleteLog] = useState<{ id: string; type: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [childId]);

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
        .select("id, given_at, quantity, notes, medication_id, medications(name, dosage, wait_hours)")
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
          const waitHours = log.medications?.wait_hours;
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

  const handleDelete = async () => {
    if (!deleteLog) return;

    try {
      const table = deleteLog.type === "medication" ? "medication_logs" : "measurement_logs";
      const { error } = await supabase.from(table).delete().eq("id", deleteLog.id);

      if (error) throw error;

      toast({ title: "Log deleted" });
      fetchActivity();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteLog(null);
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

  return (
    <div className="space-y-6">
      {!hasItems ? (
        <Card className="p-12 text-center">
          <Pill className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Nothing to track yet</h3>
          <p className="text-muted-foreground mb-6">
            Add medications or health tracking items in the Manage tab
          </p>
        </Card>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medications.map((med) => (
                <Button
                  key={med.id}
                  variant="outline"
                  size="lg"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => setSelectedMedication(med)}
                >
                  <span className="font-semibold">{med.name}</span>
                  {med.dosage && (
                    <span className="text-sm text-muted-foreground">{med.dosage}</span>
                  )}
                  <span className="text-xs text-primary mt-1">Tap to log →</span>
                </Button>
              ))}

              {measurements.map((meas) => (
                <Button
                  key={meas.id}
                  variant="outline"
                  size="lg"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => setSelectedMeasurement(meas)}
                >
                  <span className="font-semibold">{meas.name}</span>
                  {meas.unit && (
                    <span className="text-sm text-muted-foreground">({meas.unit})</span>
                  )}
                  <span className="text-xs text-primary mt-1">Tap to log →</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            {activity.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No activity yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {activity.map((item) => {
                  const timeUntil = item.next_dose_time ? getTimeUntilNextDose(item.next_dose_time) : null;
                  const waitProgress = item.wait_hours && item.next_dose_time
                    ? getWaitProgress(item.timestamp, item.next_dose_time, item.wait_hours)
                    : null;
                  
                  return (
                    <Card key={item.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold">{item.name}</p>
                          {item.quantity && (
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity}
                            </p>
                          )}
                          {item.value && (
                            <p className="text-sm text-muted-foreground">
                              Value: {item.value}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-sm text-muted-foreground italic mt-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.timestamp), "MMM d")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.timestamp), "h:mm a")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingLog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteLog({ id: item.id, type: item.type })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      
                      {waitProgress && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={waitProgress.isReady ? "text-primary font-semibold" : "text-muted-foreground"}>
                              {waitProgress.isReady ? "Can take next dose" : timeUntil}
                            </span>
                            <span className="text-muted-foreground">
                              {Math.round(waitProgress.percentage)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                waitProgress.isReady
                                  ? "bg-primary animate-pulse"
                                  : "bg-accent"
                              }`}
                              style={{ width: `${waitProgress.percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Just took</span>
                            <span>Ready</span>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {selectedMedication && (
        <LogMedicationDialog
          open={!!selectedMedication}
          onOpenChange={(open) => !open && setSelectedMedication(null)}
          medication={selectedMedication}
          onLogAdded={() => {
            fetchActivity();
            setSelectedMedication(null);
            toast({ title: "Medication logged!" });
          }}
        />
      )}

      {selectedMeasurement && (
        <LogMeasurementDialog
          open={!!selectedMeasurement}
          onOpenChange={(open) => !open && setSelectedMeasurement(null)}
          measurement={selectedMeasurement}
          onLogAdded={() => {
            fetchActivity();
            setSelectedMeasurement(null);
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
            toast({ title: "Log updated!" });
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
            toast({ title: "Log updated!" });
          }}
        />
      )}

      <AlertDialog open={!!deleteLog} onOpenChange={() => setDeleteLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry from the history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}