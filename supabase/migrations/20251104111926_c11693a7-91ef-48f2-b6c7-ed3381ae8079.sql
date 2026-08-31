-- Create report_type enum
CREATE TYPE report_type AS ENUM ('attendance', 'academic', 'homework', 'comprehensive');

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type report_type NOT NULL,
  title TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_from DATE,
  date_to DATE,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- School admins can manage all reports
CREATE POLICY "School admins can manage reports"
ON public.reports
FOR ALL
USING (
  has_role(auth.uid(), 'school_admin'::user_role) AND
  (
    class_id IS NULL OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = reports.class_id
      AND classes.school_id = get_user_school_id(auth.uid())
    )
  )
);

-- Teachers can create and view their own reports
CREATE POLICY "Teachers can manage their reports"
ON public.reports
FOR ALL
USING (generated_by = auth.uid() AND has_role(auth.uid(), 'teacher'::user_role));

-- Students can view their own reports
CREATE POLICY "Students can view their reports"
ON public.reports
FOR SELECT
USING (student_id = auth.uid() AND has_role(auth.uid(), 'student'::user_role));

-- Parents can view their children's reports
CREATE POLICY "Parents can view children's reports"
ON public.reports
FOR SELECT
USING (
  has_role(auth.uid(), 'parent'::user_role) AND
  EXISTS (
    SELECT 1 FROM parent_students
    WHERE parent_students.student_id = reports.student_id
    AND parent_students.parent_id = auth.uid()
  )
);

-- Create indexes
CREATE INDEX idx_reports_class_id ON public.reports(class_id);
CREATE INDEX idx_reports_student_id ON public.reports(student_id);
CREATE INDEX idx_reports_generated_by ON public.reports(generated_by);
CREATE INDEX idx_reports_type ON public.reports(report_type);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);