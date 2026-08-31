-- Create homework table
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homework_submissions table
CREATE TABLE public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text TEXT,
  file_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  grade INTEGER,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(homework_id, student_id)
);

-- Enable RLS
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- Homework RLS Policies

-- School admins can view all homework
CREATE POLICY "School admins can view all homework"
ON public.homework
FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::user_role) AND
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = homework.class_id
    AND classes.school_id = get_user_school_id(auth.uid())
  )
);

-- Teachers can manage their homework
CREATE POLICY "Teachers can manage their homework"
ON public.homework
FOR ALL
USING (teacher_id = auth.uid());

-- Students can view homework for their classes
CREATE POLICY "Students can view their class homework"
ON public.homework
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::user_role) AND
  EXISTS (
    SELECT 1 FROM class_students
    WHERE class_students.class_id = homework.class_id
    AND class_students.student_id = auth.uid()
  )
);

-- Parents can view homework for their children's classes
CREATE POLICY "Parents can view their children's homework"
ON public.homework
FOR SELECT
USING (
  has_role(auth.uid(), 'parent'::user_role) AND
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN parent_students ps ON ps.student_id = cs.student_id
    WHERE cs.class_id = homework.class_id
    AND ps.parent_id = auth.uid()
  )
);

-- Homework Submissions RLS Policies

-- Teachers can view and grade submissions for their homework
CREATE POLICY "Teachers can view and grade submissions"
ON public.homework_submissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM homework
    WHERE homework.id = homework_submissions.homework_id
    AND homework.teacher_id = auth.uid()
  )
);

-- Students can manage their own submissions
CREATE POLICY "Students can manage their submissions"
ON public.homework_submissions
FOR ALL
USING (student_id = auth.uid());

-- Parents can view their children's submissions
CREATE POLICY "Parents can view children's submissions"
ON public.homework_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM parent_students
    WHERE parent_students.student_id = homework_submissions.student_id
    AND parent_students.parent_id = auth.uid()
  )
);

-- School admins can view all submissions
CREATE POLICY "School admins can view all submissions"
ON public.homework_submissions
FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::user_role) AND
  EXISTS (
    SELECT 1 FROM homework h
    JOIN classes c ON c.id = h.class_id
    WHERE h.id = homework_submissions.homework_id
    AND c.school_id = get_user_school_id(auth.uid())
  )
);

-- Create indexes
CREATE INDEX idx_homework_class_id ON public.homework(class_id);
CREATE INDEX idx_homework_subject_id ON public.homework(subject_id);
CREATE INDEX idx_homework_teacher_id ON public.homework(teacher_id);
CREATE INDEX idx_homework_due_date ON public.homework(due_date);
CREATE INDEX idx_submissions_homework_id ON public.homework_submissions(homework_id);
CREATE INDEX idx_submissions_student_id ON public.homework_submissions(student_id);

-- Create triggers for updated_at
CREATE TRIGGER update_homework_updated_at
BEFORE UPDATE ON public.homework
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homework_submissions_updated_at
BEFORE UPDATE ON public.homework_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for homework files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'homework-files',
  'homework-files',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Storage RLS Policies for homework files

-- Teachers can upload homework attachments
CREATE POLICY "Teachers can upload homework files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'homework-files' AND
  has_role(auth.uid(), 'teacher'::user_role) AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Students can upload submission files
CREATE POLICY "Students can upload submission files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'homework-files' AND
  has_role(auth.uid(), 'student'::user_role) AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view files they uploaded
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'homework-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Teachers can view all homework files
CREATE POLICY "Teachers can view homework files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'homework-files' AND
  has_role(auth.uid(), 'teacher'::user_role)
);

-- Students can view homework attachment files
CREATE POLICY "Students can view homework attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'homework-files' AND
  has_role(auth.uid(), 'student'::user_role)
);

-- Enable realtime for homework_submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_submissions;