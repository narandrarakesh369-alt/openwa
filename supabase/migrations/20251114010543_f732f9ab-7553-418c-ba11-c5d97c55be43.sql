-- Create attendance_sessions table for tracking teacher submissions
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  date DATE NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  session_status TEXT NOT NULL CHECK (session_status IN ('Submitted','Edited','Cancelled')) DEFAULT 'Submitted',
  whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one session per class per date
CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_session_class_date 
ON public.attendance_sessions (class_id, date);

-- Create attendance_audit table for tracking admin edits
CREATE TABLE IF NOT EXISTS public.attendance_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Create whatsapp_logs table (if not exists)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID,
  parent_id UUID,
  student_id UUID,
  attendance_session_id UUID REFERENCES public.attendance_sessions(id),
  message_type TEXT,
  message_text TEXT,
  status TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_sessions
CREATE POLICY "Teachers can create sessions" ON public.attendance_sessions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'teacher'::user_role) AND teacher_id = auth.uid());

CREATE POLICY "Teachers can view their sessions" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::user_role) OR has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "School admins can view all sessions" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "School admins can update sessions" ON public.attendance_sessions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'school_admin'::user_role));

-- RLS Policies for attendance_audit
CREATE POLICY "School admins can insert audit records" ON public.attendance_audit
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'school_admin'::user_role) AND changed_by = auth.uid());

CREATE POLICY "School admins can view audit records" ON public.attendance_audit
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "Teachers can view audit records" ON public.attendance_audit
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::user_role));

-- RLS Policies for whatsapp_logs
CREATE POLICY "School admins can manage whatsapp logs" ON public.whatsapp_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "Teachers can view whatsapp logs" ON public.whatsapp_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'teacher'::user_role));