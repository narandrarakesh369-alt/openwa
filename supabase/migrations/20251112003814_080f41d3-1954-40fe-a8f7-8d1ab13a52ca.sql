-- Add DELETE policy for super admins on schools table
CREATE POLICY "Super admins can delete schools"
ON public.schools
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- Add cascading deletes for school-related data
-- First, update foreign key constraints to cascade deletes

-- Update user_roles foreign key
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_school_id_fkey,
ADD CONSTRAINT user_roles_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update profiles foreign key
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_school_id_fkey,
ADD CONSTRAINT profiles_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE SET NULL;

-- Update classes foreign key
ALTER TABLE public.classes
DROP CONSTRAINT IF EXISTS classes_school_id_fkey,
ADD CONSTRAINT classes_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update students foreign key
ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_school_id_fkey,
ADD CONSTRAINT students_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update staff foreign key
ALTER TABLE public.staff
DROP CONSTRAINT IF EXISTS staff_school_id_fkey,
ADD CONSTRAINT staff_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update enrollments foreign key
ALTER TABLE public.enrollments
DROP CONSTRAINT IF EXISTS enrollments_school_id_fkey,
ADD CONSTRAINT enrollments_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update fee_payments foreign key
ALTER TABLE public.fee_payments
DROP CONSTRAINT IF EXISTS fee_payments_school_id_fkey,
ADD CONSTRAINT fee_payments_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update subjects foreign key
ALTER TABLE public.subjects
DROP CONSTRAINT IF EXISTS subjects_school_id_fkey,
ADD CONSTRAINT subjects_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update exams foreign key
ALTER TABLE public.exams
DROP CONSTRAINT IF EXISTS exams_school_id_fkey,
ADD CONSTRAINT exams_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update fee_structures foreign key
ALTER TABLE public.fee_structures
DROP CONSTRAINT IF EXISTS fee_structures_school_id_fkey,
ADD CONSTRAINT fee_structures_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update salary_structure foreign key
ALTER TABLE public.salary_structure
DROP CONSTRAINT IF EXISTS salary_structure_school_id_fkey,
ADD CONSTRAINT salary_structure_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update school_subscriptions foreign key
ALTER TABLE public.school_subscriptions
DROP CONSTRAINT IF EXISTS school_subscriptions_school_id_fkey,
ADD CONSTRAINT school_subscriptions_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;

-- Update parent_payments foreign key
ALTER TABLE public.parent_payments
DROP CONSTRAINT IF EXISTS parent_payments_school_id_fkey,
ADD CONSTRAINT parent_payments_school_id_fkey 
  FOREIGN KEY (school_id) 
  REFERENCES public.schools(id) 
  ON DELETE CASCADE;