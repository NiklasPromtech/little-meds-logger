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
import { useToast } from "@/hooks/use-toast";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  notes: string | null;
  wait_hours: number | null;
}

interface EditMedicationDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: Medication;
  onMedicationUpdated: () => void;
}

export function EditMedicationDefinitionDialog({
  open,
  onOpenChange,
  medication,
  onMedicationUpdated,
}: EditMedicationDefinitionDialogProps) {
  const [name, setName] = useState(medication.name);
  const [dosage, setDosage] = useState(medication.dosage || "");
  const [notes, setNotes] = useState(medication.notes || "");
  const [waitHours, setWaitHours] = useState(medication.wait_hours?.toString() || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("medications")
        .update({
          name: name.trim(),
          dosage: dosage.trim() || null,
          notes: notes.trim() || null,
          wait_hours: waitHours ? parseInt(waitHours) : null,
        })
        .eq("id", medication.id);

      if (error) throw error;

      toast({ title: "Medication updated!" });
      onOpenChange(false);
      onMedicationUpdated();
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
          <DialogTitle>Edit Medication</DialogTitle>
          <DialogDescription>
            Update medication details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Medication Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tylenol"
              required
            />
          </div>

          <div>
            <Label htmlFor="dosage">Dosage</Label>
            <Input
              id="dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 5ml or 100mg"
            />
          </div>

          <div>
            <Label htmlFor="waitHours">Wait Between Doses (hours)</Label>
            <Input
              id="waitHours"
              type="number"
              min="0"
              step="0.5"
              value={waitHours}
              onChange={(e) => setWaitHours(e.target.value)}
              placeholder="e.g., 4 or 6"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Minimum hours to wait before next dose
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
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