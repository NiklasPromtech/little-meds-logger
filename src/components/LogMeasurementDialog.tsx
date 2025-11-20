import { useState } from "react";
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

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
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

      setValue("");
      setNotes("");
      onOpenChange(false);
      onLogAdded();
    } catch (error: any) {
      console.error("Error logging measurement:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log {measurement.name}</DialogTitle>
          <DialogDescription>
            Record a new measurement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="value">
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
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Logging..." : "Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}