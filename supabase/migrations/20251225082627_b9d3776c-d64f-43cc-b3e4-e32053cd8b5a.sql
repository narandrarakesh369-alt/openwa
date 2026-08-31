-- Fix function search path for has_role if it exists without search_path
CREATE OR REPLACE FUNCTION public.has_role(_role user_role, _user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Fix function search path for get_user_school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT school_id INTO v_school_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  RETURN v_school_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Fix get_plan_message_limit function
CREATE OR REPLACE FUNCTION public.get_plan_message_limit(plan_type text)
RETURNS integer AS $$
BEGIN
  CASE plan_type
    WHEN 'BASIC' THEN RETURN 0;
    WHEN 'STANDARD' THEN RETURN 1000;
    WHEN 'PREMIUM' THEN RETURN 3000;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;