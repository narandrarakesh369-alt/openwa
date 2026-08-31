-- Create transport_routes table
CREATE TABLE public.transport_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  route_number TEXT NOT NULL,
  start_point TEXT NOT NULL,
  end_point TEXT NOT NULL,
  distance_km NUMERIC(10, 2),
  estimated_time_minutes INTEGER,
  monthly_fee NUMERIC(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transport_stops table
CREATE TABLE public.transport_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  stop_name TEXT NOT NULL,
  stop_order INTEGER NOT NULL,
  pickup_time TIME,
  drop_time TIME,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transport_vehicles table
CREATE TABLE public.transport_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'Bus',
  capacity INTEGER NOT NULL DEFAULT 40,
  driver_name TEXT,
  driver_phone TEXT,
  conductor_name TEXT,
  conductor_phone TEXT,
  route_id UUID REFERENCES public.transport_routes(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_transport table to track which students use which transport
CREATE TABLE public.student_transport (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES public.transport_stops(id),
  pickup_type TEXT DEFAULT 'both', -- 'pickup', 'drop', 'both'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, route_id)
);

-- Create notification_logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'attendance', 'fee', 'exam', 'announcement', 'general'
  channel TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
  recipient_id UUID,
  recipient_phone TEXT,
  recipient_email TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_settings table for school notification preferences
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  attendance_notification BOOLEAN DEFAULT true,
  fee_reminder BOOLEAN DEFAULT true,
  exam_notification BOOLEAN DEFAULT true,
  announcement_notification BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  sms_api_key TEXT,
  sms_sender_id TEXT,
  email_from_name TEXT,
  email_from_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Transport routes policies
CREATE POLICY "School admins can manage transport routes"
  ON public.transport_routes FOR ALL
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Users can view transport routes"
  ON public.transport_routes FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()));

-- Transport stops policies
CREATE POLICY "School admins can manage transport stops"
  ON public.transport_stops FOR ALL
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND EXISTS (
    SELECT 1 FROM transport_routes WHERE transport_routes.id = transport_stops.route_id 
    AND transport_routes.school_id = get_user_school_id(auth.uid())
  ));

CREATE POLICY "Users can view transport stops"
  ON public.transport_stops FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM transport_routes WHERE transport_routes.id = transport_stops.route_id 
    AND transport_routes.school_id = get_user_school_id(auth.uid())
  ));

-- Transport vehicles policies
CREATE POLICY "School admins can manage transport vehicles"
  ON public.transport_vehicles FOR ALL
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Users can view transport vehicles"
  ON public.transport_vehicles FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()));

-- Student transport policies
CREATE POLICY "School admins can manage student transport"
  ON public.student_transport FOR ALL
  USING (has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "Students can view their transport"
  ON public.student_transport FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Parents can view children transport"
  ON public.student_transport FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM parent_students WHERE parent_students.parent_id = auth.uid() 
    AND parent_students.student_id = student_transport.student_id
  ));

-- Notification logs policies
CREATE POLICY "School admins can manage notification logs"
  ON public.notification_logs FOR ALL
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- Notification settings policies
CREATE POLICY "School admins can manage notification settings"
  ON public.notification_settings FOR ALL
  USING (has_role(auth.uid(), 'school_admin'::user_role) AND school_id = get_user_school_id(auth.uid()));