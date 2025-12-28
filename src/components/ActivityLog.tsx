import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Bot } from "lucide-react";
import { LogMedicationDialog } from "./LogMedicationDialog";
import { LogMeasurementDialog } from "./LogMeasurementDialog";
import { EditMedicationLogDialog } from "./EditMedicationLogDialog";
import { EditMeasurementLogDialog } from "./EditMeasurementLogDialog";
import { EditNoteDialog } from "./EditNoteDialog";
import { MeasurementList } from "./MeasurementList";
import { MeasurementDetail } from "./MeasurementDetail";
import { AIHealthReviewDialog } from "./AIHealthReviewDialog";


interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
  wait_hours: number | null;
  child_id: string;
}

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
}

interface NoteItem {
  id: string;
  content: string;
  recorded_at: string;
}

interface ActivityItem {
  id: string;
  type: "medication" | "measurement" | "note";
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
  content?: string;
}

interface ChildData {
  id: string;
  name: string;
  color: string;
  date_of_birth?: string | null;
  gender?: string | null;
  allergies?: string | null;
  diagnoses?: string | null;
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
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [logAgainItem, setLogAgainItem] = useState<ActivityItem | null>(null);
  const [filter, setFilter] = useState<"all" | "medication" | "health" | "notes">("all");
  const [selectedMeasurement, setSelectedMeasurement] = useState<{
    id: string;
    name: string;
    unit: string | null;
  } | null>(null);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);

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
      // First get all medication IDs for this child
      const { data: childMeds } = await supabase
        .from("medications")
        .select("id")
        .eq("child_id", childId);
      
      const medicationIds = childMeds?.map(m => m.id) || [];
      
      // Then fetch logs only for those medications
      const { data: medLogs } = medicationIds.length > 0 ? await supabase
        .from("medication_logs")
        .select("id, given_at, quantity, notes, medication_id, wait_hours, medications(name, accurate_medical_name, dosage, wait_hours)")
        .in("medication_id", medicationIds)
        .order("given_at", { ascending: false })
        .limit(50) : { data: [] };

      // First get all measurement IDs for this child
      const { data: childMeas } = await supabase
        .from("measurements")
        .select("id")
        .eq("child_id", childId);
      
      const measurementIds = childMeas?.map(m => m.id) || [];

      const { data: measLogs } = measurementIds.length > 0 ? await supabase
        .from("measurement_logs")
        .select("id, recorded_at, value, notes, measurement_id, measurements(name, unit)")
        .in("measurement_id", measurementIds)
        .order("recorded_at", { ascending: false })
        .limit(50) : { data: [] };

      // Fetch notes
      const { data: notesData } = await supabase
        .from("notes")
        .select("*")
        .eq("child_id", childId)
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
        ...(notesData || []).map((note: any) => ({
          id: note.id,
          type: "note" as const,
          name: "Note",
          timestamp: note.recorded_at,
          content: note.content,
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

  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = now.getTime() - past.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
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
    return (
      <div className="text-center py-8">
        <p className="text-primary">LOADING RECORDS<span className="animate-blink">█</span></p>
      </div>
    );
  }

  const hasItems = medications.length > 0 || measurements.length > 0;
  const filteredActivity = activity.filter(item => {
    if (filter === "all") return true;
    if (filter === "health") return item.type === "measurement";
    if (filter === "notes") return item.type === "note";
    return item.type === filter;
  });

  // Find the most recent entry for each medication
  const mostRecentMedicationLogs = new Map<string, string>();
  activity.forEach(item => {
    if (item.type === "medication" && item.medication_id) {
      if (!mostRecentMedicationLogs.has(item.medication_id)) {
        mostRecentMedicationLogs.set(item.medication_id, item.id);
      }
    }
  });

  // If viewing measurement detail, show that instead
  if (selectedMeasurement) {
    return (
      <MeasurementDetail
        measurementId={selectedMeasurement.id}
        measurementName={selectedMeasurement.name}
        unit={selectedMeasurement.unit}
        onBack={() => setSelectedMeasurement(null)}
        onAddLog={() => setShowAddMeasurement(true)}
      />
    );
  }

  // Prepare data for AI review including notes
  const activityForAIReview = activity.map(item => ({
    type: item.type,
    name: item.name,
    timestamp: item.timestamp,
    value: item.value,
    quantity: item.quantity,
    notes: item.notes,
    dosage: item.dosage,
    content: item.content,
  }));

  return (
    <div className="space-y-6 pb-20">
      {!hasItems ? (
        <Card className="p-8 text-center">
          <pre className="text-muted-foreground text-sm mb-4">
{`╔═══════════════════════════════════╗
║  NO TRACKING ITEMS CONFIGURED     ║
║                                   ║
║  ACCESS SETTINGS TO ADD ITEMS     ║
╚═══════════════════════════════════╝`}
          </pre>
          <p className="text-muted-foreground">
            ADD MEDICATIONS OR MEASUREMENTS IN SETTINGS
          </p>
        </Card>
      ) : (
        <>

        <div className="border border-border p-4">
          {/* Header row - stacked layout */}
          <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
            <h3 className="text-lg uppercase tracking-wider">&gt; ACTIVITY LOG</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAIReview(true)}
              className="text-sm h-8 px-3"
            >
              <Bot className="h-3 w-3 mr-1" />
              [AI REVIEW]
            </Button>
          </div>
          
          {/* Filter buttons row - wrapping */}
          <div className="flex flex-wrap gap-1 mb-4">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className="text-xs h-7 px-2"
            >
              [F1] ALL
            </Button>
            <Button
              size="sm"
              variant={filter === "medication" ? "default" : "outline"}
              onClick={() => setFilter("medication")}
              className={`text-xs h-7 px-2 ${filter === "medication" ? "" : "text-accent border-accent/50 hover:border-accent"}`}
            >
              [F2] MEDS
            </Button>
            <Button
              size="sm"
              variant={filter === "health" ? "default" : "outline"}
              onClick={() => setFilter("health")}
              className={`text-xs h-7 px-2 ${filter === "health" ? "" : "text-cyan border-cyan/50 hover:border-cyan"}`}
            >
              [F3] HEALTH
            </Button>
            <Button
              size="sm"
              variant={filter === "notes" ? "default" : "outline"}
              onClick={() => setFilter("notes")}
              className={`text-xs h-7 px-2 ${filter === "notes" ? "" : "text-magenta border-magenta/50 hover:border-magenta"}`}
            >
              [F4] NOTES
            </Button>
          </div>
          
          {filter === "health" ? (
            <MeasurementList
              childId={childId}
              onMeasurementClick={(id, name, unit) => setSelectedMeasurement({ id, name, unit })}
              onAddClick={() => setShowAddMeasurement(true)}
            />
          ) : filteredActivity.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">NO RECORDS FOUND</p>
            </Card>
          ) : (
              <div className="space-y-2">
                {filteredActivity.map((item) => {
                  const timeUntil = item.next_dose_time ? getTimeUntilNextDose(item.next_dose_time) : null;
                  const waitProgress = item.wait_hours && item.next_dose_time
                    ? getWaitProgress(item.timestamp, item.next_dose_time, item.wait_hours)
                    : null;
                  const timeSince = getTimeSince(item.timestamp);
                  const logDateTime = new Date(item.timestamp);
                  const shortDate = logDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const time = logDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  
                  return (
                    <Card 
                      key={item.id} 
                      className={item.type === "measurement" || item.type === "note" ? "p-2 cursor-pointer hover:border-primary transition-all duration-200" : "p-3 cursor-pointer hover:border-primary transition-all duration-200"}
                      onClick={() => {
                        if (item.type === "note") {
                          setEditingNote({
                            id: item.id,
                            content: item.content || "",
                            recorded_at: item.timestamp,
                          });
                        } else {
                          setEditingLog(item);
                        }
                      }}
                    >
                      {item.type === "note" ? (
                        // Note card - MAGENTA color
                        <div className="flex items-start gap-2">
                          <span className="text-magenta flex-shrink-0">[N]</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm uppercase text-magenta">{item.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {timeSince.toUpperCase()} | {shortDate.toUpperCase()} {time.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : item.type === "measurement" ? (
                        // Compact health tracking card - CYAN color
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-cyan">[H]</span>
                            <p className="text-base uppercase truncate text-cyan">{item.name}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg text-cyan">{item.value}</p>
                          </div>
                        </div>
                      ) : (
                        // Medication card with progress - AMBER color
                        <div className="flex items-start gap-3">
                          {waitProgress ? (
                            <div className="flex-shrink-0 w-14 text-center">
                              <div className={`text-lg ${waitProgress.isReady ? "text-primary" : "text-accent"}`}>
                                {Math.round(waitProgress.percentage)}%
                              </div>
                              <div className="w-full h-2 border border-border mt-1">
                                <div 
                                  className={`h-full transition-all duration-1000 ${
                                    waitProgress.isReady ? "bg-primary" : "bg-accent"
                                  }`}
                                  style={{ width: `${waitProgress.percentage}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-14 text-center">
                              <span className="text-lg text-accent">[Rx]</span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-base uppercase truncate text-accent">{item.name}</p>
                              {waitProgress && (
                                <span className={`text-base flex-shrink-0 ${
                                  waitProgress.isReady ? "text-primary" : "text-accent"
                                }`}>
                                  {waitProgress.isReady ? "[READY]" : timeUntil?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            
                            {item.accurate_medical_name && (
                              <p className="text-sm text-muted-foreground truncate">
                                {item.accurate_medical_name.toUpperCase()}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              {item.dosage && <span>{item.dosage.toUpperCase()}</span>}
                              {item.quantity && (
                                <>
                                  {item.dosage && <span>|</span>}
                                  <span>QTY: {item.quantity.toUpperCase()}</span>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span>{timeSince.toUpperCase()}</span>
                              <span>|</span>
                              <span>{shortDate.toUpperCase()} {time.toUpperCase()}</span>
                            </div>
                            
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                NOTE: {item.notes.toUpperCase()}
                              </p>
                            )}
                          </div>

                          {waitProgress?.isReady && 
                           item.type === "medication" && 
                           item.medication_id &&
                           mostRecentMedicationLogs.get(item.medication_id) === item.id && (
                            <Button
                              size="sm"
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLogAgainItem(item);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Log again medication dialog */}
      {logAgainItem && logAgainItem.medication_id && (
        <LogMedicationDialog
          open={!!logAgainItem}
          onOpenChange={(open) => !open && setLogAgainItem(null)}
          medication={medications.find(m => m.id === logAgainItem.medication_id)!}
          onLogAdded={() => {
            setLogAgainItem(null);
            fetchActivity();
            onActivityUpdate?.();
          }}
        />
      )}

      {/* Edit medication log dialog */}
      {editingLog && editingLog.type === "medication" && (
        <EditMedicationLogDialog
          open={!!editingLog}
          onOpenChange={(open) => !open && setEditingLog(null)}
          log={{
            id: editingLog.id,
            name: editingLog.name,
            quantity: editingLog.quantity,
            notes: editingLog.notes,
            timestamp: editingLog.timestamp,
            wait_hours: editingLog.wait_hours,
            medication_id: editingLog.medication_id,
          }}
          onLogUpdated={() => {
            setEditingLog(null);
            fetchActivity();
            onActivityUpdate?.();
          }}
        />
      )}

      {/* Edit measurement log dialog */}
      {editingLog && editingLog.type === "measurement" && (
        <EditMeasurementLogDialog
          open={!!editingLog}
          onOpenChange={(open) => !open && setEditingLog(null)}
          log={{
            id: editingLog.id,
            name: editingLog.name,
            value: editingLog.value,
            notes: editingLog.notes,
            timestamp: editingLog.timestamp,
          }}
          onLogUpdated={() => {
            setEditingLog(null);
            fetchActivity();
            onActivityUpdate?.();
          }}
        />
      )}

      {/* Edit note dialog */}
      {editingNote && (
        <EditNoteDialog
          open={!!editingNote}
          onOpenChange={(open) => !open && setEditingNote(null)}
          note={editingNote}
          onNoteUpdated={() => {
            setEditingNote(null);
            fetchActivity();
            onActivityUpdate?.();
          }}
        />
      )}

      {/* Measurement log dialog from measurement list */}
      {showAddMeasurement && selectedMeasurement && (
        <LogMeasurementDialog
          open={showAddMeasurement}
          onOpenChange={setShowAddMeasurement}
          measurement={selectedMeasurement}
          onLogAdded={() => {
            setShowAddMeasurement(false);
            fetchActivity();
            onActivityUpdate?.();
          }}
        />
      )}

      {/* AI Health Review dialog */}
      <AIHealthReviewDialog
        open={showAIReview}
        onOpenChange={setShowAIReview}
        child={child}
        recentActivity={activityForAIReview}
      />
    </div>
  );
}
