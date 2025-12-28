-- Add profile fields for AI health review
ALTER TABLE public.children 
ADD COLUMN date_of_birth date,
ADD COLUMN gender text,
ADD COLUMN allergies text,
ADD COLUMN diagnoses text;