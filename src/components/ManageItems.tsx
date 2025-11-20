import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pill, TrendingUp, Trash2, Share2 } from "lucide-react";
import { AddMedicationDialog } from "./AddMedicationDialog";
import { AddMeasurementDialog } from "./AddMeasurementDialog";
import { ShareChildDialog } from "./ShareChildDialog";
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
import { useNavigate } from "react-router-dom";

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  notes: string | null;
}

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
}

interface ChildData {
  id: string;
  name: string;
  color: string;
  created_by: string;
}

interface ManageItemsProps {
  childId: string;
  child: ChildData;
  onUpdate: () => void;
}

export function ManageItems({ childId, child, onUpdate }: ManageItemsProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: string; name: string } | null>(null);
  const [showDeleteChild, setShowDeleteChild] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [childId]);

  const fetchData = async () => {
    const { data: medsData } = await supabase
      .from("medications")
      .select("*")
      .eq("child_id", childId)
      .order("name");

    const { data: measData } = await supabase
      .from("measurements")
      .select("*")
      .eq("child_id", childId)
      .order("name");

    setMedications(medsData || []);
    setMeasurements(measData || []);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      const table = deleteItem.type === "medication" ? "medications" : "measurements";
      const { error } = await supabase.from(table).delete().eq("id", deleteItem.id);

      if (error) throw error;

      toast({ title: `${deleteItem.name} deleted` });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteItem(null);
    }
  };

  const handleDeleteChild = async () => {
    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", childId);

      if (error) throw error;

      toast({ title: "Child profile deleted" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
          </h3>
          <Button onClick={() => setShowAddMedication(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {medications.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No medications added yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {medications.map((med) => (
              <Card key={med.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{med.name}</h4>
                    {med.dosage && (
                      <p className="text-sm text-muted-foreground">{med.dosage}</p>
                    )}
                    {med.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{med.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteItem({ id: med.id, type: "medication", name: med.name })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Health Tracking
          </h3>
          <Button onClick={() => setShowAddMeasurement(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {measurements.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No tracking items added yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {measurements.map((meas) => (
              <Card key={meas.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{meas.name}</h4>
                    {meas.unit && (
                      <p className="text-sm text-muted-foreground">Unit: {meas.unit}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteItem({ id: meas.id, type: "measurement", name: meas.name })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="pt-6 border-t space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowShareDialog(true)}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Access
        </Button>
        
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowDeleteChild(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete {child.name}'s Profile
        </Button>
      </div>

      <AddMedicationDialog
        open={showAddMedication}
        onOpenChange={setShowAddMedication}
        childId={childId}
        onMedicationAdded={fetchData}
      />

      <AddMeasurementDialog
        open={showAddMeasurement}
        onOpenChange={setShowAddMeasurement}
        childId={childId}
        onMeasurementAdded={fetchData}
      />

      <ShareChildDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        child={child}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this item and all its history. This action cannot be undone.
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

      <AlertDialog open={showDeleteChild} onOpenChange={setShowDeleteChild}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {child.name}'s profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all data including medications, health tracking,
              and logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChild}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}