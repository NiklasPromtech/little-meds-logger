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
import { Share2, Trash2 } from "lucide-react";
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

interface ChildData {
  id: string;
  name: string;
  initials: string;
  color: string;
  created_by: string;
}

interface ChildSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: ChildData;
  onUpdate: () => void;
}

const COLORS = [
  "#14B8A6", "#F97316", "#8B5CF6", "#EC4899",
  "#10B981", "#3B82F6", "#F59E0B", "#EF4444",
];

export function ChildSettingsDialog({
  open,
  onOpenChange,
  child,
  onUpdate,
}: ChildSettingsDialogProps) {
  const [shareEmail, setShareEmail] = useState("");
  const [selectedColor, setSelectedColor] = useState(child.color);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleShareAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    setLoading(true);
    try {
      // First find the user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", shareEmail)
        .single();

      if (userError) {
        toast({
          title: "User not found",
          description: "No user found with that email address",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("child_shares").insert({
        child_id: child.id,
        user_id: userData.id,
        shared_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Access shared successfully!" });
      setShareEmail("");
    } catch (error: any) {
      toast({
        title: "Error sharing access",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateColor = async () => {
    if (selectedColor === child.color) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({ color: selectedColor })
        .eq("id", child.id);

      if (error) throw error;

      toast({ title: "Color updated!" });
      onUpdate();
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

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", child.id);

      if (error) throw error;

      toast({ title: "Child profile deleted" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings for {child.name}</DialogTitle>
            <DialogDescription>
              Manage child profile settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Avatar Color</Label>
              <div className="grid grid-cols-8 gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? "border-primary scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              {selectedColor !== child.color && (
                <Button
                  onClick={handleUpdateColor}
                  className="mt-3 w-full"
                  disabled={loading}
                >
                  Update Color
                </Button>
              )}
            </div>

            <div>
              <Label className="mb-2 block flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share Access
              </Label>
              <form onSubmit={handleShareAccess} className="space-y-2">
                <Input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  Share Access
                </Button>
              </form>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Child Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {child.name}'s profile and all
              associated medications, measurements, and logs. This action cannot
              be undone.
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
    </>
  );
}