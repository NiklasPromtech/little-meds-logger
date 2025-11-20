import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pill, Plus } from "lucide-react";
import { LogMedicationDialog } from "./LogMedicationDialog";
import { LogMeasurementDialog } from "./LogMeasurementDialog";
import { format } from "date-fns";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
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
  givenBy?: string;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [childId]);

  const fetchData = async () => {
    try {
      // Fetch medications
      const { data: medsData } = await supabase
        .from("medications")
        .select("*")
        .eq("child_id", childId);

      // Fetch measurements
      const { data: measData } = await supabase
        .from("measurements")
        .select("*")
        .eq("child_id", childId);

      setMedications(medsData || []);
      setMeasurements(measData || []);

      // Fetch recent activity
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
        .select("id, given_at, quantity, medication_id, medications(name)")
        .in(
          "medication_id",
          medications.map((m) => m.id)
        )
        .order("given_at", { ascending: false })
        .limit(20);

      const { data: measLogs } = await supabase
        .from("measurement_logs")
        .select("id, recorded_at, value, measurement_id, measurements(name, unit)")
        .in(
          "measurement_id",
          measurements.map((m) => m.id)
        )
        .order("recorded_at", { ascending: false })
        .limit(20);

      const combined: ActivityItem[] = [
        ...(medLogs || []).map((log: any) => ({
          id: log.id,
          type: "medication" as const,
          name: log.medications?.name || "Unknown",
          timestamp: log.given_at,
          quantity: log.quantity,
        })),
        ...(measLogs || []).map((log: any) => ({
          id: log.id,
          type: "measurement" as const,
          name: log.measurements?.name || "Unknown",
          timestamp: log.recorded_at,
          value: `${log.value}${log.measurements?.unit ? " " + log.measurements.unit : ""}`,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivity(combined.slice(0, 20));
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
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
                {activity.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
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
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.timestamp), "MMM d")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.timestamp), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
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
    </div>
  );
}