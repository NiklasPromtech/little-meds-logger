-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create children table
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#14B8A6',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Create child_shares table
CREATE TABLE public.child_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(child_id, user_id)
);

ALTER TABLE public.child_shares ENABLE ROW LEVEL SECURITY;

-- Create medications table
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Create medication_logs table
CREATE TABLE public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE NOT NULL,
  given_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  given_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notes TEXT
);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Create measurements table
CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Create measurement_logs table
CREATE TABLE public.measurement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES public.measurements(id) ON DELETE CASCADE NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notes TEXT
);

ALTER TABLE public.measurement_logs ENABLE ROW LEVEL SECURITY;

-- Now add RLS policies for children
CREATE POLICY "Users can view children they created or have access to"
  ON public.children FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.child_shares
      WHERE child_shares.child_id = children.id
      AND child_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create children"
  ON public.children FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own children"
  ON public.children FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own children"
  ON public.children FOR DELETE
  USING (auth.uid() = created_by);

-- Add RLS policies for child_shares
CREATE POLICY "Users can view shares for children they have access to"
  ON public.child_shares FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_shares.child_id
      AND children.created_by = auth.uid()
    )
  );

CREATE POLICY "Child owners can create shares"
  ON public.child_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_id
      AND children.created_by = auth.uid()
    )
  );

CREATE POLICY "Child owners can delete shares"
  ON public.child_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_id
      AND children.created_by = auth.uid()
    )
  );

-- Add RLS policies for medications
CREATE POLICY "Users can view medications for children they have access to"
  ON public.medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = medications.child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create medications for children they have access to"
  ON public.medications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update medications for children they have access to"
  ON public.medications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = medications.child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete medications for children they have access to"
  ON public.medications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = medications.child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

-- Add RLS policies for medication_logs
CREATE POLICY "Users can view medication logs for children they have access to"
  ON public.medication_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.medications
      JOIN public.children ON children.id = medications.child_id
      WHERE medications.id = medication_logs.medication_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create medication logs for children they have access to"
  ON public.medication_logs FOR INSERT
  WITH CHECK (
    auth.uid() = given_by AND
    EXISTS (
      SELECT 1 FROM public.medications
      JOIN public.children ON children.id = medications.child_id
      WHERE medications.id = medication_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

-- Add RLS policies for measurements
CREATE POLICY "Users can view measurements for children they have access to"
  ON public.measurements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = measurements.child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create measurements for children they have access to"
  ON public.measurements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update measurements for children they have access to"
  ON public.measurements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = measurements.child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete measurements for children they have access to"
  ON public.measurements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = measurements.child_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

-- Add RLS policies for measurement_logs
CREATE POLICY "Users can view measurement logs for children they have access to"
  ON public.measurement_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.measurements
      JOIN public.children ON children.id = measurements.child_id
      WHERE measurements.id = measurement_logs.measurement_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create measurement logs for children they have access to"
  ON public.measurement_logs FOR INSERT
  WITH CHECK (
    auth.uid() = recorded_by AND
    EXISTS (
      SELECT 1 FROM public.measurements
      JOIN public.children ON children.id = measurements.child_id
      WHERE measurements.id = measurement_id
      AND (
        children.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.child_shares
          WHERE child_shares.child_id = children.id
          AND child_shares.user_id = auth.uid()
        )
      )
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();