-- Add logo and tagline columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Update RLS policy to allow school admins to update their school's logo and tagline
CREATE POLICY "School admins can update their school branding"
ON public.schools
FOR UPDATE
USING (
  has_role(auth.uid(), 'school_admin'::user_role) AND 
  id = get_user_school_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::user_role) AND 
  id = get_user_school_id(auth.uid())
);

-- Allow students and staff to view their school details including logo
CREATE POLICY "Users can view their school details"
ON public.schools
FOR SELECT
USING (
  id = get_user_school_id(auth.uid())
);