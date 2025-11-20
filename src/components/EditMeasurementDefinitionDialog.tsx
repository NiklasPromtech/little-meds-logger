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
import { useToast } from "@/hooks/use-toast";

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
}

interface EditMeasurementDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: Measurement;
  onMeasurementUpdated: () => void;
}

export function EditMeasurementDefinitionDialog({
  open,
  onOpenChange,
  measurement,
  onMeasurementUpdated,
}: EditMeasurementDefinitionDialogProps) {
  const [name, setName] = useState(measurement.name);
  const [unit, setUnit] = useState(measurement.unit || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("measurements")
        .update({
          name: name.trim(),
          unit: unit.trim() || null,
        })
        .eq("id", measurement.id);

      if (error) throw error;

      toast({ title: "Measurement updated!" });
      onOpenChange(false);
      onMeasurementUpdated();
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
          <DialogTitle>Edit Health Tracking</DialogTitle>
          <DialogDescription>
            Update tracking item details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Measurement Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Temperature, Weight"
              required
            />
          </div>

          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., °F, lbs, kg"
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