-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_audience TEXT NOT NULL, -- 'all', 'class:uuid', 'role:student', 'role:teacher', 'role:parent'
  announcement_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'exam', 'holiday', 'event'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Announcements RLS Policies

-- School admins can manage all announcements
CREATE POLICY "School admins can manage announcements"
ON public.announcements
FOR ALL
USING (
  has_role(auth.uid(), 'school_admin'::user_role) AND 
  get_user_school_id(created_by) = get_user_school_id(auth.uid())
);

-- Teachers can create and view announcements
CREATE POLICY "Teachers can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::user_role) AND
  (target_audience LIKE 'class:%' OR created_by = auth.uid())
);

CREATE POLICY "Teachers can view and update their announcements"
ON public.announcements
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::user_role) AND
  (created_by = auth.uid() OR target_audience = 'all' OR 
   target_audience LIKE 'class:%' OR target_audience = 'role:teacher')
);

CREATE POLICY "Teachers can update their announcements"
ON public.announcements
FOR UPDATE
USING (has_role(auth.uid(), 'teacher'::user_role) AND created_by = auth.uid());

-- Students can view relevant announcements
CREATE POLICY "Students can view announcements"
ON public.announcements
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::user_role) AND
  (target_audience = 'all' OR 
   target_audience = 'role:student' OR
   target_audience IN (
     SELECT 'class:' || class_id::text 
     FROM class_students 
     WHERE student_id = auth.uid()
   ))
);

-- Parents can view relevant announcements
CREATE POLICY "Parents can view announcements"
ON public.announcements
FOR SELECT
USING (
  has_role(auth.uid(), 'parent'::user_role) AND
  (target_audience = 'all' OR 
   target_audience = 'role:parent' OR
   target_audience IN (
     SELECT 'class:' || cs.class_id::text 
     FROM class_students cs
     JOIN parent_students ps ON ps.student_id = cs.student_id
     WHERE ps.parent_id = auth.uid()
   ))
);

-- Messages RLS Policies

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
ON public.messages
FOR SELECT
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Users can update read status of messages they received
CREATE POLICY "Users can update received messages"
ON public.messages
FOR UPDATE
USING (receiver_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_announcements_target_audience ON public.announcements(target_audience);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_read_status ON public.messages(read_status);

-- Create trigger for announcements updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;