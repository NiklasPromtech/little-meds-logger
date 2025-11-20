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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus } from "lucide-react";

interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
}

interface LogMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: Medication;
  onLogAdded: () => void;
}

export function LogMedicationDialog({
  open,
  onOpenChange,
  medication,
  onLogAdded,
}: LogMedicationDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const quantityText = `${quantity}x`;
      
      const { error } = await supabase.from("medication_logs").insert({
        medication_id: medication.id,
        given_by: user.id,
        quantity: quantityText,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      setQuantity(1);
      setNotes("");
      onOpenChange(false);
      onLogAdded();
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
          <DialogTitle>{medication.name}</DialogTitle>
          <DialogDescription>
            {medication.dosage || "Log medication"}
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
                {medication.dosage && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {medication.dosage}
                  </div>
                )}
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
              {loading ? "Logging..." : "Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}