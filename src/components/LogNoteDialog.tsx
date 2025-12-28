import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  const [success, setSuccess] = useState(false);

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

      setSuccess(true);
      setTimeout(() => {
        setContent("");
        setSuccess(false);
        onOpenChange(false);
        onNoteAdded?.();
      }, 600);
    } catch (error: any) {
      console.error("Error logging note:", error);
      toast.error("Failed to log note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-terminal-magenta">
        <DialogHeader className="border-b-terminal-magenta">
          <DialogTitle className="uppercase tracking-wider text-center text-terminal-magenta">
            &gt; LOG NOTE_
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4">
          <Textarea
            placeholder="E.g., Good spirits today, sleeping well, drinking lots of water..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] border-terminal-magenta/50 focus:border-terminal-magenta"
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 font-mono border-terminal-magenta text-terminal-magenta hover:bg-terminal-magenta/10"
              disabled={loading || success}
            >
              [CANCEL]
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || success || !content.trim()}
              className={`flex-1 font-mono transition-all duration-300 ${success ? 'bg-green-500 hover:bg-green-500' : 'bg-terminal-magenta text-magenta-foreground hover:bg-terminal-magenta/90'}`}
            >
              {success ? "[✓ LOGGED]" : loading ? "[...]" : "[LOG]"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
