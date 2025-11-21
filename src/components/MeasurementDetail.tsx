import { useState, useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MeasurementLog {
  id: string;
  value: number;
  recorded_at: string;
  notes: string | null;
}

interface MeasurementDetailProps {
  measurementId: string;
  measurementName: string;
  unit: string | null;
  onBack: () => void;
  onAddLog: () => void;
}

export function MeasurementDetail({
  measurementId,
  measurementName,
  unit,
  onBack,
  onAddLog,
}: MeasurementDetailProps) {
  const [logs, setLogs] = useState<MeasurementLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [measurementId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("measurement_logs")
        .select("*")
        .eq("measurement_id", measurementId)
        .order("recorded_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data (reverse for chronological order)
  const chartData = [...logs]
    .reverse()
    .map((log) => ({
      date: format(new Date(log.recorded_at), "MMM d"),
      value: log.value,
      fullDate: log.recorded_at,
    }));

  return (
    <div className="min-h-[100dvh] bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{measurementName}</h1>
            <p className="text-sm text-muted-foreground">
              {logs.length} {logs.length === 1 ? "entry" : "entries"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No measurements logged yet</p>
            <Button onClick={onAddLog} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Log First Measurement
            </Button>
          </div>
        ) : (
          <>
            {/* Chart */}
            <Card className="p-4 backdrop-blur-xl bg-card/80">
              <h2 className="font-semibold mb-4">History</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Log List */}
            <div>
              <h2 className="font-semibold mb-3">All Measurements</h2>
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card key={log.id} className="p-3 backdrop-blur-xl bg-card/80 border-border/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {log.value}
                          {unit && (
                            <span className="text-sm text-muted-foreground ml-1">
                              {unit}
                            </span>
                          )}
                        </p>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{format(new Date(log.recorded_at), "MMM d")}</p>
                        <p>{format(new Date(log.recorded_at), "h:mm a")}</p>
                        <p className="mt-1">
                          {formatDistanceToNow(new Date(log.recorded_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed left-1/2 -translate-x-1/2 z-50" style={{ bottom: 'calc(5rem + var(--safe-area-inset-bottom))' }}>
        <Button
          size="sm"
          className="h-10 px-5 rounded-full shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-xl text-xs font-medium"
          onClick={onAddLog}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Log Measurement
        </Button>
      </div>
    </div>
  );
}
