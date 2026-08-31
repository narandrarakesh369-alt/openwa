-- Create certificate_type enum
CREATE TYPE certificate_type AS ENUM ('academic', 'participation', 'attendance', 'excellence', 'performance', 'other');

-- Create certificate_templates table
CREATE TABLE public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  background_image_url TEXT,
  text_positions_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID,
  teacher_id UUID,
  certificate_type certificate_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID NOT NULL,
  file_url TEXT,
  template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for certificate_templates
CREATE POLICY "School admins can manage templates"
ON public.certificate_templates
FOR ALL
USING (has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "Teachers can view templates"
ON public.certificate_templates
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::user_role));

-- RLS Policies for certificates
CREATE POLICY "School admins can manage all certificates"
ON public.certificates
FOR ALL
USING (has_role(auth.uid(), 'school_admin'::user_role));

CREATE POLICY "Teachers can manage certificates they issue"
ON public.certificates
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::user_role) AND 
  (issued_by = auth.uid() OR teacher_id = auth.uid())
);

CREATE POLICY "Students can view their certificates"
ON public.certificates
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::user_role) AND 
  student_id = auth.uid()
);

CREATE POLICY "Parents can view their children's certificates"
ON public.certificates
FOR SELECT
USING (
  has_role(auth.uid(), 'parent'::user_role) AND 
  EXISTS (
    SELECT 1 FROM parent_students 
    WHERE parent_students.parent_id = auth.uid() 
    AND parent_students.student_id = certificates.student_id
  )
);

-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certificates', 'certificates', false);

-- Storage policies for certificates
CREATE POLICY "School admins can upload certificates"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'certificates' AND 
  has_role(auth.uid(), 'school_admin'::user_role)
);

CREATE POLICY "Teachers can upload certificates"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'certificates' AND 
  has_role(auth.uid(), 'teacher'::user_role)
);

CREATE POLICY "Authenticated users can view certificates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'certificates' AND auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_certificates_student ON public.certificates(student_id);
CREATE INDEX idx_certificates_class ON public.certificates(class_id);
CREATE INDEX idx_certificates_issued_by ON public.certificates(issued_by);
CREATE INDEX idx_certificates_issue_date ON public.certificates(issue_date DESC);