-- Add deleted_at column to schools for soft delete
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Update the view policy to exclude deleted schools
DROP POLICY IF EXISTS "Super admins can view all schools" ON public.schools;
CREATE POLICY "Super admins can view all schools"
ON public.schools
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') 
  AND deleted_at IS NULL
);

-- Add policy to view deleted schools separately
CREATE POLICY "Super admins can view deleted schools"
ON public.schools
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') 
  AND deleted_at IS NOT NULL
);

-- Update DELETE policy to allow soft delete (UPDATE with deleted_at)
DROP POLICY IF EXISTS "Super admins can delete schools" ON public.schools;
CREATE POLICY "Super admins can soft delete schools"
ON public.schools
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));