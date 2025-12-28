import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface ChildProfile {
  name: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  allergies?: string;
  diagnoses?: string;
}

interface ActivityItem {
  type: "medication" | "measurement" | "note" | "ai_review";
  name: string;
  timestamp: string;
  value?: string;
  quantity?: string;
  notes?: string;
  dosage?: string;
  content?: string;
}

interface AIHealthReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: ChildProfile;
  childId: string;
  recentActivity: ActivityItem[];
  onReviewLogged?: () => void;
}

interface ReviewResult {
  severity: number;
  assessment: string;
  watchFor: string;
}

export function AIHealthReviewDialog({
  open,
  onOpenChange,
  child,
  childId,
  recentActivity,
  onReviewLogged,
}: AIHealthReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const { sendNotification } = usePushNotifications();

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

  const handleReview = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-health-review', {
        body: { child, recentActivity }
      });

      if (error) throw error;
      
      setResult(data);

      // Log the AI review to ai_reviews table
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        await supabase.from("ai_reviews").insert({
          child_id: childId,
          created_by: user.id,
          severity: data.severity,
          assessment: data.assessment,
          watch_for: data.watchFor,
        });
        
        // Send push notification to other caregivers
        sendNotification({
          childId: childId,
          type: "ai_review",
          severity: data.severity,
        });
        
        onReviewLogged?.();
      }
    } catch (error: any) {
      console.error('Error getting AI review:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col z-[100]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>AI Health Review</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!result && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Submit {child.name}'s recent health data for an AI-powered assessment.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                This will analyze the last 48 hours of activity including medications and health measurements.
              </p>
              <Button onClick={handleReview} className="w-full">
                Get AI Assessment
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing health data...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 pr-1">
              {/* Visual Severity Bars */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div
                      key={bar}
                      className={`h-3 flex-1 rounded-sm transition-colors ${getBarColor(bar, result.severity)}`}
                    />
                  ))}
                </div>
                <p className={`text-base font-semibold ${getSeverityTextColor(result.severity)}`}>
                  {getSeverityLabel(result.severity)}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-terminal-amber">Assessment</h4>
                  <p className="text-sm text-foreground leading-relaxed">{result.assessment}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 text-terminal-amber">What to Watch For</h4>
                  <p className="text-sm text-foreground leading-relaxed">{result.watchFor}</p>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  ⚠️ <strong>Disclaimer:</strong> This is NOT medical advice. This assessment is for informational purposes only. Always consult a healthcare professional for medical decisions.
                </p>
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setResult(null);
                }}
              >
                Run Another Assessment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
