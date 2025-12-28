import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Info, AlertCircle, XCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AIReviewItem {
  id: string;
  severity: number;
  assessment: string;
  watch_for: string;
  created_at: string;
}

interface ViewAIReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: AIReviewItem;
  onReviewDeleted?: () => void;
}

export function ViewAIReviewDialog({
  open,
  onOpenChange,
  review,
  onReviewDeleted,
}: ViewAIReviewDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case 1:
        return "Normal - Continue Monitoring";
      case 2:
        return "Mild Concern - Watch for Changes";
      case 3:
        return "Moderate Concern - Consider Calling Doctor";
      case 4:
        return "High Concern - Contact Doctor Soon";
      case 5:
        return "Urgent - Seek Medical Attention";
      default:
        return "Unknown";
    }
  };

  const getSeverityIcon = (severity: number) => {
    switch (severity) {
      case 1:
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 2:
        return <Info className="h-8 w-8 text-blue-500" />;
      case 3:
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
      case 4:
        return <AlertTriangle className="h-8 w-8 text-orange-500" />;
      case 5:
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Info className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1:
        return "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400";
      case 2:
        return "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400";
      case 3:
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400";
      case 4:
        return "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400";
      case 5:
        return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
      default:
        return "bg-muted border-border";
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("ai_reviews")
        .delete()
        .eq("id", review.id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "AI Review has been removed.",
      });
      onOpenChange(false);
      onReviewDeleted?.();
    } catch (error: any) {
      console.error("Error deleting AI review:", error);
      toast({
        title: "Error",
        description: "Failed to delete AI review.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const reviewDateTime = new Date(review.created_at);
  const formattedDate = reviewDateTime.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  const formattedTime = reviewDateTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle>AI Health Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Logged {formattedDate} at {formattedTime}
          </p>

          <div className={`p-4 rounded-lg border ${getSeverityColor(review.severity)}`}>
            <div className="flex items-center gap-3 mb-2">
              {getSeverityIcon(review.severity)}
              <div>
                <p className="font-semibold">Level {review.severity}/5</p>
                <p className="text-sm">{getSeverityLabel(review.severity)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Assessment</h4>
              <p className="text-sm text-muted-foreground">{review.assessment}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-1">What to Watch For</h4>
              <p className="text-sm text-muted-foreground">{review.watch_for}</p>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ <strong>Disclaimer:</strong> This is NOT medical advice. This assessment is for informational purposes only. Always consult a healthcare professional for medical decisions.
            </p>
          </div>

          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
