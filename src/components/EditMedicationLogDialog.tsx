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
import { Minus, Plus, Trash2 } from "lucide-react";

interface ActivityItem {
  id: string;
  name: string;
  quantity?: string;
  notes?: string;
  timestamp: string;
  wait_hours?: number | null;
  medication_id?: string;
}

interface EditMedicationLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ActivityItem;
  onLogUpdated: () => void;
  onDelete?: () => void;
}

export function EditMedicationLogDialog({
  open,
  onOpenChange,
  log,
  onLogUpdated,
  onDelete,
}: EditMedicationLogDialogProps) {
  const parseQuantity = (qty?: string) => {
    if (!qty) return 1;
    const match = qty.match(/(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  const [quantity, setQuantity] = useState(parseQuantity(log.quantity));
  const [notes, setNotes] = useState(log.notes || "");
  const [givenAt, setGivenAt] = useState("");
  const [waitHours, setWaitHours] = useState<number | string>(log.wait_hours || "");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Format the timestamp for datetime-local input
    const date = new Date(log.timestamp);
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    setGivenAt(formatted);
    setWaitHours(log.wait_hours || "");
  }, [log.timestamp, log.wait_hours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const quantityText = `${quantity}x`;
      const waitHoursValue = waitHours === "" ? null : Number(waitHours);
      
      const { error } = await supabase
        .from("medication_logs")
        .update({
          quantity: quantityText,
          notes: notes.trim() || null,
          given_at: new Date(givenAt).toISOString(),
          wait_hours: waitHoursValue,
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
        .from("medication_logs")
        .delete()
        .eq("id", log.id);

      if (error) throw error;

      onOpenChange(false);
      onDelete?.();
    } catch (error: any) {
      console.error("Error deleting log:", error);
    }
  };

  const increment = () => setQuantity(q => Math.min(q + 1, 99));
  const decrement = () => setQuantity(q => Math.max(q - 1, 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit: {log.name}</DialogTitle>
          <DialogDescription>
            Update this medication log
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="mb-3 block text-center">How many times?</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={decrement}
                disabled={quantity <= 1}
                className="h-16 w-16 rounded-full"
              >
                <Minus className="h-6 w-6" />
              </Button>
              
              <div className="text-center min-w-[120px]">
                <div className="text-5xl font-bold text-primary">{quantity}x</div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={increment}
                disabled={quantity >= 99}
                className="h-16 w-16 rounded-full"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="givenAt">Time Given</Label>
            <Input
              id="givenAt"
              type="datetime-local"
              value={givenAt}
              onChange={(e) => setGivenAt(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adjust when the medication was actually given
            </p>
          </div>

          <div>
            <Label htmlFor="waitHours">Wait Until Next Dose (hours)</Label>
            <Input
              id="waitHours"
              type="number"
              min="0"
              step="0.25"
              value={waitHours}
              onChange={(e) => setWaitHours(e.target.value)}
              placeholder="e.g., 4, 3.5, or 0.25"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Override the default wait time for this specific log
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
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className={`transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500' : ''}`}
              disabled={loading || success}
            >
              {success ? "✓ Saved!" : loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this log?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry from the history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}