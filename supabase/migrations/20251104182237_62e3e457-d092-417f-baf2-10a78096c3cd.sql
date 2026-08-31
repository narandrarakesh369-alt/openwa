-- Drop existing teacher update policy
DROP POLICY IF EXISTS "Teachers can update attendance for their classes" ON attendance;

-- Create new policy: Teachers can only insert, not update
-- School admins can update attendance
CREATE POLICY "School admins can update attendance" 
ON attendance 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'school_admin') AND 
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = attendance.class_id 
    AND classes.school_id = get_user_school_id(auth.uid())
  )
);