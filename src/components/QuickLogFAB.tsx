import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { LogMedicationDialog } from "./LogMedicationDialog";
import { LogMeasurementDialog } from "./LogMeasurementDialog";
import { LogNoteDialog } from "./LogNoteDialog";
import { AddMedicationDialog } from "./AddMedicationDialog";
import { AddMeasurementDialog } from "./AddMeasurementDialog";

interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
  wait_hours: number | null;
  child_id: string;
}

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
}

interface QuickLogFABProps {
  childId: string;
  onLogComplete?: () => void;
}

export const QuickLogFAB = ({ childId, onLogComplete }: QuickLogFABProps) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showMedicationSheet, setShowMedicationSheet] = useState(false);
  const [showMeasurementSheet, setShowMeasurementSheet] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);

  useEffect(() => {
    fetchData();
  }, [childId]);

  const fetchData = async () => {
    const { data: meds } = await supabase
      .from("medications")
      .select("*")
      .eq("child_id", childId)
      .order("name");

    const { data: measures } = await supabase
      .from("measurements")
      .select("*")
      .eq("child_id", childId)
      .order("name");

    if (meds) setMedications(meds);
    if (measures) setMeasurements(measures);
  };

  const handleMedicationLog = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowMedicationSheet(false);
  };

  const handleMeasurementLog = (measurement: Measurement) => {
    setSelectedMeasurement(measurement);
    setShowMeasurementSheet(false);
  };

  const handleLogComplete = () => {
    setSelectedMedication(null);
    setSelectedMeasurement(null);
    onLogComplete?.();
  };

  const handleMedicationAdded = () => {
    setShowAddMedication(false);
    fetchData();
  };

  const handleMeasurementAdded = () => {
    setShowAddMeasurement(false);
    fetchData();
  };

  return (
    <>
      {/* Terminal-style bottom bar */}
      <div 
        className="fixed left-0 right-0 z-50 border-t-2 border-border bg-background"
        style={{ bottom: 'var(--safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-center gap-2 p-3">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 text-xs uppercase tracking-wider text-accent hover:text-accent hover:border-accent"
            onClick={() => setShowMedicationSheet(true)}
          >
            [Rx] MED
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 text-xs uppercase tracking-wider text-cyan hover:text-cyan hover:border-cyan"
            onClick={() => setShowMeasurementSheet(true)}
          >
            [H] HEALTH
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 text-xs uppercase tracking-wider text-magenta hover:text-magenta hover:border-magenta"
            onClick={() => setShowNoteDialog(true)}
          >
            [N] NOTE
          </Button>
        </div>
      </div>

      <Sheet open={showMedicationSheet} onOpenChange={(open) => {
        if (open) fetchData();
        setShowMedicationSheet(open);
      }}>
        <SheetContent side="bottom" className="h-[80vh] border-t-2">
          <SheetHeader>
            <SheetTitle className="uppercase tracking-wider">&gt; LOG MEDICATION_</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2 pb-20">
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 uppercase">
                NO MEDICATIONS CONFIGURED. ADD ONE BELOW.
              </p>
            ) : (
              medications.map((med) => (
                <Button
                  key={med.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 text-left"
                  onClick={() => handleMedicationLog(med)}
                >
                  <div>
                    <p className="uppercase text-accent">{med.name}</p>
                    {med.dosage && (
                      <p className="text-xs text-muted-foreground uppercase">{med.dosage}</p>
                    )}
                  </div>
                </Button>
              ))
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
            <Button
              variant="outline"
              className="w-full h-10 text-xs uppercase"
              onClick={() => {
                setShowMedicationSheet(false);
                setShowAddMedication(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              ADD NEW MEDICATION
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showMeasurementSheet} onOpenChange={(open) => {
        if (open) fetchData();
        setShowMeasurementSheet(open);
      }}>
        <SheetContent side="bottom" className="h-[80vh] border-t-2">
          <SheetHeader>
            <SheetTitle className="uppercase tracking-wider">&gt; LOG HEALTH TRACKING_</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2 pb-20">
            {measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 uppercase">
                NO HEALTH ITEMS CONFIGURED. ADD ONE BELOW.
              </p>
            ) : (
              measurements.map((measure) => (
                <Button
                  key={measure.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 text-left"
                  onClick={() => handleMeasurementLog(measure)}
                >
                  <div>
                    <p className="uppercase text-cyan">{measure.name}</p>
                    {measure.unit && (
                      <p className="text-xs text-muted-foreground uppercase">UNIT: {measure.unit}</p>
                    )}
                  </div>
                </Button>
              ))
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
            <Button
              variant="outline"
              className="w-full h-10 text-xs uppercase"
              onClick={() => {
                setShowMeasurementSheet(false);
                setShowAddMeasurement(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              ADD NEW HEALTH MEASURE
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {selectedMedication && (
        <LogMedicationDialog
          open={!!selectedMedication}
          onOpenChange={(open) => !open && setSelectedMedication(null)}
          medication={selectedMedication}
          onLogAdded={handleLogComplete}
        />
      )}

      {selectedMeasurement && (
        <LogMeasurementDialog
          open={!!selectedMeasurement}
          onOpenChange={(open) => !open && setSelectedMeasurement(null)}
          measurement={selectedMeasurement}
          onLogAdded={handleLogComplete}
        />
      )}

      <LogNoteDialog
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
        childId={childId}
        onNoteAdded={handleLogComplete}
      />

      <AddMedicationDialog
        open={showAddMedication}
        onOpenChange={setShowAddMedication}
        childId={childId}
        onMedicationAdded={handleMedicationAdded}
      />

      <AddMeasurementDialog
        open={showAddMeasurement}
        onOpenChange={setShowAddMeasurement}
        childId={childId}
        onMeasurementAdded={handleMeasurementAdded}
      />
    </>
  );
};
