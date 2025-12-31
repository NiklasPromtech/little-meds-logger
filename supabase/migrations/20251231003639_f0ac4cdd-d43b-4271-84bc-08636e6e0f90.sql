-- Create medication_reminders table for storing scheduled notifications
CREATE TABLE public.medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_log_id UUID NOT NULL REFERENCES public.medication_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  child_name TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying of due reminders
CREATE INDEX idx_medication_reminders_due ON public.medication_reminders(remind_at) WHERE sent = FALSE;

-- Enable Row Level Security
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reminders"
ON public.medication_reminders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
ON public.medication_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
ON public.medication_reminders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
ON public.medication_reminders
FOR DELETE
USING (auth.uid() = user_id);