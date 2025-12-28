import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Loader2 } from "lucide-react";
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

  const getBarColor = (barIndex: number, severity: number) => {
    if (barIndex > severity) return "bg-muted";
    switch (severity) {
      case 1:
        return "bg-green-500";
      case 2:
        return "bg-blue-500";
      case 3:
        return "bg-yellow-500";
      case 4:
        return "bg-orange-500";
      case 5:
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  const getSeverityTextColor = (severity: number) => {
    switch (severity) {
      case 1:
        return "text-green-600 dark:text-green-400";
      case 2:
        return "text-blue-600 dark:text-blue-400";
      case 3:
        return "text-yellow-600 dark:text-yellow-400";
      case 4:
        return "text-orange-600 dark:text-orange-400";
      case 5:
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
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
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col z-[100]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>AI Health Review</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <p className="text-sm text-muted-foreground">
            Logged {formattedDate} at {formattedTime}
          </p>

          {/* Visual Severity Bars */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className={`h-3 flex-1 rounded-sm transition-colors ${getBarColor(bar, review.severity)}`}
                />
              ))}
            </div>
            <p className={`text-base font-semibold ${getSeverityTextColor(review.severity)}`}>
              {getSeverityLabel(review.severity)}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-terminal-amber">Assessment</h4>
              <p className="text-sm text-foreground leading-relaxed">{review.assessment}</p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2 text-terminal-amber">What to Watch For</h4>
              <p className="text-sm text-foreground leading-relaxed">{review.watch_for}</p>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              ⚠️ <strong>Disclaimer:</strong> This is NOT medical advice. This assessment is for informational purposes only. Always consult a healthcare professional for medical decisions.
            </p>
          </div>
        </div>

        <Button 
          variant="destructive" 
          className="w-full flex-shrink-0 mt-3" 
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
      </DialogContent>
    </Dialog>
  );
}
