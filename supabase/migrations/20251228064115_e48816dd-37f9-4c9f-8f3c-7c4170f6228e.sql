-- Create ai_reviews table for storing AI health assessments
CREATE TABLE public.ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  severity integer NOT NULL,
  assessment text NOT NULL,
  watch_for text NOT NULL,
  CONSTRAINT severity_range CHECK (severity >= 1 AND severity <= 5)
);

-- Enable RLS
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view AI reviews for children they have access to"
  ON public.ai_reviews FOR SELECT
  USING (has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can create AI reviews for children they have access to"
  ON public.ai_reviews FOR INSERT
  WITH CHECK (auth.uid() = created_by AND has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can delete AI reviews for children they have access to"
  ON public.ai_reviews FOR DELETE
  USING (has_child_access(auth.uid(), child_id));