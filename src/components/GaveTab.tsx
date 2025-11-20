import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pill } from "lucide-react";
import { AddMedicationDialog } from "./AddMedicationDialog";
import { format } from "date-fns";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  notes: string | null;
}

interface MedicationLog {
  id: string;
  given_at: string;
  given_by: string;
}

interface GaveTabProps {
  childId: string;
}

export function GaveTab({ childId }: GaveTabProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<Record<string, MedicationLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [givingMedId, setGivingMedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMedications();
  }, [childId]);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMedications(data || []);
      
      // Fetch recent logs for each medication
      if (data) {
        for (const med of data) {
          fetchRecentLogs(med.id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading medications",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLogs = async (medicationId: string) => {
    try {
      const { data, error } = await supabase
        .from("medication_logs")
        .select("*")
        .eq("medication_id", medicationId)
        .order("given_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      setLogs(prev => ({ ...prev, [medicationId]: data || [] }));
    } catch (error: any) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleGiveMedication = async (medicationId: string) => {
    setGivingMedId(medicationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("medication_logs").insert({
        medication_id: medicationId,
        given_by: user.id,
        given_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Medication logged!" });
      fetchRecentLogs(medicationId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGivingMedId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {medications.length === 0 ? (
        <Card className="p-12 text-center">
          <Pill className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No medications yet</h3>
          <p className="text-muted-foreground mb-6">
            Add medications to start tracking
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </Card>
      ) : (
        <>
          {medications.map((med) => {
            const lastLog = logs[med.id]?.[0];
            return (
              <Card key={med.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{med.name}</h3>
                    {med.dosage && (
                      <p className="text-sm text-muted-foreground mb-1">{med.dosage}</p>
                    )}
                    {lastLog && (
                      <p className="text-xs text-muted-foreground">
                        Last given: {format(new Date(lastLog.given_at), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleGiveMedication(med.id)}
                    disabled={givingMedId === med.id}
                    size="lg"
                  >
                    {givingMedId === med.id ? "Logging..." : "Gave"}
                  </Button>
                </div>
                {med.notes && (
                  <p className="text-sm text-muted-foreground">{med.notes}</p>
                )}
              </Card>
            );
          })}
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </>
      )}

      <AddMedicationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        childId={childId}
        onMedicationAdded={fetchMedications}
      />
    </div>
  );
}