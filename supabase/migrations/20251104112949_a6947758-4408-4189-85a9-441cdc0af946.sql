-- Add missing columns to attendance table
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS subject_id UUID,
ADD COLUMN IF NOT EXISTS teacher_id UUID,
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create attendance_summary table
CREATE TABLE IF NOT EXISTS public.attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  month DATE NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 0,
  present_days INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, class_id, month)
);

-- Enable RLS
ALTER TABLE public.attendance_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_summary
CREATE POLICY "School admins can view all attendance summaries"
ON public.attendance_summary
FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::user_role) AND 
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = attendance_summary.class_id 
    AND classes.school_id = get_user_school_id(auth.uid())
  )
);

CREATE POLICY "Students can view their attendance summary"
ON public.attendance_summary
FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's attendance summary"
ON public.attendance_summary
FOR SELECT
USING (
  has_role(auth.uid(), 'parent'::user_role) AND 
  EXISTS (
    SELECT 1 FROM parent_students 
    WHERE parent_students.parent_id = auth.uid() 
    AND parent_students.student_id = attendance_summary.student_id
  )
);

CREATE POLICY "Teachers can view attendance summaries for their classes"
ON public.attendance_summary
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::user_role) AND 
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = attendance_summary.class_id 
    AND classes.teacher_id = auth.uid()
  )
);

-- Create function to update attendance summary
CREATE OR REPLACE FUNCTION public.update_attendance_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
  v_total_days INTEGER;
  v_present_days INTEGER;
  v_percentage NUMERIC(5,2);
BEGIN
  -- Get first day of month
  v_month := date_trunc('month', NEW.date)::DATE;
  
  -- Count total attendance records for this student in this month
  SELECT COUNT(*) INTO v_total_days
  FROM attendance
  WHERE student_id = NEW.student_id
    AND class_id = NEW.class_id
    AND date >= v_month
    AND date < (v_month + INTERVAL '1 month')::DATE;
  
  -- Count present days (Present or Late)
  SELECT COUNT(*) INTO v_present_days
  FROM attendance
  WHERE student_id = NEW.student_id
    AND class_id = NEW.class_id
    AND date >= v_month
    AND date < (v_month + INTERVAL '1 month')::DATE
    AND status IN ('Present', 'Late');
  
  -- Calculate percentage
  IF v_total_days > 0 THEN
    v_percentage := (v_present_days::NUMERIC / v_total_days::NUMERIC) * 100;
  ELSE
    v_percentage := 0;
  END IF;
  
  -- Insert or update summary
  INSERT INTO attendance_summary (student_id, class_id, month, total_days, present_days, percentage, updated_at)
  VALUES (NEW.student_id, NEW.class_id, v_month, v_total_days, v_present_days, v_percentage, now())
  ON CONFLICT (student_id, class_id, month) 
  DO UPDATE SET 
    total_days = v_total_days,
    present_days = v_present_days,
    percentage = v_percentage,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update attendance summary
DROP TRIGGER IF EXISTS update_attendance_summary_trigger ON public.attendance;
CREATE TRIGGER update_attendance_summary_trigger
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_attendance_summary();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_summary_student ON public.attendance_summary(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_month ON public.attendance_summary(month DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);