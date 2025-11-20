import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pill, Activity } from "lucide-react";
import { LogMedicationDialog } from "./LogMedicationDialog";
import { LogMeasurementDialog } from "./LogMeasurementDialog";

interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
  wait_hours: number | null;
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
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);

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

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-50">
        <Button
          size="lg"
          className="h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          onClick={() => setShowMedicationSheet(true)}
        >
          <Pill className="h-5 w-5 mr-2" />
          Medication
        </Button>
        
        <Button
          size="lg"
          className="h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          variant="secondary"
          onClick={() => setShowMeasurementSheet(true)}
        >
          <Activity className="h-5 w-5 mr-2" />
          Health
        </Button>
      </div>

      <Sheet open={showMedicationSheet} onOpenChange={(open) => {
        if (open) fetchData(); // Refresh data when opening
        setShowMedicationSheet(open);
      }}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Log Medication</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No medications added yet. Go to Settings to add some.
              </p>
            ) : (
              medications.map((med) => (
                <Button
                  key={med.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleMedicationLog(med)}
                >
                  <div className="text-left">
                    <p className="font-semibold">{med.name}</p>
                    {med.dosage && (
                      <p className="text-sm text-muted-foreground">{med.dosage}</p>
                    )}
                  </div>
                </Button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showMeasurementSheet} onOpenChange={(open) => {
        if (open) fetchData(); // Refresh data when opening
        setShowMeasurementSheet(open);
      }}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Log Health Tracking</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No health tracking items added yet. Go to Settings to add some.
              </p>
            ) : (
              measurements.map((measure) => (
                <Button
                  key={measure.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => handleMeasurementLog(measure)}
                >
                  <div className="text-left">
                    <p className="font-semibold">{measure.name}</p>
                    {measure.unit && (
                      <p className="text-sm text-muted-foreground">Unit: {measure.unit}</p>
                    )}
                  </div>
                </Button>
              ))
            )}
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
    </>
  );
};
