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

interface CreateChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChildCreated: () => void;
}

// DOS-era terminal colors
const COLORS = [
  "#00FF00", // Classic CRT Green
  "#00FFFF", // Cyan
  "#FF00FF", // Magenta
  "#FFFF00", // Amber/Yellow
  "#FF6B35", // Orange
  "#00FF88", // Mint green
  "#FF5555", // Red
  "#AAAAAA", // Gray/White
];

export function CreateChildDialog({
  open,
  onOpenChange,
  onChildCreated,
}: CreateChildDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const generateInitials = (fullName: string) => {
    const words = fullName.trim().split(" ");
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const initials = generateInitials(name);
      const { error } = await supabase.from("children").insert({
        name: name.trim(),
        initials,
        color: selectedColor,
        created_by: user.id,
      });

      if (error) throw error;

      setName("");
      setSelectedColor(COLORS[0]);
      onOpenChange(false);
      onChildCreated();
    } catch (error: any) {
      console.error("Error creating child:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Child</DialogTitle>
          <DialogDescription>
            Create a profile to track medications and measurements
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Child's Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              required
            />
          </div>

          <div>
            <Label>Avatar Color</Label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-10 h-10 border-2 transition-all ${
                    selectedColor === color
                      ? "border-primary scale-110"
                      : "border-muted-foreground"
                  }`}
                  style={{ backgroundColor: 'transparent', borderColor: selectedColor === color ? undefined : color }}
                  onClick={() => setSelectedColor(color)}
                >
                  <div 
                    className="w-full h-full" 
                    style={{ backgroundColor: color, opacity: selectedColor === color ? 1 : 0.5 }}
                  />
                </button>
              ))}
            </div>
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
              {loading ? "Adding..." : "Add Child"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}