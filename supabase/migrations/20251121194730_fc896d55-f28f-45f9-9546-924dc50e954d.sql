-- Enable detailed row data for realtime on medication_logs
ALTER TABLE public.medication_logs REPLICA IDENTITY FULL;

-- Add medication_logs table to the realtime publication so inserts are broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_logs;