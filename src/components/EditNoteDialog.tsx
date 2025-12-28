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

interface NoteItem {
  id: string;
  content: string;
  recorded_at: string;
}

interface EditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: NoteItem;
  onNoteUpdated?: () => void;
}

export function EditNoteDialog({
  open,
  onOpenChange,
  note,
  onNoteUpdated,
}: EditNoteDialogProps) {
  const [content, setContent] = useState(note.content);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("notes")
        .update({ content: content.trim() })
        .eq("id", note.id);

      if (error) throw error;

      toast.success("Note updated");
      onOpenChange(false);
      onNoteUpdated?.();
    } catch (error: any) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", note.id);

      if (error) throw error;

      toast.success("Note deleted");
      onOpenChange(false);
      onNoteUpdated?.();
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-terminal-magenta">
        <DialogHeader className="border-b-terminal-magenta">
          <DialogTitle className="uppercase tracking-wider text-center text-terminal-magenta">
            &gt; EDIT NOTE_
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4">
          <div className="text-xs text-muted-foreground">
            LOGGED: {new Date(note.recorded_at).toLocaleString().toUpperCase()}
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] border-terminal-magenta/50 focus:border-terminal-magenta"
          />

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className={`w-full font-mono transition-all duration-300 bg-terminal-magenta text-white hover:bg-terminal-magenta/90 hover:text-white active:text-white`}
            >
              {loading ? "[...]" : "[SAVE]"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full font-mono border-terminal-magenta text-terminal-magenta hover:bg-terminal-magenta/10 hover:text-terminal-magenta active:text-terminal-magenta"
            >
              [ESC]
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="w-full font-mono border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {deleting ? "[...]" : "[DEL]"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
