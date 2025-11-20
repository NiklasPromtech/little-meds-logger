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
import { Minus, Plus } from "lucide-react";

interface ActivityItem {
  id: string;
  name: string;
  quantity?: string;
  notes?: string;
  timestamp: string;
}

interface EditMedicationLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ActivityItem;
  onLogUpdated: () => void;
}

export function EditMedicationLogDialog({
  open,
  onOpenChange,
  log,
  onLogUpdated,
}: EditMedicationLogDialogProps) {
  const parseQuantity = (qty?: string) => {
    if (!qty) return 1;
    const match = qty.match(/(\d+)x/);
    return match ? parseInt(match[1]) : 1;
  };

  const [quantity, setQuantity] = useState(parseQuantity(log.quantity));
  const [notes, setNotes] = useState(log.notes || "");
  const [givenAt, setGivenAt] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Format the timestamp for datetime-local input
    const date = new Date(log.timestamp);
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    setGivenAt(formatted);
  }, [log.timestamp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const quantityText = `${quantity}x`;
      
      const { error } = await supabase
        .from("medication_logs")
        .update({
          quantity: quantityText,
          notes: notes.trim() || null,
          given_at: new Date(givenAt).toISOString(),
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
            <Button type="submit" className="flex-1" size="lg" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}