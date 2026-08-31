-- Add plan-related columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'BASIC',
ADD COLUMN IF NOT EXISTS plan_expiry date,
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS school_status text DEFAULT 'Active';

-- Create whatsapp_usage table
CREATE TABLE IF NOT EXISTS public.whatsapp_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  messages_sent integer DEFAULT 0,
  message_limit integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(school_id, month_year)
);

-- Create plan_change_requests table
CREATE TABLE IF NOT EXISTS public.plan_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  requested_plan text NOT NULL,
  requested_by uuid NOT NULL,
  status text DEFAULT 'Pending',
  requested_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  notes text
);

-- Enable RLS on new tables
ALTER TABLE public.whatsapp_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS for whatsapp_usage
CREATE POLICY "Super admins can manage all whatsapp usage"
  ON public.whatsapp_usage FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "School admins can view their school's whatsapp usage"
  ON public.whatsapp_usage FOR SELECT
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

-- RLS for plan_change_requests
CREATE POLICY "Super admins can manage all plan requests"
  ON public.plan_change_requests FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "School admins can view their school's plan requests"
  ON public.plan_change_requests FOR SELECT
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "School admins can create plan requests for their school"
  ON public.plan_change_requests FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

-- Create function to get message limit based on plan
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check if WhatsApp feature is allowed
CREATE OR REPLACE FUNCTION public.can_send_whatsapp(
  p_school_id uuid,
  p_message_type text
)
RETURNS boolean AS $$
DECLARE
  v_school RECORD;
  v_usage RECORD;
  v_month_year text;
BEGIN
  -- Get school details
  SELECT plan_type, whatsapp_enabled, school_status INTO v_school
  FROM public.schools WHERE id = p_school_id;
  
  -- Check if school is frozen or WhatsApp is disabled
  IF v_school.school_status = 'Frozen' OR NOT v_school.whatsapp_enabled THEN
    RETURN false;
  END IF;
  
  -- Check plan permissions for message type
  CASE p_message_type
    WHEN 'absent_alert' THEN
      IF v_school.plan_type = 'BASIC' THEN RETURN false; END IF;
    WHEN 'fee_reminder' THEN
      IF v_school.plan_type != 'PREMIUM' THEN RETURN false; END IF;
    WHEN 'announcement' THEN
      IF v_school.plan_type != 'PREMIUM' THEN RETURN false; END IF;
    ELSE
      RETURN false;
  END CASE;
  
  -- Check message limit
  v_month_year := to_char(now(), 'YYYY-MM');
  SELECT messages_sent, message_limit INTO v_usage
  FROM public.whatsapp_usage
  WHERE school_id = p_school_id AND month_year = v_month_year;
  
  IF v_usage IS NOT NULL AND v_usage.messages_sent >= v_usage.message_limit THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to increment message count
CREATE OR REPLACE FUNCTION public.increment_whatsapp_count(p_school_id uuid)
RETURNS void AS $$
DECLARE
  v_month_year text;
  v_limit integer;
  v_plan_type text;
BEGIN
  v_month_year := to_char(now(), 'YYYY-MM');
  
  -- Get school plan type
  SELECT plan_type INTO v_plan_type FROM public.schools WHERE id = p_school_id;
  v_limit := get_plan_message_limit(v_plan_type);
  
  -- Upsert usage record
  INSERT INTO public.whatsapp_usage (school_id, month_year, messages_sent, message_limit)
  VALUES (p_school_id, v_month_year, 1, v_limit)
  ON CONFLICT (school_id, month_year)
  DO UPDATE SET messages_sent = whatsapp_usage.messages_sent + 1, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;