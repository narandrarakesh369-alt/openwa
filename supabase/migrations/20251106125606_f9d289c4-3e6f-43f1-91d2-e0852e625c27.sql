-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  blood_group TEXT,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  father_name TEXT NOT NULL,
  father_phone TEXT NOT NULL,
  father_occupation TEXT,
  mother_name TEXT,
  mother_phone TEXT,
  mother_occupation TEXT,
  previous_school TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, admission_number)
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  blood_group TEXT,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  qualification TEXT NOT NULL,
  experience_years INTEGER,
  specialization TEXT,
  designation TEXT NOT NULL,
  department TEXT,
  salary NUMERIC,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, employee_id)
);

-- Create enrollments table for class enrollment
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id, academic_year)
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students table
CREATE POLICY "School admins can view students in their school"
  ON public.students
  FOR SELECT
  USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "School admins can insert students"
  ON public.students
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "School admins can update students in their school"
  ON public.students
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "Students can view their own record"
  ON public.students
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view students in their school"
  ON public.students
  FOR SELECT
  USING (
    has_role(auth.uid(), 'teacher'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

-- RLS Policies for teachers table
CREATE POLICY "School admins can view teachers in their school"
  ON public.teachers
  FOR SELECT
  USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "School admins can insert teachers"
  ON public.teachers
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "School admins can update teachers in their school"
  ON public.teachers
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "Teachers can view their own record"
  ON public.teachers
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for enrollments table
CREATE POLICY "School admins can manage enrollments"
  ON public.enrollments
  FOR ALL
  USING (
    has_role(auth.uid(), 'school_admin'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

CREATE POLICY "Students can view their enrollments"
  ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view enrollments in their school"
  ON public.enrollments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'teacher'::user_role) AND
    school_id = get_user_school_id(auth.uid())
  );

-- Create updated_at triggers
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();