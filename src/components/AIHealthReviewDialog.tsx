import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Info, Loader2, AlertCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ChildProfile {
  name: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  allergies?: string;
  diagnoses?: string;
}

interface ActivityItem {
  type: "medication" | "measurement";
  name: string;
  timestamp: string;
  value?: string;
  quantity?: string;
  notes?: string;
  dosage?: string;
}

interface AIHealthReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: ChildProfile;
  recentActivity: ActivityItem[];
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
  recentActivity,
}: AIHealthReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const handleReview = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-health-review', {
        body: { child, recentActivity }
      });

      if (error) throw error;
      
      setResult(data);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle>AI Health Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${getSeverityColor(result.severity)}`}>
                <div className="flex items-center gap-3 mb-2">
                  {getSeverityIcon(result.severity)}
                  <div>
                    <p className="font-semibold">Level {result.severity}/5</p>
                    <p className="text-sm">{getSeverityLabel(result.severity)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">Assessment</h4>
                  <p className="text-sm text-muted-foreground">{result.assessment}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">What to Watch For</h4>
                  <p className="text-sm text-muted-foreground">{result.watchFor}</p>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
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
