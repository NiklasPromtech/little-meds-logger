-- Create notes table for general observations
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies using has_child_access function
CREATE POLICY "Users can view notes for children they have access to"
ON public.notes
FOR SELECT
USING (has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can create notes for children they have access to"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = created_by AND has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can update notes for children they have access to"
ON public.notes
FOR UPDATE
USING (has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can delete notes for children they have access to"
ON public.notes
FOR DELETE
USING (has_child_access(auth.uid(), child_id));

-- Enable realtime for notes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;