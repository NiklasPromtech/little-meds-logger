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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
  child_id: string;
}

interface MedicationLog {
  id: string;
  given_at: string;
  quantity: string | null;
  notes: string | null;
}

interface LogMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: Medication;
  onLogAdded: () => void;
  initialQuantity?: string;
}

const parseInitialQuantity = (qty?: string): number => {
  if (!qty) return 1;
  const match = qty.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 1;
};

export function LogMedicationDialog({
  open,
  onOpenChange,
  medication,
  onLogAdded,
  initialQuantity,
}: LogMedicationDialogProps) {
  const [quantity, setQuantity] = useState(() => parseInitialQuantity(initialQuantity));
  const [useHalves, setUseHalves] = useState(() => parseInitialQuantity(initialQuantity) % 1 !== 0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentLogs, setRecentLogs] = useState<MedicationLog[]>([]);
  const { sendNotification } = usePushNotifications();

  // Fetch recent logs and set initial quantity when dialog opens
  useEffect(() => {
    if (open && medication.id) {
      fetchRecentLogs();
      const qty = parseInitialQuantity(initialQuantity);
      setQuantity(qty);
      setUseHalves(qty % 1 !== 0);
    }
  }, [open, medication.id, initialQuantity]);

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("medication_logs")
        .select("id, given_at, quantity, notes")
        .eq("medication_id", medication.id)
        .order("given_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error("Error fetching recent logs:", error);
    }
  };

  // Parse the dosage to extract unit
  const getDosageUnit = (dosage: string | null): string | null => {
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

  const dosageUnit = getDosageUnit(medication.dosage);
  const step = useHalves ? 0.5 : 1;
  const minValue = useHalves ? 0.5 : 1;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      // Send push notification to other caregivers
      sendNotification({
        childId: medication.child_id,
        type: "medication",
        itemName: medication.name,
      });

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
          <DialogTitle className="text-center text-terminal-amber">{medication.name}</DialogTitle>
          <DialogDescription className="text-center">
            {medication.dosage || "Log medication"}
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

          {/* Notes */}
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-mono border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10 hover:text-terminal-amber active:text-terminal-amber"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
            >
              [CANCEL]
            </Button>
            <Button 
              type="submit" 
              className={`flex-1 font-mono transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-terminal-amber text-black hover:bg-terminal-amber/90 hover:text-black active:text-black'}`}
              disabled={loading || success}
            >
              {success ? "[✓ LOGGED]" : loading ? "[...]" : "[LOG]"}
            </Button>
          </div>

          {/* Recent History */}
          {recentLogs.length > 0 && (
            <>
              <Separator className="my-4 bg-terminal-amber/30" />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Recent</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between text-xs border border-terminal-amber/30 p-2"
                    >
                      <span className="text-terminal-amber font-mono">
                        {log.quantity || "1x"}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.given_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
