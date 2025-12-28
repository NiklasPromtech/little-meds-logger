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
  const [useHalves, setUseHalves] = useState(false);
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
  const step = useHalves ? 0.5 : 1;
  const minValue = useHalves ? 0.5 : 1;

  // Format quantity for display (remove trailing .0)
  const formatQuantity = (q: number): string => {
    return q % 1 === 0 ? q.toString() : q.toFixed(1);
  };

  // Get plural unit
  const getDisplayUnit = (q: number): string => {
    if (!dosageUnit) return "";
    if (q === 1) return dosageUnit;
    // Handle plural
    if (dosageUnit.endsWith('s')) return dosageUnit;
    return dosageUnit + 's';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use detected unit or "x" for fallback
      const quantityText = dosageUnit 
        ? `${formatQuantity(quantity)} ${getDisplayUnit(quantity)}`
        : `${formatQuantity(quantity)}x`;
      
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
        setUseHalves(false);
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

  const increment = () => setQuantity(q => Math.min(q + step, 99));
  const decrement = () => setQuantity(q => Math.max(q - step, minValue));

  // When switching modes, adjust quantity if needed
  const handleModeChange = (halves: boolean) => {
    setUseHalves(halves);
    if (!halves && quantity % 1 !== 0) {
      // Switching to whole mode with a fractional value - round up
      setQuantity(Math.ceil(quantity));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{medication.name}</DialogTitle>
          <DialogDescription className="text-center">
            {medication.dosage || "Log medication"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-2">
          {/* Mode Toggle */}
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant={!useHalves ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange(false)}
              className="font-mono text-xs"
            >
              [WHOLE]
            </Button>
            <Button
              type="button"
              variant={useHalves ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange(true)}
              className="font-mono text-xs"
            >
              [HALVES]
            </Button>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-6">
            <Button
              type="button"
              variant="outline"
              onClick={decrement}
              disabled={quantity <= minValue}
              className="h-12 w-12 text-xl font-mono"
            >
              [-]
            </Button>
            
            <div className="text-center min-w-[80px]">
              <div className="text-4xl font-bold text-primary font-mono">
                {formatQuantity(quantity)}
              </div>
              {dosageUnit && (
                <div className="text-sm text-muted-foreground mt-1">
                  {getDisplayUnit(quantity)}
                </div>
              )}
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={increment}
              disabled={quantity >= 99}
              className="h-12 w-12 text-xl font-mono"
            >
              [+]
            </Button>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-mono"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
            >
              [CANCEL]
            </Button>
            <Button 
              type="submit" 
              className={`flex-1 font-mono transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500' : ''}`}
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
