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
      <DialogContent className="border-2">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            &gt; EDIT NOTE_
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            LOGGED: {new Date(note.recorded_at).toLocaleString().toUpperCase()}
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] uppercase"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="flex-1"
          >
            {deleting ? "DELETING..." : "[DEL]"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            [ESC]
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="flex-1"
          >
            {loading ? "SAVING..." : "[SAVE]"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
