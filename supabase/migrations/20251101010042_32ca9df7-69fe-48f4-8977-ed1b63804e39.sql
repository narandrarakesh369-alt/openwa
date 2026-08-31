-- Fix RLS policy for profiles table to not expose phone numbers unnecessarily
DROP POLICY IF EXISTS "School admins can view profiles in their school" ON public.profiles;

CREATE POLICY "School admins can view basic profiles in their school"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::user_role) 
  AND school_id = get_user_school_id(auth.uid())
  AND (
    id = auth.uid() -- Can see full own profile
    OR phone IS NULL -- Can see profiles without phone (basic info only)
  )
);

-- Fix attendance RLS policy to restrict teachers to only their classes
DROP POLICY IF EXISTS "Teachers can view and mark attendance" ON public.attendance;

CREATE POLICY "Teachers can view attendance for their classes"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::user_role)
  AND EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can mark attendance for their classes"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::user_role)
  AND EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
  AND marked_by = auth.uid()
);

CREATE POLICY "Teachers can update attendance for their classes"
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::user_role)
  AND EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Add database constraints for data integrity
ALTER TABLE public.fees
ADD CONSTRAINT fees_amount_positive CHECK (amount > 0),
ADD CONSTRAINT fees_paid_amount_non_negative CHECK (paid_amount >= 0),
ADD CONSTRAINT fees_paid_not_exceed_amount CHECK (paid_amount <= amount);

ALTER TABLE public.grades
ADD CONSTRAINT grades_marks_non_negative CHECK (marks_obtained >= 0),
ADD CONSTRAINT grades_total_marks_positive CHECK (total_marks > 0),
ADD CONSTRAINT grades_marks_not_exceed_total CHECK (marks_obtained <= total_marks);