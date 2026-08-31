-- This migration will be used to assign roles after demo users sign up

-- Function to assign role to user by email
CREATE OR REPLACE FUNCTION assign_demo_role(user_email TEXT, user_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  demo_school_id UUID;
BEGIN
  -- Get the user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  -- Get demo school ID
  SELECT id INTO demo_school_id
  FROM public.schools
  WHERE code = 'DEMO001';

  -- Insert role if user exists
  IF target_user_id IS NOT NULL AND demo_school_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (target_user_id, user_role, demo_school_id)
    ON CONFLICT (user_id, role, school_id) DO NOTHING;

    -- Update user's school_id in profiles
    UPDATE public.profiles
    SET school_id = demo_school_id
    WHERE id = target_user_id;
  END IF;
END;
$$;