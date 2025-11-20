import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp } from "lucide-react";
import { AddMeasurementDialog } from "./AddMeasurementDialog";
import { LogMeasurementDialog } from "./LogMeasurementDialog";
import { format } from "date-fns";

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
}

interface MeasurementLog {
  id: string;
  value: number;
  recorded_at: string;
}

interface StatsTabProps {
  childId: string;
}

export function StatsTab({ childId }: StatsTabProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [logs, setLogs] = useState<Record<string, MeasurementLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMeasurements();
  }, [childId]);

  const fetchMeasurements = async () => {
    try {
      const { data, error } = await supabase
        .from("measurements")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMeasurements(data || []);
      
      // Fetch recent logs for each measurement
      if (data) {
        for (const measurement of data) {
          fetchRecentLogs(measurement.id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading measurements",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLogs = async (measurementId: string) => {
    try {
      const { data, error } = await supabase
        .from("measurement_logs")
        .select("*")
        .eq("measurement_id", measurementId)
        .order("recorded_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setLogs(prev => ({ ...prev, [measurementId]: data || [] }));
    } catch (error: any) {
      console.error("Error fetching logs:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {measurements.length === 0 ? (
        <Card className="p-12 text-center">
          <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No measurements yet</h3>
          <p className="text-muted-foreground mb-6">
            Add measurements to track stats
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Measurement
          </Button>
        </Card>
      ) : (
        <>
          {measurements.map((measurement) => {
            const recentLogs = logs[measurement.id] || [];
            const lastLog = recentLogs[0];
            
            return (
              <Card key={measurement.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">
                      {measurement.name}
                      {measurement.unit && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({measurement.unit})
                        </span>
                      )}
                    </h3>
                    {lastLog && (
                      <p className="text-2xl font-bold text-primary mb-1">
                        {lastLog.value}
                      </p>
                    )}
                    {lastLog && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(lastLog.recorded_at), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => setSelectedMeasurement(measurement)}
                    size="lg"
                  >
                    Log
                  </Button>
                </div>
                
                {recentLogs.length > 1 && (
                  <div className="space-y-1 mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Recent readings:
                    </p>
                    {recentLogs.slice(1).map((log) => (
                      <div key={log.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {format(new Date(log.recorded_at), "MMM d, h:mm a")}
                        </span>
                        <span className="font-medium">{log.value}</span>
                      </div>
                    ))}
                  </div>
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
            Add Measurement
          </Button>
        </>
      )}

      <AddMeasurementDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        childId={childId}
        onMeasurementAdded={fetchMeasurements}
      />

      {selectedMeasurement && (
        <LogMeasurementDialog
          open={!!selectedMeasurement}
          onOpenChange={(open) => !open && setSelectedMeasurement(null)}
          measurement={selectedMeasurement}
          onLogAdded={() => {
            fetchRecentLogs(selectedMeasurement.id);
            setSelectedMeasurement(null);
          }}
        />
      )}
    </div>
  );
}