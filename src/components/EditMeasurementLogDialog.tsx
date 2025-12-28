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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

interface ActivityItem {
  id: string;
  name: string;
  value?: string;
  notes?: string;
  timestamp: string;
  unit?: string | null;
}

interface EditMeasurementLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ActivityItem;
  onLogUpdated: () => void;
  onDelete?: () => void;
}

export function EditMeasurementLogDialog({
  open,
  onOpenChange,
  log,
  onLogUpdated,
  onDelete,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

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
      console.error("Invalid value entered");
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

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        onLogUpdated();
      }, 600);
    } catch (error: any) {
      console.error("Error updating log:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("measurement_logs")
        .delete()
        .eq("id", log.id);

      if (error) throw error;

      onOpenChange(false);
      onDelete?.();
    } catch (error: any) {
      console.error("Error deleting log:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-terminal-cyan">
        <DialogHeader className="px-2 border-b-terminal-cyan">
          <DialogTitle className="text-center text-terminal-cyan">Edit: {log.name}</DialogTitle>
          <DialogDescription className="text-center">
            Update this measurement log
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="value" className="text-terminal-cyan">
              Value {log.unit && `(${log.unit})`}
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
            <Label htmlFor="recordedAt" className="text-xs text-terminal-cyan">Time Recorded</Label>
            <Input
              id="recordedAt"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              required
              className="border-terminal-cyan/50 focus:border-terminal-cyan text-terminal-cyan"
            />
            <p className="text-xs text-muted-foreground">
              Adjust when the measurement was actually taken
            </p>
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

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="font-mono border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              DELETE
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
              className="font-mono border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan/10 hover:text-terminal-cyan active:text-terminal-cyan"
            >
              CANCEL
            </Button>
            <Button 
              type="submit" 
              className={`font-mono transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-terminal-cyan text-black hover:bg-terminal-cyan/90 hover:text-black active:text-black'}`}
              disabled={loading || success}
            >
              {success ? "SAVED" : loading ? "..." : "SAVE"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete this log?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry from the history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono"
            >
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
