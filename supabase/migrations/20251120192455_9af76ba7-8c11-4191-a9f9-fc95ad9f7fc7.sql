-- Create security definer function to check child access
CREATE OR REPLACE FUNCTION public.has_child_access(_user_id uuid, _child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM children WHERE id = _child_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM child_shares WHERE child_id = _child_id AND user_id = _user_id
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view children they created or have access to" ON public.children;
DROP POLICY IF EXISTS "Users can view shares for children they have access to" ON public.child_shares;

DROP POLICY IF EXISTS "Users can view medications for children they have access to" ON public.medications;
DROP POLICY IF EXISTS "Users can create medications for children they have access to" ON public.medications;
DROP POLICY IF EXISTS "Users can update medications for children they have access to" ON public.medications;
DROP POLICY IF EXISTS "Users can delete medications for children they have access to" ON public.medications;

DROP POLICY IF EXISTS "Users can view measurements for children they have access to" ON public.measurements;
DROP POLICY IF EXISTS "Users can create measurements for children they have access to" ON public.measurements;
DROP POLICY IF EXISTS "Users can update measurements for children they have access to" ON public.measurements;
DROP POLICY IF EXISTS "Users can delete measurements for children they have access to" ON public.measurements;

-- Recreate children policies using the function
CREATE POLICY "Users can view children they have access to"
  ON public.children FOR SELECT
  USING (public.has_child_access(auth.uid(), id));

-- Recreate child_shares policies using the function
CREATE POLICY "Users can view shares for children they have access to"
  ON public.child_shares FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.has_child_access(auth.uid(), child_id)
  );

-- Recreate medications policies
CREATE POLICY "Users can view medications for children they have access to"
  ON public.medications FOR SELECT
  USING (public.has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can create medications for children they have access to"
  ON public.medications FOR INSERT
  WITH CHECK (public.has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can update medications for children they have access to"
  ON public.medications FOR UPDATE
  USING (public.has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can delete medications for children they have access to"
  ON public.medications FOR DELETE
  USING (public.has_child_access(auth.uid(), child_id));

-- Recreate measurements policies
CREATE POLICY "Users can view measurements for children they have access to"
  ON public.measurements FOR SELECT
  USING (public.has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can create measurements for children they have access to"
  ON public.measurements FOR INSERT
  WITH CHECK (public.has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can update measurements for children they have access to"
  ON public.measurements FOR UPDATE
  USING (public.has_child_access(auth.uid(), child_id));

CREATE POLICY "Users can delete measurements for children they have access to"
  ON public.measurements FOR DELETE
  USING (public.has_child_access(auth.uid(), child_id));