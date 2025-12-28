import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pill, TrendingUp, Trash2, Share2, Pencil, User, UserMinus, Calendar, Bell } from "lucide-react";
import { AddMedicationDialog } from "./AddMedicationDialog";
import { AddMeasurementDialog } from "./AddMeasurementDialog";
import { EditMedicationDefinitionDialog } from "./EditMedicationDefinitionDialog";
import { EditMeasurementDefinitionDialog } from "./EditMeasurementDefinitionDialog";
import { ShareChildDialog } from "./ShareChildDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { NotificationSettings } from "./NotificationSettings";

interface Medication {
  id: string;
  name: string;
  accurate_medical_name: string | null;
  dosage: string | null;
  notes: string | null;
  wait_hours: number | null;
}

interface Measurement {
  id: string;
  name: string;
  unit: string | null;
}

interface ChildData {
  id: string;
  name: string;
  initials: string;
  color: string;
  created_by: string;
  date_of_birth?: string | null;
  gender?: string | null;
  allergies?: string | null;
  diagnoses?: string | null;
}

interface SharedUser {
  id: string;
  user_id: string;
  invited_email: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface ChildSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  child: ChildData;
  onUpdate: () => void;
}

// DOS-era terminal colors
const PRESET_COLORS = [
  "#00FF00", // Classic CRT Green
  "#00FFFF", // Cyan
  "#FF00FF", // Magenta
  "#FFFF00", // Amber/Yellow
  "#FF6B35", // Orange
  "#00FF88", // Mint green
  "#FF5555", // Red
  "#AAAAAA", // Gray/White
];

export function ChildSettingsSheet({ 
  open, 
  onOpenChange, 
  childId, 
  child,
  onUpdate 
}: ChildSettingsSheetProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [childName, setChildName] = useState(child.name);
  const [childColor, setChildColor] = useState(child.color);
  const [dateOfBirth, setDateOfBirth] = useState(child.date_of_birth || "");
  const [gender, setGender] = useState(child.gender || "");
  const [allergies, setAllergies] = useState(child.allergies || "");
  const [diagnoses, setDiagnoses] = useState(child.diagnoses || "");
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: string; name: string } | null>(null);
  const [showDeleteChild, setShowDeleteChild] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchData();
      setChildName(child.name);
      setChildColor(child.color);
      setDateOfBirth(child.date_of_birth || "");
      setGender(child.gender || "");
      setAllergies(child.allergies || "");
      setDiagnoses(child.diagnoses || "");
      fetchCurrentUser();
    }
  }, [open, childId, child]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

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

    const { data: sharesData } = await supabase
      .from("child_shares")
      .select("id, user_id, invited_email")
      .eq("child_id", childId);

    // Fetch profile data separately for each shared user
    const sharesWithProfiles = await Promise.all(
      (sharesData || []).map(async (share) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", share.user_id)
          .maybeSingle();
        
        return {
          ...share,
          profiles: profile,
        };
      })
    );

    setMedications(medsData || []);
    setMeasurements(measData || []);
    setSharedUsers(sharesWithProfiles);
  };

  const handleUpdateChild = async () => {
    try {
      const initials = childName
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const { error } = await supabase
        .from("children")
        .update({ 
          name: childName, 
          initials,
          color: childColor,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          allergies: allergies || null,
          diagnoses: diagnoses || null,
        })
        .eq("id", childId);

      if (error) throw error;

      onUpdate();
    } catch (error: any) {
      console.error("Error updating profile:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      const table = deleteItem.type === "medication" ? "medications" : "measurements";
      const { error } = await supabase.from(table).delete().eq("id", deleteItem.id);

      if (error) throw error;

      fetchData();
    } catch (error: any) {
      console.error("Error deleting item:", error);
    } finally {
      setDeleteItem(null);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from("child_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;

      fetchData();
    } catch (error: any) {
      console.error("Error removing share:", error);
    }
  };

  const handleDeleteChild = async () => {
    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", childId);

      if (error) throw error;

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error deleting child:", error);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6 pb-8">
            {/* Child Profile Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </h3>
              <div>
                <Label htmlFor="name">Child's Name</Label>
                <Input
                  id="name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  onBlur={handleUpdateChild}
                  autoFocus={false}
                  onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dob" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    onBlur={handleUpdateChild}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={(value) => {
                    setGender(value);
                    setTimeout(handleUpdateChild, 100);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="allergies">Known Allergies</Label>
                <Textarea
                  id="allergies"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  onBlur={handleUpdateChild}
                  placeholder="e.g., Penicillin, Peanuts..."
                  className="min-h-[60px]"
                />
              </div>
              <div>
                <Label htmlFor="diagnoses">Conditions / Diagnoses</Label>
                <Textarea
                  id="diagnoses"
                  value={diagnoses}
                  onChange={(e) => setDiagnoses(e.target.value)}
                  onBlur={handleUpdateChild}
                  placeholder="e.g., Asthma, ADHD..."
                  className="min-h-[60px]"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-10 h-10 border-2 transition-all ${
                        childColor === color ? "border-primary scale-110" : "border-muted-foreground"
                      }`}
                      style={{ backgroundColor: 'transparent', borderColor: childColor === color ? undefined : color }}
                      onClick={() => {
                        setChildColor(color);
                        setTimeout(handleUpdateChild, 100);
                      }}
                    >
                      <div 
                        className="w-full h-full" 
                        style={{ backgroundColor: color, opacity: childColor === color ? 1 : 0.5 }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Medications Section */}
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
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No medications added yet</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {medications.map((med) => (
                    <Card key={med.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{med.name}</h4>
                          {med.dosage && (
                            <p className="text-xs text-muted-foreground">{med.dosage}</p>
                          )}
                          {med.wait_hours && (
                            <p className="text-xs text-muted-foreground">
                              Wait: {med.wait_hours}h
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMedication(med)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteItem({ id: med.id, type: "medication", name: med.name })
                            }
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Health Tracking Section */}
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
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No tracking items added yet</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {measurements.map((meas) => (
                    <Card key={meas.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{meas.name}</h4>
                          {meas.unit && (
                            <p className="text-xs text-muted-foreground">Unit: {meas.unit}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMeasurement(meas)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteItem({ id: meas.id, type: "measurement", name: meas.name })
                            }
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Shared Access Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Shared With
                </h3>
                {currentUserId === child.created_by && (
                  <Button onClick={() => setShowShareDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}
              </div>

              {sharedUsers.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Not shared with anyone yet</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {sharedUsers.map((share) => (
                    <Card key={share.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {share.profiles?.full_name || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {share.profiles?.email || share.invited_email || "No email"}
                            </p>
                          </div>
                        </div>
                        {currentUserId === child.created_by && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveShare(share.id)}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Notification Settings Section */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5" />
                Notifications
              </h3>
              <NotificationSettings />
            </div>

            <Separator />

            {/* Actions Section */}
            <div className="space-y-3">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteChild(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {child.name}'s Profile
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
        onShareAdded={fetchData}
      />

      {editingMedication && (
        <EditMedicationDefinitionDialog
          open={!!editingMedication}
          onOpenChange={(open) => !open && setEditingMedication(null)}
          medication={editingMedication}
          onMedicationUpdated={() => {
            fetchData();
            setEditingMedication(null);
          }}
        />
      )}

      {editingMeasurement && (
        <EditMeasurementDefinitionDialog
          open={!!editingMeasurement}
          onOpenChange={(open) => !open && setEditingMeasurement(null)}
          measurement={editingMeasurement}
          onMeasurementUpdated={() => {
            fetchData();
            setEditingMeasurement(null);
          }}
        />
      )}

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
    </>
  );
}
