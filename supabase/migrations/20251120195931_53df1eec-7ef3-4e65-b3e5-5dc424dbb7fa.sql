-- Add wait_hours column to medication_logs to allow per-log overrides
ALTER TABLE medication_logs ADD COLUMN wait_hours INTEGER;