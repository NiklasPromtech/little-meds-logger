-- Add UPDATE and DELETE policies for medication_logs
CREATE POLICY "Users can update medication logs for children they have access to"
  ON public.medication_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.medications
      JOIN public.children ON children.id = medications.child_id
      WHERE medications.id = medication_logs.medication_id
      AND public.has_child_access(auth.uid(), children.id)
    )
  );

CREATE POLICY "Users can delete medication logs for children they have access to"
  ON public.medication_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.medications
      JOIN public.children ON children.id = medications.child_id
      WHERE medications.id = medication_logs.medication_id
      AND public.has_child_access(auth.uid(), children.id)
    )
  );

-- Add UPDATE and DELETE policies for measurement_logs
CREATE POLICY "Users can update measurement logs for children they have access to"
  ON public.measurement_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.measurements
      JOIN public.children ON children.id = measurements.child_id
      WHERE measurements.id = measurement_logs.measurement_id
      AND public.has_child_access(auth.uid(), children.id)
    )
  );

CREATE POLICY "Users can delete measurement logs for children they have access to"
  ON public.measurement_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.measurements
      JOIN public.children ON children.id = measurements.child_id
      WHERE measurements.id = measurement_logs.measurement_id
      AND public.has_child_access(auth.uid(), children.id)
    )
  );