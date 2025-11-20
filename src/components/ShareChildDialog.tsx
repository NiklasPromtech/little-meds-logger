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

interface ChildData {
  id: string;
  name: string;
  color: string;
  created_by: string;
}

interface ShareChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: ChildData;
}

export function ShareChildDialog({
  open,
  onOpenChange,
  child,
}: ShareChildDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      // Find user by email using database function
      const { data: userId, error: userError } = await supabase
        .rpc('get_user_id_by_email', { user_email: email.toLowerCase().trim() });

      if (userError || !userId) {
        toast({
          title: "User not found",
          description: "No user found with that email address. They need to create an account first.",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if already shared
      const { data: existingShare } = await supabase
        .from("child_shares")
        .select("id")
        .eq("child_id", child.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingShare) {
        toast({
          title: "Already shared",
          description: "This user already has access to this child",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("child_shares").insert({
        child_id: child.id,
        user_id: userId,
        shared_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Access shared successfully!" });
      setEmail("");
      onOpenChange(false);
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
          <DialogTitle>Share Access to {child.name}</DialogTitle>
          <DialogDescription>
            Give another caregiver access to log medications and track health
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caregiver@example.com"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              They must have a KidCare account
            </p>
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
              {loading ? "Sharing..." : "Share Access"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}