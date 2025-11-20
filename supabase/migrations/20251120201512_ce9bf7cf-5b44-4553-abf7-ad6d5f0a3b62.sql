-- Add accurate_medical_name field to medications table
ALTER TABLE public.medications
ADD COLUMN accurate_medical_name TEXT;