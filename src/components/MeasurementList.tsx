import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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

interface MeasurementWithLastLog extends Measurement {
  lastLog?: MeasurementLog;
}

interface MeasurementListProps {
  childId: string;
  onMeasurementClick: (measurementId: string, measurementName: string, unit: string | null) => void;
  onAddClick: () => void;
}

export function MeasurementList({ childId, onMeasurementClick, onAddClick }: MeasurementListProps) {
  const [measurements, setMeasurements] = useState<MeasurementWithLastLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeasurementsWithLastLog();
  }, [childId]);

  const fetchMeasurementsWithLastLog = async () => {
    try {
      setLoading(true);

      // Fetch all measurements for this child
      const { data: measurementsData, error: measurementsError } = await supabase
        .from("measurements")
        .select("*")
        .eq("child_id", childId)
        .order("name", { ascending: true });

      if (measurementsError) throw measurementsError;

      // For each measurement, fetch the most recent log
      const measurementsWithLogs = await Promise.all(
        (measurementsData || []).map(async (measurement) => {
          const { data: logData } = await supabase
            .from("measurement_logs")
            .select("id, value, recorded_at")
            .eq("measurement_id", measurement.id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...measurement,
            lastLog: logData || undefined,
          };
        })
      );

      setMeasurements(measurementsWithLogs);
    } catch (error) {
      console.error("Error fetching measurements:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (measurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center mb-6">
          No health tracking measurements yet
        </p>
        <Button onClick={onAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Measurement Type
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {measurements.map((measurement) => (
        <Card
          key={measurement.id}
          className="p-4 cursor-pointer backdrop-blur-xl bg-card/80 hover:bg-card hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] border-border/50"
          onClick={() => onMeasurementClick(measurement.id, measurement.name, measurement.unit)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-base">{measurement.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 mt-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddClick();
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Log now
              </Button>
            </div>

            <div className="text-right">
              {measurement.lastLog ? (
                <>
                  <p className="text-2xl font-bold text-primary">
                    {measurement.lastLog.value}
                    {measurement.unit && (
                      <span className="text-sm text-muted-foreground ml-1">
                        {measurement.unit}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(measurement.lastLog.recorded_at), {
                      addSuffix: true,
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
