-- Change wait_hours to NUMERIC to support decimal hours (e.g., 3.5, 0.25)
ALTER TABLE medications ALTER COLUMN wait_hours TYPE NUMERIC;
ALTER TABLE medication_logs ALTER COLUMN wait_hours TYPE NUMERIC;