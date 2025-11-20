import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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
import { useToast } from "@/hooks/use-toast";

interface ActivityItem {
  id: string;
  name: string;
  value?: string;
  notes?: string;
  timestamp: string;
}

interface EditMeasurementLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ActivityItem;
  onLogUpdated: () => void;
}

export function EditMeasurementLogDialog({
  open,
  onOpenChange,
  log,
  onLogUpdated,
}: EditMeasurementLogDialogProps) {
  const parseValue = (val?: string) => {
    if (!val) return "";
    const match = val.match(/^([\d.]+)/);
    return match ? match[1] : "";
  };

  const [value, setValue] = useState(parseValue(log.value));
  const [notes, setNotes] = useState(log.notes || "");
  const [recordedAt, setRecordedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Format the timestamp for datetime-local input
    const date = new Date(log.timestamp);
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    setRecordedAt(formatted);
  }, [log.timestamp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("measurement_logs")
        .update({
          value: numValue,
          notes: notes.trim() || null,
          recorded_at: new Date(recordedAt).toISOString(),
        })
        .eq("id", log.id);

      if (error) throw error;

      onOpenChange(false);
      onLogUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit: {log.name}</DialogTitle>
          <DialogDescription>
            Update this measurement log
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="value">Value</Label>
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
            <Label htmlFor="recordedAt">Time Recorded</Label>
            <Input
              id="recordedAt"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adjust when the measurement was actually taken
            </p>
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
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}