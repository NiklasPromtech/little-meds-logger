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
import { Minus, Plus } from "lucide-react";

interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
  child_id: string;
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
  const [success, setSuccess] = useState(false);

  // Parse the dosage to extract unit (e.g., "5 ml" -> "ml", "1 puff" -> "puff")
  const getDosageUnit = (dosage: string | null): string | null => {
    if (!dosage) return null;
    
    const lowerDosage = dosage.toLowerCase();
    
    // Common medication units
    const units = ['ml', 'mg', 'puff', 'puffs', 'drop', 'drops', 'tablet', 'tablets', 'capsule', 'capsules', 'teaspoon', 'tsp', 'tablespoon', 'tbsp', 'unit', 'units', 'spray', 'sprays', 'patch', 'patches'];
    
    for (const unit of units) {
      if (lowerDosage.includes(unit)) {
        // Normalize plural forms
        if (unit === 'puffs') return 'puff';
        if (unit === 'drops') return 'drop';
        if (unit === 'tablets') return 'tablet';
        if (unit === 'capsules') return 'capsule';
        if (unit === 'sprays') return 'spray';
        if (unit === 'patches') return 'patch';
        if (unit === 'units') return 'unit';
        return unit;
      }
    }
    
    return null;
  };

  const dosageUnit = getDosageUnit(medication.dosage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use detected unit or "x" for fallback
      const quantityText = dosageUnit 
        ? `${quantity} ${dosageUnit}${quantity > 1 && !dosageUnit.endsWith('s') ? 's' : ''}`
        : `${quantity}x`;
      
      const { error } = await supabase.from("medication_logs").insert({
        medication_id: medication.id,
        given_by: user.id,
        quantity: quantityText,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setQuantity(1);
        setNotes("");
        setSuccess(false);
        onOpenChange(false);
        onLogAdded();
      }, 600);
    } catch (error: any) {
      console.error("Error logging medication:", error);
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
            <Label className="mb-3 block text-center">
              How many{dosageUnit ? ` ${dosageUnit}s` : ''}?
            </Label>
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
                <div className="text-5xl font-bold text-primary">
                  {quantity}{dosageUnit ? ` ${dosageUnit}${quantity > 1 && !dosageUnit.endsWith('s') ? 's' : ''}` : 'x'}
                </div>
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
              disabled={loading || success}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className={`flex-1 transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500' : ''}`}
              size="lg" 
              disabled={loading || success}
            >
              {success ? "✓ Logged!" : loading ? "Logging..." : "Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
