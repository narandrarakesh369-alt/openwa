-- Add WhatsApp settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  api_provider TEXT NOT NULL CHECK (api_provider IN ('Twilio', 'Meta')),
  api_key TEXT,
  phone_number_id TEXT,
  template_ids_json JSONB DEFAULT '{}'::jsonb,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(school_id)
);

-- Add WhatsApp logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('Absence', 'Fee', 'Notice', 'Custom')),
  message_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Sent', 'Failed', 'Pending')),
  phone_number TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_settings
CREATE POLICY "School admins can manage WhatsApp settings"
  ON public.whatsapp_settings
  FOR ALL
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Super admins can view all WhatsApp settings"
  ON public.whatsapp_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::user_role));

-- RLS Policies for whatsapp_logs
CREATE POLICY "School admins can view WhatsApp logs"
  ON public.whatsapp_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Super admins can view all WhatsApp logs"
  ON public.whatsapp_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "System can insert WhatsApp logs"
  ON public.whatsapp_logs
  FOR INSERT
  WITH CHECK (true);