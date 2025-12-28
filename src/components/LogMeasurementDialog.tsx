import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
  child_id: string;
}

interface MeasurementLog {
  id: string;
  value: number;
  recorded_at: string;
}

interface LogMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: Measurement;
  onLogAdded: () => void;
}

export function LogMeasurementDialog({
  open,
  onOpenChange,
  measurement,
  onLogAdded,
}: LogMeasurementDialogProps) {
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentLogs, setRecentLogs] = useState<MeasurementLog[]>([]);
  const { sendNotification } = usePushNotifications();

  // Fetch recent logs when dialog opens
  useEffect(() => {
    if (open && measurement.id) {
      fetchRecentLogs();
    }
  }, [open, measurement.id]);

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("measurement_logs")
        .select("id, value, recorded_at")
        .eq("measurement_id", measurement.id)
        .order("recorded_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error("Error fetching recent logs:", error);
    }
  };

  // Prepare chart data (reverse for chronological order)
  const chartData = [...recentLogs]
    .reverse()
    .map((log) => ({
      date: format(new Date(log.recorded_at), "MMM d"),
      value: log.value,
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      console.error("Invalid value entered");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("measurement_logs").insert({
        measurement_id: measurement.id,
        value: numValue,
        recorded_by: user.id,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      // Send push notification to other caregivers
      sendNotification({
        childId: measurement.child_id,
        type: "measurement",
        itemName: measurement.name,
        value: `${numValue}${measurement.unit ? ` ${measurement.unit}` : ""}`,
      });

      setSuccess(true);
      setTimeout(() => {
        setValue("");
        setNotes("");
        setSuccess(false);
        onOpenChange(false);
        onLogAdded();
      }, 600);
    } catch (error: any) {
      console.error("Error logging measurement:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-terminal-cyan">
        <DialogHeader className="px-2 border-b-terminal-cyan">
          <DialogTitle className="text-center text-terminal-cyan">Log {measurement.name}</DialogTitle>
          <DialogDescription className="text-center">
            Record a new measurement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          {/* Mini Chart */}
          {chartData.length > 1 && (
            <div className="border border-terminal-cyan/30 p-3">
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={{ stroke: "hsl(180 100% 50% / 0.3)" }}
                    tickLine={false}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(180 100% 50%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(180 100% 50%)", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="value" className="text-terminal-cyan">
              Value {measurement.unit && `(${measurement.unit})`}
            </Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value"
              required
              className="border-terminal-cyan/50 focus:border-terminal-cyan text-terminal-cyan"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs text-terminal-cyan">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={2}
              className="border-terminal-cyan/50 focus:border-terminal-cyan"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-mono border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan/10 hover:text-terminal-cyan active:text-terminal-cyan"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
            >
              [CANCEL]
            </Button>
            <Button 
              type="submit" 
              className={`flex-1 font-mono transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-terminal-cyan text-black hover:bg-terminal-cyan/90 hover:text-black active:text-black'}`}
              disabled={loading || success}
            >
              {success ? "[✓ LOGGED]" : loading ? "[...]" : "[LOG]"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
