-- Drop the overly restrictive profile RLS policy
DROP POLICY IF EXISTS "School admins can view basic profiles in their school" ON public.profiles;

-- Create a new policy that allows school admins to view all profiles in their school
CREATE POLICY "School admins can view profiles in their school"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::user_role) 
  AND school_id = get_user_school_id(auth.uid())
);