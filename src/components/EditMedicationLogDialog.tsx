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
  quantity?: string;
  notes?: string;
  timestamp: string;
  wait_hours?: number | null;
  medication_id?: string;
  dosage?: string | null;
}

interface EditMedicationLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ActivityItem;
  onLogUpdated: () => void;
  onDelete?: () => void;
}

// Parse dosage to extract unit
const getDosageUnit = (dosage: string | null | undefined): string | null => {
  if (!dosage) return null;
  
  const lowerDosage = dosage.toLowerCase();
  const units = ['ml', 'mg', 'puff', 'puffs', 'drop', 'drops', 'tablet', 'tablets', 'capsule', 'capsules', 'teaspoon', 'tsp', 'tablespoon', 'tbsp', 'unit', 'units', 'spray', 'sprays', 'patch', 'patches'];
  
  for (const unit of units) {
    if (lowerDosage.includes(unit)) {
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

export function EditMedicationLogDialog({
  open,
  onOpenChange,
  log,
  onLogUpdated,
  onDelete,
}: EditMedicationLogDialogProps) {
  const parseQuantity = (qty?: string) => {
    if (!qty) return 1;
    const match = qty.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 1;
  };

  const [quantity, setQuantity] = useState(parseQuantity(log.quantity));
  const [notes, setNotes] = useState(log.notes || "");
  const [givenAt, setGivenAt] = useState("");
  const [waitHours, setWaitHours] = useState<number | string>(log.wait_hours || "");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [useHalves, setUseHalves] = useState(false);

  const dosageUnit = getDosageUnit(log.dosage);
  const step = useHalves ? 0.5 : 1;
  const minValue = useHalves ? 0.5 : 1;

  useEffect(() => {
    // Format the timestamp for datetime-local input
    const date = new Date(log.timestamp);
    const formatted = format(date, "yyyy-MM-dd'T'HH:mm");
    setGivenAt(formatted);
    setWaitHours(log.wait_hours || "");
    // Check if quantity has decimals
    const qty = parseQuantity(log.quantity);
    setUseHalves(qty % 1 !== 0);
  }, [log.timestamp, log.wait_hours, log.quantity]);

  const formatQuantity = (q: number): string => {
    return q % 1 === 0 ? q.toString() : q.toFixed(1);
  };

  const getDisplayUnit = (q: number): string => {
    if (!dosageUnit) return "";
    if (q === 1) return dosageUnit;
    if (dosageUnit.endsWith('s')) return dosageUnit;
    return dosageUnit + 's';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const quantityText = dosageUnit 
        ? `${formatQuantity(quantity)} ${getDisplayUnit(quantity)}`
        : `${formatQuantity(quantity)}x`;
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

  const increment = () => setQuantity(q => Math.min(q + step, 99));
  const decrement = () => setQuantity(q => Math.max(q - step, minValue));

  const handleModeChange = (halves: boolean) => {
    setUseHalves(halves);
    if (!halves && quantity % 1 !== 0) {
      setQuantity(Math.ceil(quantity));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-terminal-amber">
        <DialogHeader className="px-2 border-b-terminal-amber">
          <DialogTitle className="text-center text-terminal-amber">Edit: {log.name}</DialogTitle>
          <DialogDescription className="text-center">
            Update this medication log
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-4">
          {/* Mode Toggle */}
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              variant={!useHalves ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange(false)}
              className={`font-mono text-xs ${!useHalves ? 'bg-terminal-amber text-black hover:bg-terminal-amber/90 hover:text-black' : 'border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 hover:text-terminal-amber active:text-terminal-amber'}`}
            >
              [WHOLE]
            </Button>
            <Button
              type="button"
              variant={useHalves ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeChange(true)}
              className={`font-mono text-xs ${useHalves ? 'bg-terminal-amber text-black hover:bg-terminal-amber/90 hover:text-black' : 'border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 hover:text-terminal-amber active:text-terminal-amber'}`}
            >
              [HALVES]
            </Button>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-8 py-2">
            <Button
              type="button"
              variant="outline"
              onClick={decrement}
              disabled={quantity <= minValue}
              className="h-12 w-12 text-xl font-mono border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 hover:text-terminal-amber active:text-terminal-amber disabled:text-terminal-amber/40"
            >
              [-]
            </Button>
            
            <div className="text-center min-w-[80px]">
              <div className="text-4xl font-bold text-terminal-amber font-mono">
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
              className="h-12 w-12 text-xl font-mono border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 hover:text-terminal-amber active:text-terminal-amber disabled:text-terminal-amber/40"
            >
              [+]
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="givenAt" className="text-xs text-terminal-amber">Time Given</Label>
            <Input
              id="givenAt"
              type="datetime-local"
              value={givenAt}
              onChange={(e) => setGivenAt(e.target.value)}
              required
              className="border-terminal-amber/50 focus:border-terminal-amber text-terminal-amber"
            />
            <p className="text-xs text-muted-foreground">
              Adjust when the medication was actually given
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitHours" className="text-xs text-terminal-amber">Wait Until Next Dose (hours)</Label>
            <Input
              id="waitHours"
              type="number"
              min="0"
              step="0.25"
              value={waitHours}
              onChange={(e) => setWaitHours(e.target.value)}
              placeholder="e.g., 4, 3.5, or 0.25"
              className="border-terminal-amber/50 focus:border-terminal-amber text-terminal-amber"
            />
            <p className="text-xs text-muted-foreground">
              Override the default wait time for this specific log
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs text-terminal-amber">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={2}
              className="border-terminal-amber/50 focus:border-terminal-amber"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="font-mono text-xs px-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              DEL
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
              className="font-mono text-xs px-2 border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 hover:text-terminal-amber active:text-terminal-amber"
            >
              CANCEL
            </Button>
            <Button 
              type="submit" 
              size="sm"
              className={`font-mono text-xs px-2 transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-terminal-amber text-black hover:bg-terminal-amber/90 hover:text-black active:text-black'}`}
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
