-- Add subject_code and description to subjects table
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS subject_code TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id ON public.subjects(teacher_id);

-- Update RLS policies to include teacher access
CREATE POLICY "Teachers can view their assigned subjects"
ON public.subjects
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::user_role) AND 
  teacher_id = auth.uid()
);