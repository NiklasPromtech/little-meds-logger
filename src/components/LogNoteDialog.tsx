import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface LogNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  onNoteAdded?: () => void;
}

export function LogNoteDialog({
  open,
  onOpenChange,
  childId,
  onNoteAdded,
}: LogNoteDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("notes").insert({
        child_id: childId,
        content: content.trim(),
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Note logged");
      setContent("");
      onOpenChange(false);
      onNoteAdded?.();
    } catch (error: any) {
      console.error("Error logging note:", error);
      toast.error("Failed to log note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            &gt; LOG NOTE_
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <pre className="text-xs text-muted-foreground">
{`╔════════════════════════════════════╗
║  ENTER OBSERVATION OR NOTE BELOW   ║
╚════════════════════════════════════╝`}
          </pre>

          <Textarea
            placeholder="E.g., Good spirits today, sleeping well, drinking lots of water..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] uppercase"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            [ESC] CANCEL
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="flex-1"
          >
            {loading ? "SAVING..." : "[ENTER] LOG"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
